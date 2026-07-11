#!/usr/bin/env node
// Build healthcheck — 验证 dist/ 关键页 + frontmatter 完整性
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { TASK_SLUGS } from "./constants.mjs";
import { loadCanonicalContentCommit } from "./lib/data-api.mjs";
import {
  formatServiceWorkerBuildId,
  loadSiteCommit,
} from "./lib/assets.mjs";
import { BUILD_DATE, GENERATED_AT } from "./lib/config.mjs";
import { countWords } from "./lib/markdown.mjs";
import { SITE_URL } from "./lib/config.mjs";
import { DATA_API_CONTRACT } from "./lib/provenance-schema.mjs";
import {
  CSP_PRODUCTION_STATUS,
  CSP_REPORT_ONLY_HEADER_NAME,
  CSP_STYLE_ATTRIBUTE_BUDGET,
  assertHtmlSecurity,
  createCspReportOnlyManifest,
  digestStyleValues,
  scanCssResourcePolicy,
  scanHtmlResourcePolicy,
  scanHtmlSecurity,
  scanRuntimeStyleSinks,
} from "./lib/csp.mjs";
import {
  evaluateRouteImageBudget,
  measureRouteImageBudget,
  normalizeRouteHtmlForBase,
} from "./lib/route-budget.mjs";
import {
  formatProvenanceRepositoryErrors,
  validateProvenanceRepositoryFile,
} from "./lib/provenance-validator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const ROOT = path.resolve(SITE, "..");
const DIST = path.join(SITE, "dist");
const NOTES = path.join(ROOT, "notes");
const REQUIRED_CORE_SHELL_URLS = Object.freeze([
  "./",
  "./styles.css",
  "./jx/tokens.css",
  "./jx/components.css",
  "./pagefind/pagefind-ui.css",
  "./pagefind/pagefind-ui.js",
  "./search.js",
  "./outline.js",
  "./data-api.js",
  "./reading-progress.js",
  "./quick-filter.js",
  "./keyboard.js",
  "./theme-toggle.js",
  "./page-behaviors.js",
  "./math-render.js",
  "./deck/deck.css",
  "./deck/deck.js",
  "./link-preview.js",
  "./sw-register.js",
  "./svg-export.js",
  "./favicon.svg",
  "./site.webmanifest",
]);

let pass = 0, fail = 0;
function check(name, fn) {
  try {
    const r = fn();
    if (r === true || r === undefined) {
      console.log(`  ✓ ${name}`);
      pass++;
    } else {
      console.log(`  ✗ ${name}: ${r}`);
      fail++;
    }
  } catch (e) {
    console.log(`  ✗ ${name}: ${e.message}`);
    fail++;
  }
}

function readWorkerStringConstant(source, name) {
  const matches = [...source.matchAll(new RegExp(`^const\\s+${name}\\s*=\\s*"([^"]*)"\\s*;$`, "gm"))];
  if (matches.length > 1) throw new Error(`${name} must have one exact declaration`);
  return matches.length === 1 ? matches[0][1] : null;
}

function readWorkerTemplateConstant(source, name) {
  const matches = [...source.matchAll(new RegExp(`^const\\s+${name}\\s*=\\s*\\x60([^\\x60]*)\\x60\\s*;$`, "gm"))];
  if (matches.length > 1) throw new Error(`${name} must have one exact declaration`);
  return matches.length === 1 ? matches[0][1] : null;
}

function parseWorkerShellUrls(source) {
  const match = source.match(/\bconst\s+SHELL_URLS\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!match) throw new Error("SHELL_URLS array missing");
  const withoutComments = match[1]
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/,\s*$/, "");
  let urls;
  try {
    urls = JSON.parse(`[${withoutComments}]`);
  } catch {
    throw new Error("SHELL_URLS must contain only static JSON string entries");
  }
  if (!Array.isArray(urls) || urls.length === 0 || urls.some(value => typeof value !== "string")) {
    throw new Error("SHELL_URLS must be a non-empty string array");
  }
  if (new Set(urls).size !== urls.length) {
    throw new Error("SHELL_URLS must not contain duplicate entries");
  }
  return urls;
}

function shellUrlToDistPath(value) {
  if (value === "./") return "index.html";
  if (!value.startsWith("./") || value.includes("?") || value.includes("#")) {
    throw new Error(`invalid shell URL: ${value}`);
  }
  const relative = value.slice(2);
  if (!relative || path.posix.normalize(relative) !== relative || relative.startsWith("../")) {
    throw new Error(`unsafe shell URL: ${value}`);
  }
  return relative.endsWith("/") ? `${relative}index.html` : relative;
}

// Provenance 必须先于任何 notes/ 读取执行。通过后才动态加载 aggregates；该模块会在
// import 时发现并读取全部笔记，不能让 symlink/坏路径绕过独立门禁。
console.log("\n=== Source path integrity ===");
const provenance = validateProvenanceRepositoryFile({ root: ROOT, expectedNoteCount: 156 });
if (!provenance.ok) {
  const rendered = formatProvenanceRepositoryErrors(provenance.errors);
  console.log(rendered.split("\n").map((line) => `  ✗ ${line}`).join("\n"));
}
const phaseResult = (phase) => provenance.phases[phase].ok
  || `${provenance.phases[phase].errors.length} provenance validation error(s)`;
check("papers/provenance.json exact schema v2", () => phaseResult("schema"));
check("当前 note/source/asset 与 manifest 一致", () => phaseResult("current"));
check("content_commit snapshot 三方字节一致", () => phaseResult("snapshot"));
if (!provenance.ok) {
  console.log("\n=== Summary ===");
  console.log(`  ${pass} passed, ${fail} failed`);
  process.exit(1);
}

const { SYLLABUS_WEEKS } = await import("./lib/views/aggregates.mjs");

console.log("\n=== Static pages ===");
const requiredPages = [
  "index.html",
  "papers/index.html",
  "topics/index.html",
  "compare/index.html",
  "timeline/index.html",
  "graph/index.html",
  "tags/index.html",
  "heatmap/index.html",
  "venues/index.html",
  "stats/index.html",
  "glossary/index.html",
  "lists/index.html",
  "issues/index.html",
  "about/index.html",
  "404.html",
  "sitemap.xml",
  "robots.txt",
  "feed.xml",
  "llms.txt",
  "favicon.svg",
  "site.webmanifest",
  "data-api.js",
  "data/papers.json",
  "data/v2/papers.json",
  "data/v2/index.json",
  "data/tags.json",
  "data/topics.json",
  "data/index.json",
  "csp-report-only.json",
];
for (const p of requiredPages) {
  check(p, () => fs.existsSync(path.join(DIST, p)) || `missing: ${p}`);
}
const builtIndexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const builtBaseMatch = builtIndexHtml.match(/href="([^"]*)\/styles\.css"/);
const builtBase = builtBaseMatch ? builtBaseMatch[1] : "";

console.log("\n=== Topics ===");
const topicsJson = JSON.parse(fs.readFileSync(path.join(NOTES, "topics.json"), "utf8")).topics;
for (const t of topicsJson) {
  check(`/topics/${t.id}/`, () => fs.existsSync(path.join(DIST, "topics", t.id, "index.html")) || `missing topic page: ${t.id}`);
}

