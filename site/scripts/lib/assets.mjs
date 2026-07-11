// Static asset copying: theme/JS, webmanifest + sw.js injection, images, vendor (katex/d3/fonts).

import fs from "node:fs";
import path from "node:path";
import { execFileSync as defaultExecFileSync } from "node:child_process";
import { SITE, DIST, BASE, BUILD_DATE, PAPERS_DIR } from "./config.mjs";
import { ROOT } from "./config.mjs";
import { loadCanonicalContentCommit } from "./data-api.mjs";
import { DATA_API_CONTRACT } from "./provenance-schema.mjs";
import {
  CSP_STYLE_ATTRIBUTE_BUDGET,
  createCspReportOnlyManifest,
} from "./csp.mjs";

const SERVICE_WORKER_SENTINELS = Object.freeze({
  BUILD_ID: "__EAI_BUILD_ID__",
  DATA_SCHEMA_VERSION: "__EAI_DATA_SCHEMA_VERSION__",
  CONTENT_COMMIT: "__EAI_CONTENT_COMMIT__",
});
const BUILD_ID_RE = /^\d{14}-[0-9a-f]{12}$/;
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const CONTENT_COMMIT_RE = /^[0-9a-f]{40}$/;
const SITE_COMMIT_RE = /^[0-9a-f]{40}$/;
const ANY_SERVICE_WORKER_SENTINEL_RE = /__EAI_[A-Z0-9_]+__/g;

// --- helpers ----------------------------------------------------------------
export function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