console.log("\n=== Era pages ===");
for (const e of ["founder", "classic", "frontier"]) {
  check(`/eras/${e}/`, () => fs.existsSync(path.join(DIST, "eras", e, "index.html")) || `missing era: ${e}`);
}

console.log("\n=== Notes frontmatter ===");
const noteFiles = fs.readdirSync(NOTES).filter(f => f.endsWith(".md"));
const slugs = new Set();
let titleMissing = 0, topicMissing = 0, numMissing = 0, dupes = 0;
for (const f of noteFiles) {
  const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
  const { data } = matter(raw);
  if (!data.title) titleMissing++;
  if (!data.topic) topicMissing++;
  if (!data.num) numMissing++;
  const s = f.replace(/\.md$/, "");
  if (slugs.has(s)) dupes++;
  slugs.add(s);
}
check(`${noteFiles.length} 篇笔记加载`, () => true);
check("无重复 slug", () => dupes === 0 || `${dupes} 篇 slug 冲突`);
check("title 字段全部有", () => titleMissing === 0 || `${titleMissing} 篇缺 title`);
check("topic 字段全部有", () => topicMissing === 0 || `${topicMissing} 篇缺 topic`);
check("num 字段全部有", () => numMissing === 0 || `${numMissing} 篇缺 num`);

console.log("\n=== Paper pages ===");
let paperMissing = 0;
for (const f of noteFiles) {
  const slug = f.replace(/\.md$/, "");
  if (!fs.existsSync(path.join(DIST, "papers", slug, "index.html"))) paperMissing++;
}
check(`${noteFiles.length} 篇都有 paper page`, () => paperMissing === 0 || `${paperMissing} 篇缺 paper page`);

console.log("\n=== Data API ===");
const papersJson = JSON.parse(fs.readFileSync(path.join(DIST, "data", "papers.json"), "utf8"));
const legacyIndex = JSON.parse(fs.readFileSync(path.join(DIST, "data", "index.json"), "utf8"));
const papersV2 = JSON.parse(fs.readFileSync(path.join(DIST, "data", "v2", "papers.json"), "utf8"));
const indexV2 = JSON.parse(fs.readFileSync(path.join(DIST, "data", "v2", "index.json"), "utf8"));
const canonicalContentCommit = loadCanonicalContentCommit();
const exactKeys = (value, expected) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && JSON.stringify(Object.keys(value)) === JSON.stringify(expected)
);

check("papers.json 数量等于 notes 数量", () => papersJson.length === noteFiles.length || `${papersJson.length} vs ${noteFiles.length}`);
check("papers.json 每条有 slug+title+url", () => {
  const bad = papersJson.find(p => !p.slug || !p.title || !p.url);
  return !bad || `bad entry: ${JSON.stringify(bad).slice(0, 60)}`;
});
check("v2 papers/index 使用精确 2.0.0 envelope", () => {
  if (!exactKeys(papersV2, DATA_API_CONTRACT.envelope_fields)) return "papers envelope fields drift";
  if (!exactKeys(indexV2, DATA_API_CONTRACT.envelope_fields)) return "index envelope fields drift";
  if (papersV2.schema_version !== DATA_API_CONTRACT.schema_version) return "papers schema drift";
  if (indexV2.schema_version !== DATA_API_CONTRACT.schema_version) return "index schema drift";
  return true;
});
check("v2 papers/index content_commit 与 canonical provenance 一致", () => {
  if (!/^[0-9a-f]{40}$/.test(papersV2.content_commit ?? "")) return "papers content_commit invalid";
  if (papersV2.content_commit !== indexV2.content_commit) return "v2 content_commit mismatch";
  if (papersV2.content_commit !== canonicalContentCommit) return "canonical content_commit mismatch";
  return true;
});
check("v2 papers/index generated_at 是同一确定性构建时间", () => {
  if (papersV2.generated_at !== indexV2.generated_at) return "generated_at mismatch";
  const parsed = new Date(papersV2.generated_at);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== papersV2.generated_at) return "generated_at invalid";
  if (process.env.SOURCE_DATE_EPOCH !== undefined && papersV2.generated_at !== GENERATED_AT) {
    return `generated_at 未使用当前 SOURCE_DATE_EPOCH: ${papersV2.generated_at}`;
  }
  return true;
});
check("legacy 数组与 v2 data 的 18 字段逐条一致", () => {
  if (!Array.isArray(papersV2.data)) return "v2 data is not an array";
  if (papersV2.data.length !== noteFiles.length) return `${papersV2.data.length} vs ${noteFiles.length}`;
  const fields = JSON.stringify(DATA_API_CONTRACT.paper_record_fields);
  const driftedFields = papersV2.data.find(record => JSON.stringify(Object.keys(record)) !== fields);
  if (driftedFields) return `paper field drift: ${driftedFields.slug ?? "unknown"}`;
  return JSON.stringify(papersV2.data) === JSON.stringify(papersJson) || "legacy/v2 paper projection drift";
});
check("v2 index endpoint 与兼容窗口精确匹配", () => {
  if (!exactKeys(indexV2.data, DATA_API_CONTRACT.index_data_fields)) return "index data fields drift";
  if (!exactKeys(indexV2.data.deprecation, DATA_API_CONTRACT.deprecation_fields)) return "deprecation fields drift";
  if (indexV2.data.papers_endpoint !== builtBase + DATA_API_CONTRACT.versioned_papers_endpoint) return "papers endpoint base drift";
  if (indexV2.data.legacy_endpoint !== builtBase + DATA_API_CONTRACT.legacy_endpoint) return "legacy endpoint base drift";
  if (indexV2.data.deprecation.status !== "supported" || indexV2.data.deprecation.removal_version !== null) {
    return "legacy compatibility policy drift";
  }
  return true;
});
check("legacy data manifest 保留旧形状并发现 v2", () => {
  if (legacyIndex.content_commit !== canonicalContentCommit) return "legacy manifest content_commit drift";
  if (!legacyIndex.endpoints?.index_v2?.endsWith("/data/v2/index.json")) return "missing v2 index discovery";
  if (!legacyIndex.endpoints?.papers_v2?.endsWith("/data/v2/papers.json")) return "missing v2 papers discovery";
  if (!legacyIndex.endpoints?.papers?.endsWith("/data/papers.json")) return "missing legacy papers endpoint";
  return true;
});
check("三个站内消费者均不再直连 legacy papers endpoint", () => {
  for (const consumer of ["reading-progress.js", "link-preview.js", "404.html"]) {
    const source = fs.readFileSync(path.join(DIST, consumer), "utf8");
    if (/fetch\s*\([^)]*\/data\/papers\.json/s.test(source)) return `${consumer} still fetches legacy data`;
  }
  return true;
});
check("README 与 llms.txt 区分内容快照和构建时间", () => {
  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const llms = fs.readFileSync(path.join(DIST, "llms.txt"), "utf8");
  for (const document of [readme, llms]) {
    if (!document.includes("/data/v2/index.json") || !document.includes("/data/v2/papers.json")) return "missing v2 discovery docs";
    if (!document.includes("content_commit") || !document.includes("generated_at")) return "missing metadata semantics";
  }
  return true;
});

const tagsJson = JSON.parse(fs.readFileSync(path.join(DIST, "data", "tags.json"), "utf8"));
check("tags.json 有 frequency + cooccurrence", () => {
  if (!tagsJson.frequency || !tagsJson.cooccurrence) return "missing keys";
  return true;
});

// CSV / JSON 字段对齐
const csvPath = path.join(DIST, "data", "papers.csv");
if (fs.existsSync(csvPath)) {
  const csv = fs.readFileSync(csvPath, "utf8");
  const headerLine = csv.split("\n")[0];
  const csvCols = headerLine.split(",");
  const sampleJson = papersJson[0] || {};
  const jsonKeys = Object.keys(sampleJson);
  const missingFromCsv = jsonKeys.filter(k => !csvCols.includes(k));
  check("CSV 列与 JSON 字段对齐（差异 ≤ 0）", () => missingFromCsv.length === 0 || `CSV 缺: ${missingFromCsv.join(",")}`);
  check("CSV 行数 = JSON 数量", () => {
    const lines = csv.split("\n").filter(l => l.length > 0);
    return lines.length === papersJson.length + 1 || `${lines.length - 1} vs ${papersJson.length}`;
  });
}

// topicLabel drift between papers.json and topics.json (data API endpoint)
const topicsApiJson = JSON.parse(fs.readFileSync(path.join(DIST, "data", "topics.json"), "utf8"));
const topicLabelMap = new Map(topicsApiJson.map(t => [t.id, t.label]));
let drifted = 0;
for (const p of papersJson) {
  const expected = topicLabelMap.get(p.topic);
  if (expected && p.topicLabel !== expected) drifted++;
}
check("papers.json topicLabel 与 topics.json label 一致", () => drifted === 0 || `${drifted} 篇 drift`);