export function copy(src, dst) {
  if (!fs.existsSync(src)) return;
  ensure(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

export function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  ensure(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; }

export function write(p, content) { ensure(path.dirname(p)); fs.writeFileSync(p, content); }

export function loadSiteCommit({
  executor = defaultExecFileSync,
  cwd = ROOT,
  environment = process.env,
} = {}) {
  const env = Object.fromEntries(
    Object.entries(environment).filter(([name]) => !name.startsWith("GIT_")),
  );
  Object.assign(env, {
    GIT_TRACE2: "0",
    GIT_TRACE2_EVENT: "0",
    GIT_TRACE2_PERF: "0",
  });
  const options = {
    cwd,
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  };
  let topLevel;
  let output;
  try {
    topLevel = executor("git", ["rev-parse", "--show-toplevel"], options);
    output = executor("git", ["rev-parse", "HEAD"], options);
  } catch {
    throw new Error("site commit must be readable with git rev-parse HEAD");
  }
  if (path.resolve(String(topLevel).trim()) !== path.resolve(cwd)) {
    throw new Error("site commit must come from the project repository root");
  }
  const commit = String(output).trim();
  if (!SITE_COMMIT_RE.test(commit)) {
    throw new Error("site commit must be 40 lowercase hexadecimal characters");
  }
  return commit;
}

export function formatServiceWorkerBuildId(buildDate, siteCommit = loadSiteCommit()) {
  if (!(buildDate instanceof Date) || Number.isNaN(buildDate.getTime())) {
    throw new TypeError("service worker build date must be a valid Date");
  }
  if (!SITE_COMMIT_RE.test(siteCommit ?? "")) {
    throw new Error("service worker site commit must be 40 lowercase hexadecimal characters");
  }
  // Deterministic site-build identity: UTC second keeps chronological readability while
  // the HEAD prefix prevents different commits built in the same second from colliding.
  const utcSecond = buildDate.toISOString().slice(0, 19).replace(/\D/g, "");
  return `${utcSecond}-${siteCommit.slice(0, 12)}`;
}

export function renderServiceWorker(source, {
  buildId,
  schemaVersion,
  contentCommit,
} = {}) {
  if (typeof source !== "string") {
    throw new TypeError("service worker source must be a string");
  }
  if (!BUILD_ID_RE.test(buildId ?? "")) {
    throw new Error("service worker buildId must be 14 UTC digits plus a 12-character lowercase commit prefix");
  }
  if (!SEMVER_RE.test(schemaVersion ?? "")) {
    throw new Error("service worker schemaVersion must be valid semver");
  }
  if (!CONTENT_COMMIT_RE.test(contentCommit ?? "")) {
    throw new Error("service worker contentCommit must be 40 lowercase hexadecimal characters");
  }

  const replacements = {
    BUILD_ID: buildId,
    DATA_SCHEMA_VERSION: schemaVersion,
    CONTENT_COMMIT: contentCommit,
  };
  const lines = source.split("\n");
  let firstCodeLine = 0;
  while (
    firstCodeLine < lines.length
    && (lines[firstCodeLine].trim() === "" || lines[firstCodeLine].trimStart().startsWith("//"))
  ) {
    firstCodeLine += 1;
  }
  const invalid = Object.entries(SERVICE_WORKER_SENTINELS)
    .filter(([name, sentinel], offset) => (
      lines[firstCodeLine + offset] !== `const ${name} = "${sentinel}";`
    ))
    .map(([, sentinel]) => sentinel);
  if (invalid.length > 0) {
    throw new Error(`service worker source requires one exact sentinel declaration for: ${invalid.join(", ")}`);
  }

  let rendered = source;
  for (const [name, value] of Object.entries(replacements)) {
    const sentinel = SERVICE_WORKER_SENTINELS[name];
    rendered = rendered.replace(
      `const ${name} = "${sentinel}";`,
      `const ${name} = ${JSON.stringify(value)};`,
    );
  }
  const unresolved = [...new Set(rendered.match(ANY_SERVICE_WORKER_SENTINEL_RE) ?? [])];
  if (unresolved.length > 0) {
    throw new Error(`service worker source has unreplaced sentinel(s): ${unresolved.join(", ")}`);
  }
  return rendered;
}

function vendorFonts() {
  // [包名, 需要的 css 文件, Fontsource 内的 family 名 → 站点字体栈用的名字]
  // variable 包的 family 带 "Variable" 后缀，改写回 theme.css/tokens.css 里的裸名
  const FONT_SOURCES = [
    ["@fontsource-variable/inter", ["index.css", "wght-italic.css"], ["Inter Variable", "Inter"]],
    ["@fontsource-variable/playfair-display", ["index.css", "wght-italic.css"], ["Playfair Display Variable", "Playfair Display"]],
    ["@fontsource/jetbrains-mono", ["latin-400.css", "latin-500.css"], null],
  ];
  let out = "/* self-hosted web fonts — generated by build.mjs from Fontsource packages (latin subset only) */\n\n";
  for (const [pkg, cssFiles, rename] of FONT_SOURCES) {
    const pkgDir = path.join(SITE, "node_modules", pkg);
    for (const f of cssFiles) {
      const css = fs.readFileSync(path.join(pkgDir, f), "utf8");
      const blocks = (css.match(/\/\*[^*]*\*\/\s*@font-face\s*\{[^}]*\}/g) ?? [])
        .filter(b => b.includes("-latin-") && !b.includes("-latin-ext-"));
      let faces = blocks.join("\n\n");
      // 静态字重包附带 woff 回退；woff2 已是全浏览器基线，去掉省体积
      faces = faces.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, "");
      if (rename) faces = faces.replaceAll(`'${rename[0]}'`, `'${rename[1]}'`);
      out += faces + "\n\n";
      for (const m of faces.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)/g)) {
        copy(path.join(pkgDir, "files", m[1]), path.join(DIST, "vendor", "fonts", "files", m[1]));
      }
    }
  }
  ensure(path.join(DIST, "vendor", "fonts"));
  fs.writeFileSync(path.join(DIST, "vendor", "fonts", "fonts.css"), out);
}