console.log("\n=== PWA / icons / manifest ===");
const pwaFiles = ["sw.js", "site.webmanifest", "favicon.svg"];
for (const f of pwaFiles) {
  check(`${f} 存在`, () => fs.existsSync(path.join(DIST, f)) || `missing`);
}
{
  const sw = fs.readFileSync(path.join(DIST, "sw.js"), "utf8");
  let expectedBuildId = null;
  try {
    expectedBuildId = formatServiceWorkerBuildId(
      process.env.SOURCE_DATE_EPOCH === undefined
        ? new Date(String(papersV2.generated_at ?? ""))
        : BUILD_DATE,
      loadSiteCommit(),
    );
  } catch {
    // The checks below report the invalid/missing build identity without aborting
    // the remainder of the healthcheck.
  }
  const workerBuildId = readWorkerStringConstant(sw, "BUILD_ID");
  const workerSchemaVersion = readWorkerStringConstant(sw, "DATA_SCHEMA_VERSION");
  const workerContentCommit = readWorkerStringConstant(sw, "CONTENT_COMMIT");

  check("sw.js 注入精确 build/schema/content 常量", () => {
    if (!expectedBuildId) return "v2 generated_at 无法生成 build id";
    if (workerBuildId !== expectedBuildId) return `BUILD_ID drift: ${workerBuildId ?? "missing"}`;
    if (workerSchemaVersion !== DATA_API_CONTRACT.schema_version) {
      return `DATA_SCHEMA_VERSION drift: ${workerSchemaVersion ?? "missing"}`;
    }
    if (workerContentCommit !== canonicalContentCommit) {
      return `CONTENT_COMMIT drift: ${workerContentCommit ?? "missing"}`;
    }
    return true;
  });
  check("sw.js 不含未替换 build sentinel", () => {
    const unresolved = [...new Set(sw.match(/__EAI_[A-Z0-9_]+__/g) ?? [])];
    return unresolved.length === 0 || `unresolved: ${unresolved.join(", ")}`;
  });
  check("data cache namespace 绑定 scope + build + schema major + content commit", () => {
    if (!expectedBuildId) return "v2 generated_at 无法生成 build id";
    if (!/\bconst\s+DATA_SCHEMA_MAJOR\s*=\s*DATA_SCHEMA_VERSION\.split\(["']\.["']\)\[0\]\s*;/.test(sw)) {
      return "DATA_SCHEMA_MAJOR 未从 DATA_SCHEMA_VERSION 派生";
    }
    const prefixTemplate = readWorkerTemplateConstant(sw, "CACHE_PREFIX");
    if (prefixTemplate !== "eai-${encodeURIComponent(SCOPE_PATH)}-") {
      return `CACHE_PREFIX drift: ${prefixTemplate ?? "missing"}`;
    }
    const template = readWorkerTemplateConstant(sw, "DATA_CACHE");
    if (template === null) return "DATA_CACHE template missing";
    const expected = "${CACHE_PREFIX}data-${BUILD_ID}-v${DATA_SCHEMA_MAJOR}-${CONTENT_COMMIT}";
    return template === expected || `DATA_CACHE drift: ${template}`;
  });
  check("SHELL_URLS 保留固定核心预缓存集合", () => {
    const urls = new Set(parseWorkerShellUrls(sw));
    const missing = REQUIRED_CORE_SHELL_URLS.filter(value => !urls.has(value));
    return missing.length === 0 || `missing core entries: ${missing.join(", ")}`;
  });
  check("SHELL_URLS 核心预缓存文件全部存在", () => {
    const urls = parseWorkerShellUrls(sw);
    const missing = [];
    for (const value of urls) {
      const relative = shellUrlToDistPath(value);
      const target = path.resolve(DIST, relative);
      if (!target.startsWith(`${DIST}${path.sep}`) || !fs.statSync(target, { throwIfNoEntry: false })?.isFile()) {
        missing.push(`${value} -> ${relative}`);
      }
    }
    return missing.length === 0 || `missing: ${missing.join(", ")}`;
  });
  const idx = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  check("data-api.js 在两个 v2 消费者之前加载", () => {
    const scriptPosition = name => idx.indexOf(`src="${builtBase}/${name}"`);
    const adapter = scriptPosition("data-api.js");
    const reading = scriptPosition("reading-progress.js");
    const preview = scriptPosition("link-preview.js");
    return adapter >= 0 && adapter < reading && adapter < preview || "script order invalid";
  });
  check("index.html 引用 sw-register.js", () => idx.includes("sw-register.js") || `无 sw-register`);
  check("index.html 含 theme-color", () => idx.includes('name="theme-color"') || `无 theme-color`);
  check("index.html 引用 manifest", () => idx.includes("site.webmanifest") || `无 manifest link`);
  check("index.html 引用 favicon.svg", () => idx.includes("favicon.svg") || `无 favicon link`);
  check("index.html 含 OpenSearch link", () => idx.includes("opensearch.xml") || `无 opensearch`);
  check("index.html 加载 Jason DS v2 base/tokens/components", () => (
    idx.includes("/jx/tokens.css") && idx.includes("/jx/base.css") && idx.includes("/jx/components.css")
  ) || "Jason DS stylesheets incomplete");
}

console.log("\n=== OG / Twitter meta ===");
const sample = [
  "index.html",
  "papers/clip/index.html",
  "topics/index.html",
  "issues/01/index.html",
  "stats/index.html",
];
let metaMissing = 0;
let metaMissingFiles = 0;
for (const p of sample) {
  const f = path.join(DIST, p);
  if (!fs.existsSync(f)) {
    metaMissingFiles++;
    console.log(`  ✗ sample missing: ${p}`);
    continue;
  }
  const html = fs.readFileSync(f, "utf8");
  const need = [`property="og:title"`, `property="og:description"`, `property="og:image"`, `name="twitter:card"`, `rel="canonical"`];
  for (const k of need) {
    if (!html.includes(k)) { metaMissing++; console.log(`  ✗ ${p} missing ${k}`); }
  }
}
check(`5 sample pages 全有 OG/Twitter/canonical meta`, () => (metaMissing === 0 && metaMissingFiles === 0) || `${metaMissing} 缺失 + ${metaMissingFiles} 文件不存在`);

console.log("\n=== Public showcase contract ===");
{
  const home = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const papers = fs.readFileSync(path.join(DIST, "papers", "index.html"), "utf8");
  const glossary = fs.readFileSync(path.join(DIST, "glossary", "index.html"), "utf8");
  const deck = fs.readFileSync(path.join(DIST, "deck", "index.html"), "utf8");
  const feed = fs.readFileSync(path.join(DIST, "feed.xml"), "utf8");
  const notFound = fs.readFileSync(path.join(DIST, "404.html"), "utf8");
  const hubOrigin = new URL(SITE_URL).origin;

  check("首页包含三步学习旅程与三件代表成果", () => (
    ["选路径", "做对比", "形成简报"].every((label) => home.includes(label))
    && (home.match(/jx-proof-rail__label/g) || []).length === 3
    && home.includes("/papers/")
  ) || "learning journey or representative outcomes incomplete");
  check("首页含 owner-led 英文摘要与可审计质量边界", () => (
    home.includes("An owner-led, independently maintained learning product")
    && home.includes("结构门禁不等于逐页人工复核")
    && home.includes("46 篇保留本地解析文本与 SHA-256 清单")
    && home.includes("110 篇引用 HTTPS 原文")
  ) || "English summary or limitations missing");
  check("首页不渲染全量论文墙，独立 Papers 页保留完整筛选库", () => (
    !home.includes('<article class="paper-card"')
    && !home.includes('id="eai-quick-filter"')
    && (papers.match(/<article class="paper-card"/g) || []).length === noteFiles.length
    && papers.includes('id="eai-quick-filter"')
    && papers.includes('id="paper-library"')
  ) || "home/library separation incomplete");
  check("全站 chrome 暴露 Hub/About/Résumé/GitHub", () => (
    home.includes(`href="${hubOrigin}/"`)
    && home.includes(`href="${hubOrigin}/about/"`)
    && home.includes(`href="${hubOrigin}/resume/"`)
    && home.includes("https://github.com/estelledc/embodied-ai-reading-station")
  ) || "portfolio navigation incomplete");
  const portfolioDestinations = [
    `${hubOrigin}/`,
    `${hubOrigin}/about/`,
    `${hubOrigin}/resume/`,
    "https://github.com/estelledc/embodied-ai-reading-station",
  ];
  for (const [label, html] of [["Glossary", glossary], ["Deck", deck]]) {
    check(`${label} 暴露一致的 Hub/About/Résumé/GitHub 出口`, () => (
      portfolioDestinations.every((destination) => html.includes(`href="${destination}"`))
    ) || `${label} portfolio navigation incomplete`);
  }
  check("首页 JSON-LD 标识 Person/WebSite/LearningResource", () => (
    home.includes('"@type":"Person"')
    && home.includes('"@type":"WebSite"')
    && home.includes('"@type":"LearningResource"')
  ) || "homepage structured data incomplete");
  check("Atom feed 使用规范作者名", () => (
    feed.includes("<author><name>Jason Xun</name></author>")
    && !feed.includes("<author><name>Jason</name></author>")
  ) || "Atom author identity is stale");

  const canonicalSamples = [
    ["index.html", "/"],
    ["papers/index.html", "/papers/"],
    ["topics/index.html", "/topics/"],
    ["topics/vlm-foundation/index.html", "/topics/vlm-foundation/"],
    ["guide/index.html", "/guide/"],
    ["guide/ch01-why-embodied-ai/index.html", "/guide/ch01-why-embodied-ai/"],
    ["learn/index.html", "/learn/"],
    ["learn/path/index.html", "/learn/path/"],
    ["issues/01/index.html", "/issues/01/"],
    ["papers/clip/index.html", "/papers/clip/"],
    ["about/index.html", "/about/"],
  ];
  const badCanonicals = [];
  for (const [file, route] of canonicalSamples) {
    const html = fs.readFileSync(path.join(DIST, file), "utf8");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
    const expected = `${SITE_URL}${route}`;
    if (canonical !== expected) badCanonicals.push(`${file}: ${canonical || "missing"} != ${expected}`);
  }
  check(`${canonicalSamples.length} 个代表页面 canonical 指向自身`, () => badCanonicals.length === 0 || badCanonicals.join("; "));
  check("404 为 noindex 且不输出 JSON-LD", () => (
    notFound.includes('<meta name="robots" content="noindex, nofollow">')
    && !notFound.includes("application/ld+json")
  ) || "404 indexing contract broken");
}

console.log("\n=== Issue plate count consistency ===");
{
  const issueDir = path.join(DIST, "issues");
  if (fs.existsSync(issueDir)) {
    let bad = 0;
    for (const d of fs.readdirSync(issueDir)) {
      const f = path.join(issueDir, d, "index.html");
      if (!fs.existsSync(f) || d === "index.html") continue;
      const html = fs.readFileSync(f, "utf8");
      const plates = (html.match(/class="plate-num"/g) || []).length;
      const undefCount = (html.match(/plate-num">undefined/g) || []).length;
      if (undefCount > 0) {
        bad++;
        console.log(`  ✗ issues/${d}/ has ${undefCount} undefined plates`);
      }
      // header 应说 N plates 与实际 plate 数匹配
      const headerMatch = html.match(/本期论文 · (\d+) plate/);
      if (headerMatch && Number(headerMatch[1]) !== plates) {
        bad++;
        console.log(`  ✗ issues/${d}/ header says ${headerMatch[1]} plates but renders ${plates}`);
      }
    }
    check("issue plates 无 undefined 且 header 匹配", () => bad === 0 || `${bad} issue 不一致`);
  }
}

console.log("\n=== Internal link health ===");
const htmlFiles = [];
function walkHtml(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walkHtml(full);
    else if (f.name.endsWith(".html")) htmlFiles.push(full);
  }
}
walkHtml(DIST);

const legacyIdentity = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const legacyMarker = html.match(/#jason\b|Jason (?:Zhou|Zhang)|"name"\s*:\s*"Jason"(?=\s*[,}])/);
  if (legacyMarker) {
    legacyIdentity.push(`${path.relative(DIST, file)}: ${legacyMarker[0]}`);
  }
}
check(`${htmlFiles.length} 个构建 HTML 不含旧 identity`, () => (
  legacyIdentity.length === 0 || legacyIdentity.slice(0, 20).join("; ")
));

console.log("\n=== CSP report-only readiness ===");
{
  const notReady = [];
  let styleAttributeCount = 0;
  const styleValues = new Set();
  const unexpectedResources = [];
  const iframeOrigins = new Set();

  for (const file of htmlFiles) {
    const relative = path.relative(DIST, file);
    const html = fs.readFileSync(file, "utf8");
    const inventory = scanHtmlSecurity(html, { source: relative });
    if (!inventory.ready) notReady.push(inventory);
    styleAttributeCount += inventory.styleAttributes.count;
    for (const value of inventory.styleAttributes.uniqueValues) styleValues.add(value);
    const resources = scanHtmlResourcePolicy(inventory);
    unexpectedResources.push(...resources.unexpectedResources);
    for (const origin of resources.iframeOrigins) iframeOrigins.add(origin);
  }

  check("全部生成 HTML 无 inline handler/script/style、active URL、srcdoc 或 forbidden element", () => {
    if (notReady.length === 0) return true;
    const first = notReady[0];
    try { assertHtmlSecurity(first); } catch (error) { return error.message; }
    return `${notReady.length} HTML file(s) are not CSP-ready`;
  });
  check(`批准 style attribute 预算精确为 ${CSP_STYLE_ATTRIBUTE_BUDGET.maxAttributeCount}`, () => (
    styleAttributeCount === CSP_STYLE_ATTRIBUTE_BUDGET.maxAttributeCount
      || `${styleAttributeCount} vs ${CSP_STYLE_ATTRIBUTE_BUDGET.maxAttributeCount}`
  ));
  check(`批准 style attribute 唯一值精确为 ${CSP_STYLE_ATTRIBUTE_BUDGET.maxUniqueValueCount}`, () => (
    styleValues.size === CSP_STYLE_ATTRIBUTE_BUDGET.maxUniqueValueCount
      || `${styleValues.size} vs ${CSP_STYLE_ATTRIBUTE_BUDGET.maxUniqueValueCount}`
  ));
  check("批准 style attribute 唯一值 digest 未漂移", () => {
    const actual = digestStyleValues([...styleValues]);
    return actual === CSP_STYLE_ATTRIBUTE_BUDGET.uniqueValueSha256
      || `${actual} vs ${CSP_STYLE_ATTRIBUTE_BUDGET.uniqueValueSha256}`;
  });
  check("动态 style sink 逐文件匹配批准属性与精确数量", () => {
    const drift = [];
    const approvedSources = new Set(CSP_STYLE_ATTRIBUTE_BUDGET.runtimeSinks.map(item => item.source));
    const candidates = [
      ...fs.readdirSync(path.join(SITE, "src"))
        .filter(file => file.endsWith(".js"))
        .map(file => ({ source: `src/${file}`, target: path.join(SITE, "src", file) })),
      ...fs.readdirSync(path.join(ROOT, "deck"))
        .filter(file => file.endsWith(".js"))
        .map(file => ({ source: `deck/${file}`, target: path.join(ROOT, "deck", file) })),
    ];
    for (const candidate of candidates) {
      const inventory = scanRuntimeStyleSinks(fs.readFileSync(candidate.target, "utf8"), {
        sourceName: candidate.source,
      });
      if (inventory.count > 0 && !approvedSources.has(candidate.source)) {
        drift.push(`${candidate.source}: ${inventory.count} unapproved sink(s)`);
      }
      if (inventory.unrecognized.length > 0) {
        drift.push(`${candidate.source}: ${inventory.unrecognized.length} unrecognized style API(s)`);
      }
    }
    for (const approved of CSP_STYLE_ATTRIBUTE_BUDGET.runtimeSinks) {
      const target = approved.source.startsWith("deck/")
        ? path.join(ROOT, approved.source)
        : path.join(SITE, approved.source);
      const inventory = scanRuntimeStyleSinks(fs.readFileSync(target, "utf8"), {
        sourceName: approved.source,
      });
      if (
        inventory.count !== approved.expectedMatches
        || JSON.stringify(inventory.properties) !== JSON.stringify(approved.properties)
        || inventory.unrecognized.length !== 0
      ) {
        drift.push(
          `${approved.source}: count ${inventory.count}/${approved.expectedMatches}, `
          + `properties ${inventory.properties.join(",")}/${approved.properties.join(",")}`,
        );
      }
    }
    return drift.length === 0 || drift.slice(0, 3).join("; ");
  });
  check("script/style/font/image/manifest 资源同源且 iframe 只有批准 origin", () => (
    unexpectedResources.length === 0
      && JSON.stringify([...iframeOrigins].sort()) === JSON.stringify(["https://playground.tensorflow.org"])
  ) || `${unexpectedResources.slice(0, 3).join("; ") || `iframe origins: ${[...iframeOrigins].join(", ")}`}`);

  const cssUrls = [];
  function walkCss(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) walkCss(target);
      else if (entry.name.endsWith(".css")) {
        const css = fs.readFileSync(target, "utf8");
        const inventory = scanCssResourcePolicy(css, { source: path.relative(DIST, target) });
        cssUrls.push(...inventory.unexpectedResources);
      }
    }
  }
  walkCss(DIST);
  check("生成 CSS 的 url() 只使用同源或 data:", () => cssUrls.length === 0 || cssUrls.slice(0, 3).join("; "));

  const manifestPath = path.join(DIST, "csp-report-only.json");
  const expectedManifest = createCspReportOnlyManifest({
    styleBudget: CSP_STYLE_ATTRIBUTE_BUDGET,
    base: builtBase,
  });
  const actualManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  check("CSP artifact 与 canonical header/budget 一致且 production 明示 NOT_APPLIED", () => (
    actualManifest.production_status === CSP_PRODUCTION_STATUS
    && actualManifest.header.name === CSP_REPORT_ONLY_HEADER_NAME
    && JSON.stringify(actualManifest) === JSON.stringify(expectedManifest)
  ) || "csp-report-only.json drift");
}

const linkRe = /href="([^"#?]+)[^"]*"/g;
const broken = [];
let totalLinks = 0;
const seenLinks = new Set();

// prefix 来自构建产物，不依赖 check 进程是否继承了 build 时的 SITE_BASE。
const prefix = builtBase;

// 全量扫描：dist 下所有 HTML 的站内链接（以 BASE 或 / 开头）逐一验证目标存在
console.log(`  scanning ${htmlFiles.length} html files (full scan) for link check`);
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  let match;
  linkRe.lastIndex = 0;
  while ((match = linkRe.exec(html))) {
    const href = match[1];
    if (href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto:") || href.startsWith("#")) continue;
    totalLinks++;
    if (seenLinks.has(href)) continue;
    seenLinks.add(href);
    // 去 prefix
    let target = href;
    if (prefix && target.startsWith(prefix)) target = target.slice(prefix.length);
    if (!target.startsWith("/")) continue;
    // 解析候选路径：/foo/ → dist/foo/index.html；/foo.xml → dist/foo.xml
    let decoded;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      broken.push({ file: path.relative(DIST, file), href: `${href}（URI 解码失败）` });
      continue;
    }
    let candidate = path.join(DIST, decoded);
    if (target.endsWith("/")) candidate = path.join(candidate, "index.html");
    if (!fs.existsSync(candidate)) {
      // 试 .html
      const altHtml = candidate + ".html";
      if (fs.existsSync(altHtml)) continue;
      broken.push({ file: path.relative(DIST, file), href });
    }
  }
}
if (broken.length > 0) {
  console.log(`  死链清单（前 20 条，源文件 → 死链）:`);
  for (const b of broken.slice(0, 20)) console.log(`    ${b.file} → ${b.href}`);
}
check(`${seenLinks.size} 唯一站内链接全量扫描均可达`, () => broken.length === 0 || `${broken.length} 个死链`);

console.log("\n=== Asset sizes ===");
function dirSize(dir) {
  let total = 0;
  let files = 0;
  function walk(p) {
    for (const f of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, f.name);
      if (f.isDirectory()) walk(full);
      else {
        total += fs.statSync(full).size;
        files++;
      }
    }
  }
  if (fs.existsSync(dir)) walk(dir);
  return { total, files };
}

const distSize = dirSize(DIST);
const distMB = (distSize.total / 1024 / 1024).toFixed(1);
check(`dist 总大小 ${distMB}MB / ${distSize.files} files`, () => distSize.total < 200 * 1024 * 1024 || `超过 200MB`);

const imagesDir = path.join(DIST, "images");
const imagesSize = dirSize(imagesDir);
const imagesMB = (imagesSize.total / 1024 / 1024).toFixed(1);
console.log(`  images: ${imagesMB}MB / ${imagesSize.files} files`);

// largest 5 files
const allFiles = [];
function walkAll(dir) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walkAll(full);
    else allFiles.push({ path: full, size: fs.statSync(full).size });
  }
}
walkAll(DIST);
const top5 = allFiles.sort((a, b) => b.size - a.size).slice(0, 5);
console.log("  largest 5 files:");
for (const f of top5) {
  const rel = path.relative(DIST, f.path);
  const kb = (f.size / 1024).toFixed(0);
  console.log(`    ${kb}KB  ${rel}`);
}