// 静态资源与 vendor 复制段（build() 的 wipe dist 之后、load notes 之前）
export function copyStatic() {
  // theme + JS
  copy(path.join(SITE, "src", "theme.css"), path.join(DIST, "styles.css"));
  copy(path.join(SITE, "src", "search.js"), path.join(DIST, "search.js"));
  copy(path.join(SITE, "src", "outline.js"), path.join(DIST, "outline.js"));
  copy(path.join(SITE, "src", "data-api.js"), path.join(DIST, "data-api.js"));
  copy(path.join(SITE, "src", "reading-progress.js"), path.join(DIST, "reading-progress.js"));
  copy(path.join(SITE, "src", "quick-filter.js"), path.join(DIST, "quick-filter.js"));
  copy(path.join(SITE, "src", "graph.js"), path.join(DIST, "graph.js"));
  copy(path.join(SITE, "src", "keyboard.js"), path.join(DIST, "keyboard.js"));
  copy(path.join(SITE, "src", "theme-toggle.js"), path.join(DIST, "theme-toggle.js"));
  copy(path.join(SITE, "src", "page-behaviors.js"), path.join(DIST, "page-behaviors.js"));
  copy(path.join(SITE, "src", "math-render.js"), path.join(DIST, "math-render.js"));
  copy(path.join(SITE, "src", "favicon.svg"), path.join(DIST, "favicon.svg"));
  copy(path.join(SITE, "src", "link-preview.js"), path.join(DIST, "link-preview.js"));
  copy(path.join(SITE, "src", "svg-export.js"), path.join(DIST, "svg-export.js"));
  write(
    path.join(DIST, "csp-report-only.json"),
    `${JSON.stringify(createCspReportOnlyManifest({
      styleBudget: CSP_STYLE_ATTRIBUTE_BUDGET,
      base: BASE,
    }), null, 2)}\n`,
  );
  // site.webmanifest: 按部署 BASE 注入 start_url 等路径
  {
    const manifest = fs.readFileSync(path.join(SITE, "src", "site.webmanifest"), "utf8")
      .replaceAll("__BASE__", BASE || "");
    write(path.join(DIST, "site.webmanifest"), manifest);
  }
  // sw.js: 注入构建、Data API schema 与 canonical content snapshot 身份。
  {
    const swSrc = fs.readFileSync(path.join(SITE, "src", "sw.js"), "utf8");
    const siteCommit = loadSiteCommit();
    const swOut = renderServiceWorker(swSrc, {
      buildId: formatServiceWorkerBuildId(BUILD_DATE, siteCommit),
      schemaVersion: DATA_API_CONTRACT.schema_version,
      contentCommit: loadCanonicalContentCommit(),
    });
    write(path.join(DIST, "sw.js"), swOut);
  }
  copy(path.join(SITE, "src", "sw-register.js"), path.join(DIST, "sw-register.js"));

  // images（codex 生成 + cwebp 转换）
  const IMG_SRC = path.join(SITE, "src", "images");
  if (fs.existsSync(IMG_SRC)) {
    copyDir(IMG_SRC, path.join(DIST, "images"));
  }

  // Jason DS (jx tokens + components)
  copyDir(path.join(SITE, "src", "jx"), path.join(DIST, "jx"));

  // vendor：KaTeX + D3 自托管（从 node_modules 复制，摆脱运行时 CDN 依赖）
  // 注意：katex.min.css 内用相对路径 fonts/ 引字体，css 与 fonts/ 必须保持同级
  const KATEX_SRC = path.join(SITE, "node_modules", "katex", "dist");
  copyDir(path.join(KATEX_SRC, "fonts"), path.join(DIST, "vendor", "katex", "fonts"));
  for (const f of ["katex.min.css", "katex.min.js", "contrib/auto-render.min.js"]) {
    copy(path.join(KATEX_SRC, f), path.join(DIST, "vendor", "katex", f));
  }
  copy(path.join(SITE, "node_modules", "d3", "dist", "d3.min.js"), path.join(DIST, "vendor", "d3.min.js"));

  // vendor：web 字体自托管（Fontsource，替代 rsms.me / Google Fonts CDN）
  // 只取 latin subset（本站拉丁文本为主，中文走 PingFang/YaHei 系统字体栈）；
  // 生成合并的 fonts.css，@font-face 内相对路径 ./files/ 与复制后的目录结构保持一致
  vendorFonts();
}

// 论文页内嵌图（papers/<slug>/images → dist/assets/<slug>/）
export function copyAssets(papers) {
  for (const p of papers) {
    const imgSrc = path.join(PAPERS_DIR, p.slug, "images");
    const imgDst = path.join(DIST, "assets", p.slug);
    if (fs.existsSync(imgSrc)) copyDir(imgSrc, imgDst);
  }
}