// HTML 单页超过 350KB 警告（全量 Papers 页也应留在合理范围内）
const heavyHtml = allFiles.filter(f => f.path.endsWith(".html") && f.size > 350 * 1024);
check(`HTML 页面均 < 350KB`, () => heavyHtml.length === 0 || `${heavyHtml.length} 页超 350KB: ${heavyHtml.map(f => path.relative(DIST, f.path)).join(", ")}`);

// 性能预算（1.0.0 固化当前健康值，防劣化）
// SITE_BASE 会机械重复在每个内部 URL 上；先去掉此前缀，确保 root/repo build
// 衡量同一份页面内容，而不是把部署路径长度当成内容回归。
const budgetedIndexHtml = normalizeRouteHtmlForBase(builtIndexHtml, { base: builtBase });
const indexSize = Buffer.byteLength(budgetedIndexHtml);
check(`首页 index.html（SITE_BASE 归一化）${(indexSize / 1024).toFixed(0)}KB < 250KB`, () => (
  indexSize < 250 * 1024 || `超预算: ${(indexSize / 1024).toFixed(0)}KB`
));
const papersIndexSize = fs.statSync(path.join(DIST, "papers", "index.html")).size;
check(`论文库 papers/index.html ${(papersIndexSize / 1024).toFixed(0)}KB < 250KB`, () => papersIndexSize < 250 * 1024 || `超预算: ${(papersIndexSize / 1024).toFixed(0)}KB`);

// 首页图片路由预算是确定性的静态代理，不冒充浏览器 Network 结果：
// - default: img/src、image preload、inline CSS url 去重后的默认请求/字节；
// - candidates: default 加全部 srcset 声明，用于防止响应式候选库存膨胀。
// 真实 viewport/DPR 下的 transferred bytes 仍由浏览器矩阵记录。
const HOME_ROUTE_IMAGE_BUDGET = Object.freeze({
  maxRequests: 170,
  maxBytes: 9 * 1024 * 1024,
  maxCandidates: 285,
  maxCandidateBytes: 20 * 1024 * 1024,
});
const homeImageMetrics = measureRouteImageBudget(builtIndexHtml, {
  base: builtBase,
  readAssetSize(relativePath) {
    const target = path.resolve(DIST, relativePath);
    if (target !== DIST && !target.startsWith(`${DIST}${path.sep}`)) return null;
    const stat = fs.lstatSync(target);
    return stat.isFile() ? stat.size : null;
  },
});
const homeImageBudget = evaluateRouteImageBudget(homeImageMetrics, HOME_ROUTE_IMAGE_BUDGET);
const routeBudgetError = code => homeImageBudget.errors.find(error => error.code === code);
const defaultMiB = (homeImageMetrics.totalBytes / 1024 / 1024).toFixed(2);
const candidateMiB = (homeImageMetrics.candidateBytes / 1024 / 1024).toFixed(2);
check("首页图片静态引用均可本地度量、匹配 SITE_BASE 且文件存在", () => {
  const errors = homeImageBudget.errors.filter(error => (
    error.code === "INVALID_LOCAL_IMAGE_URL" || error.code === "MISSING_IMAGE_ASSET"
  ));
  return errors.length === 0 || errors.map(error => error.message).join("; ");
});
check(`首页默认图片静态代理 ${homeImageMetrics.requestCount} requests <= ${HOME_ROUTE_IMAGE_BUDGET.maxRequests}`, () => (
  routeBudgetError("IMAGE_REQUEST_BUDGET_EXCEEDED")?.message ?? true
));
check(`首页默认图片静态代理 ${defaultMiB}MiB <= 9MiB`, () => (
  routeBudgetError("IMAGE_BYTE_BUDGET_EXCEEDED")?.message ?? true
));
check(`首页声明图片候选 ${homeImageMetrics.candidateCount} <= ${HOME_ROUTE_IMAGE_BUDGET.maxCandidates}`, () => (
  routeBudgetError("IMAGE_CANDIDATE_BUDGET_EXCEEDED")?.message ?? true
));
check(`首页声明图片候选 ${candidateMiB}MiB <= 20MiB`, () => (
  routeBudgetError("IMAGE_CANDIDATE_BYTE_BUDGET_EXCEEDED")?.message ?? true
));

const cssSize = fs.statSync(path.join(DIST, "styles.css")).size;
check(`styles.css ${(cssSize / 1024).toFixed(0)}KB < 135KB`, () => cssSize < 135 * 1024 || `超预算: ${(cssSize / 1024).toFixed(0)}KB`);

// 单张图片预算：论文附图已压缩，当前全站最大 ~474KB
const IMG_EXT = /\.(webp|png|jpe?g|gif|svg|avif)$/i;
const heavyImages = allFiles.filter(f => IMG_EXT.test(f.path) && f.size > 600 * 1024);
check(`单张图片均 < 600KB`, () => heavyImages.length === 0 || `${heavyImages.length} 张超 600KB: ${heavyImages.map(f => path.relative(DIST, f.path)).join(", ")}`);

console.log("\n=== Guide chapter pages ===");
{
  const guideDir = path.join(ROOT, "guide");
  const guideSlugs = fs.readdirSync(guideDir)
    .filter(f => f.startsWith("ch") && f.endsWith(".md"))
    .map(f => f.replace(/\.md$/, ""));
  let guideMissing = 0;
  for (const slug of guideSlugs) {
    if (!fs.existsSync(path.join(DIST, "guide", slug, "index.html"))) guideMissing++;
  }
  check(`${guideSlugs.length} 章导读 HTML 全部存在`, () => guideMissing === 0 || `${guideMissing} 章缺 HTML`);
}

console.log("\n=== Task-required notes ===");
{
  let taskMissing = 0;
  let taskNoFlag = 0;
  for (const slug of TASK_SLUGS) {
    const noteFile = path.join(NOTES, `${slug}.md`);
    if (!fs.existsSync(noteFile)) {
      taskMissing++;
      console.log(`  ✗ task note missing: ${slug}`);
    } else {
      const { data } = matter(fs.readFileSync(noteFile, "utf8"));
      if (data.task !== "required") taskNoFlag++;
    }
  }
  check(`13 篇任务论文笔记全部存在`, () => taskMissing === 0 || `${taskMissing} 篇缺失`);
  check(`13 篇任务论文均有 task: required`, () => taskNoFlag === 0 || `${taskNoFlag} 篇缺 task 标记`);
}

console.log("\n=== Learning path contract ===");
{
  const syllabusDays = SYLLABUS_WEEKS.flatMap((week) => week.days);
  const expectedDays = Array.from({ length: 30 }, (_, index) => index + 1);
  const paperDays = syllabusDays.filter((day) => day.slug);
  check("syllabus 是连续 Day 1–30", () => (
    JSON.stringify(syllabusDays.map((day) => day.d)) === JSON.stringify(expectedDays)
  ) || "SYLLABUS_WEEKS 不是连续 1..30");
  check("30 天核心 = 25 个论文日 + 5 个复习/输出日", () => (
    paperDays.length === 25 && syllabusDays.length - paperDays.length === 5
  ) || `${paperDays.length} 个论文日 + ${syllabusDays.length - paperDays.length} 个复习/输出日`);

  const pathSource = fs.readFileSync(path.join(SITE, "content", "path.md"), "utf8");
  const optionalMarker = "## 可选任务扩展 · Day 31–35";
  const optionalIndex = pathSource.indexOf(optionalMarker);
  const extension = optionalIndex >= 0 ? pathSource.slice(optionalIndex) : "";
  const extensionRows = [...extension.matchAll(/^\|\s*(3[1-5])\s*\|[^\n]*?\]\(\/papers\/([^/]+)\/\)/gm)];
  check("Day 31–35 明确为不计入核心的可选扩展", () => (
    optionalIndex >= 0
    && pathSource.includes("不计入 30 天核心进度")
    && extensionRows.length === 10
  ) || `optional marker=${optionalIndex >= 0}, rows=${extensionRows.length}`);

  const syllabusHtml = fs.readFileSync(path.join(DIST, "syllabus", "index.html"), "utf8");
  const renderedDays = syllabusHtml.match(/data-syl-day="\d+"/g) || [];
  check("/syllabus/ 渲染 30 个核心 checkbox", () => renderedDays.length === 30 || `${renderedDays.length} 个`);
  check("/syllabus/ 不再内联写旧混合进度键", () => !syllabusHtml.includes("eaireading.syllabus") || "仍引用 legacy key");

  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const faq = fs.readFileSync(path.join(SITE, "content", "faq.md"), "utf8");
  check("README/FAQ 统一 30 天核心 + 5 天可选扩展", () => (
    readme.includes("30 天核心学习 + 5 天可选扩展")
    && faq.includes("30 天核心（25 篇 + 5 个复习/输出日）")
    && !/30\s*天\s*30\s*篇/.test(`${readme}\n${faq}`)
  ) || "公开入口文案与 30+5 taxonomy 不一致");
  check("学习路径提供可勾选 Syllabus 入口", () => (
    pathSource.includes("](/syllabus/)")
  ) || "/learn/path/ 缺少 /syllabus/ 入口");

  const publicContent = fs.readdirSync(path.join(SITE, "content"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => fs.readFileSync(path.join(SITE, "content", file), "utf8"))
    .join("\n");
  check("公开页面不再使用旧的 30 天 30 篇口径", () => (
    !/30\s*天\s*30\s*篇|30\s*天完整路径/.test(`${readme}\n${publicContent}`)
  ) || "仍存在旧学习路径口径");
}

console.log("\n=== Client state contract ===");
{
  const progressSource = fs.readFileSync(path.join(SITE, "src", "reading-progress.js"), "utf8");
  for (const key of [
    "eaireading.path.days.v1",
    "eaireading.guide.chapters.v1",
    "eaireading.guide.chapterTs.v1",
  ]) {
    check(`versioned state key: ${key}`, () => progressSource.includes(key) || "missing");
  }
  check("旧 syllabus key 仅迁移读取，不再写入", () => (
    !/setItem\(LEGACY_(?:PROGRESS|GUIDE_TS)_KEY/.test(progressSource)
  ) || "legacy key still written");
  check("进度脚本提供版本化 export/import/reset", () => (
    progressSource.includes("window.EAI_STATE")
    && progressSource.includes("exportObject")
    && progressSource.includes("importObject")
    && progressSource.includes("reset: resetState")
  ) || "EAI_STATE API incomplete");

  const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  const missingControls = [
    "eai-state-export",
    "eai-state-import",
    "eai-state-import-file",
    "eai-state-restore-import",
    "eai-state-reset-path",
    "eai-state-reset-guide",
    "eai-state-reset-all",
  ].filter((id) => !indexHtml.includes(`id="${id}"`));
  check("首页提供进度备份/导入/分区重置控件", () => missingControls.length === 0 || `missing: ${missingControls.join(", ")}`);
}

console.log("\n=== Metadata consistency ===");
{
  // A. topics.json 的 primer slug 全部有对应笔记
  check("topics.json primer slug 均有对应笔记", () => {
    const missing = topicsJson
      .flatMap(t => t.primer || [])
      .filter(s => !fs.existsSync(path.join(NOTES, `${s}.md`)));
    return missing.length === 0 || `缺失: ${missing.join(", ")}`;
  });

  // B. progress.md 提到全部 13 篇任务论文，且笔记存在
  // progress.md 用论文名（如 "Cosmos Policy"、"RF-SLAM"），归一化（去非字母数字、小写）后按 slug 匹配
  check("progress.md 覆盖全部 TASK_SLUGS 且笔记存在", () => {
    const progress = fs.readFileSync(path.join(ROOT, "progress.md"), "utf8");
    const normalized = progress.toLowerCase().replace(/[^a-z0-9]/g, "");
    const problems = [];
    for (const slug of TASK_SLUGS) {
      if (!normalized.includes(slug.replace(/[^a-z0-9]/g, ""))) problems.push(`progress.md 未提到 ${slug}`);
      if (!fs.existsSync(path.join(NOTES, `${slug}.md`))) problems.push(`notes/${slug}.md 缺失`);
    }
    return problems.length === 0 || problems.join("; ");
  });

  // C. issue markdown ≥1 且 dist/issues/ 页面数与 content/issue-*.md 一致
  const contentDir = path.join(SITE, "content");
  const issueMds = fs.existsSync(contentDir)
    ? fs.readdirSync(contentDir).filter(f => /^issue-.*\.md$/.test(f))
    : [];
  check("content/ 下 issue markdown ≥ 1", () => issueMds.length >= 1 || "content/ 下没有任何 issue-*.md");
  check("issue 页数与 content/issue-*.md 数一致", () => {
    const issueDir = path.join(DIST, "issues");
    const builtPages = fs.existsSync(issueDir)
      ? fs.readdirSync(issueDir, { withFileTypes: true })
          .filter(d => d.isDirectory() && fs.existsSync(path.join(issueDir, d.name, "index.html")))
          .length
      : 0;
    return builtPages === issueMds.length || `dist/issues/ ${builtPages} 页 vs content ${issueMds.length} 篇`;
  });
}

console.log("\n=== Status field validity ===");
{
  const VALID_STATUS = new Set(["auto-summary", "auto-summary-light", "deep-read", "stub", "missing"]);
  let invalidStatus = 0;
  for (const f of noteFiles) {
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data } = matter(raw);
    if (data.status && !VALID_STATUS.has(data.status)) {
      invalidStatus++;
      console.log(`  ✗ invalid status "${data.status}" in ${f}`);
    }
  }
  check("status 字段值全部合法", () => invalidStatus === 0 || `${invalidStatus} 篇 status 值非法`);
}

console.log("\n=== Figure coverage (deep-read) ===");
{
  function countAscii(body) {
    const blocks = body.match(/```[\s\S]*?```/g) || [];
    return blocks.filter((b) => /[┌┐└┘│─├┤→]/.test(b) || (b.includes("->") && b.length > 80 && !/^```python/i.test(b))).length;
  }
  const INLINE = path.join(SITE, "src", "images", "inline");
  const CARDS = path.join(SITE, "src", "images", "cards");
  let visualFail = 0, localUnused = 0, inlineFail = 0;
  for (const f of noteFiles) {
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (data.status !== "deep-read") continue;
    const slug = f.replace(/\.md$/, "");
    const mdImgs = (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
    const paperImgs = (content.match(/!\[[^\]]*\]\(\.\.\/papers\//g) || []).length;
    const ascii = countAscii(content);
    if (mdImgs + ascii < 2) {
      visualFail++;
      console.log(`  ✗ ${slug}: 视觉元素 < 2 (md=${mdImgs} ascii=${ascii})`);
    }
    const imgDir = path.join(ROOT, "papers", slug, "images");
    const localN = fs.existsSync(imgDir) ? fs.readdirSync(imgDir).filter(x => /\.(jpe?g|png|webp)$/i.test(x)).length : 0;
    if (localN >= 5 && paperImgs === 0) {
      localUnused++;
      console.log(`  ⚠ ${slug}: 本地 ${localN} 张图未引用`);
    }
    if (!fs.existsSync(path.join(INLINE, `${slug}-scene.webp`)) || !fs.existsSync(path.join(INLINE, `${slug}-method.webp`))) {
      inlineFail++;
    }
    if (!fs.existsSync(path.join(CARDS, `${slug}.webp`))) inlineFail++;
  }
  check("deep-read 笔记视觉元素 ≥ 2", () => visualFail === 0 || `${visualFail} 篇未达标`);
  check("inline scene+method 与 card 齐全", () => inlineFail === 0 || `${inlineFail} 篇缺站点配图`);
  if (localUnused > 0) console.log(`  ⚠ ${localUnused} 篇本地图未引用（warn only）`);
}

console.log("\n=== Deep-read required sections ===");
{
  // 兼容两种标题体例：`## 思考题` 与 `## 7. 思考题`
  const REQUIRED_SECTIONS = [
    ["实验结果说明了什么", /^## (\d+\. )?.*实验结果说明了什么/m],
    ["和本导读的关系", /^## (\d+\. )?.*和本导读的关系/m],
    ["思考题", /^## (\d+\. )?.*思考题/m],
    ["原文信息", /^## (\d+\. )?.*原文信息/m],
  ];
  const missing = [];
  for (const f of noteFiles) {
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (data.status !== "deep-read") continue;
    const slug = f.replace(/\.md$/, "");
    for (const [name, re] of REQUIRED_SECTIONS) {
      if (!re.test(content)) missing.push(`${slug} 缺「${name}」`);
    }
  }
  if (missing.length > 0) {
    console.log(`  缺失清单（前 20 条）:`);
    for (const msg of missing.slice(0, 20)) console.log(`    ✗ ${msg}`);
  }
  check("deep-read 笔记含 4 个强制章节（实验解读/导读关系/思考题/原文信息）", () => missing.length === 0 || `${missing.length} 处缺失`);
}

console.log("\n=== Public quality contract ===");
{
  const tooShort = [];
  for (const f of noteFiles) {
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (data.status !== "deep-read") continue;
    const words = countWords(content);
    if (words < 4000) tooShort.push(`${f.replace(/\.md$/, "")} (${words})`);
  }
  check("deep-read 长篇结构化笔记均 ≥ 4000 字", () => tooShort.length === 0 || tooShort.join(", "));

  const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
  const faq = fs.readFileSync(path.join(SITE, "content", "faq.md"), "utf8");
  const roadmap = fs.readFileSync(path.join(ROOT, "docs", "v1.2-healthcheck-roadmap.md"), "utf8");
  const llmsPath = path.join(DIST, "llms.txt");
  const llms = fs.existsSync(llmsPath) ? fs.readFileSync(llmsPath, "utf8") : "";
  const unenforcedClaims = [
    [/Method[^\n]*(?:≥|>=)\s*40\s*%/i, "统一 Method ≥40%"],
    [/精读笔记是手动写的/, "全部手动写作"],
    [/All content is hand-curated/i, "全部 hand-curated"],
    [/≥\s*3\s*条「局限与批评」/, "统一局限数量"],
    [/5[–-]8\s*道思考题/, "统一思考题数量"],
  ].filter(([pattern]) => pattern.test(`${readme}\n${faq}\n${llms}`)).map(([, label]) => label);
  check("公开质量文案不承诺未执行的统一指标", () => unenforcedClaims.length === 0 || unenforcedClaims.join(", "));
  check("README、llms 与路线图使用一致且可审计的质量边界", () => (
    readme.includes("不等于“作者已逐页人工复核原论文”")
    && readme.includes("AI 辅助整理")
    && llms.includes("AI-assisted, long-form structured Chinese study aids")
    && llms.includes(`do not mean all ${noteFiles.length} papers were reread page by page by a human`)
    && roadmap.includes("42 篇 Method 章节低于 1,500 字")
    && roadmap.includes("120 篇低于旧版宣传的 Method 占比")
    && roadmap.includes("至少 39 篇明确标注了摘要或需回到原文核验的限制")
    && roadmap.includes("不得据此盲目扩写")
  ) || "README/llms/路线图缺少一致的 AI 辅助、人工复核边界或冻结债务计数");
}

console.log(`\n=== Summary ===`);
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
