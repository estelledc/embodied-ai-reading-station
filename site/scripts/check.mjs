#!/usr/bin/env node
// Build healthcheck — 验证 dist/ 关键页 + frontmatter 完整性
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const ROOT = path.resolve(SITE, "..");
const DIST = path.join(SITE, "dist");
const NOTES = path.join(ROOT, "notes");

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

console.log("\n=== Static pages ===");
const requiredPages = [
  "index.html",
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
  "favicon.svg",
  "site.webmanifest",
  "data/papers.json",
  "data/tags.json",
  "data/topics.json",
  "data/index.json",
];
for (const p of requiredPages) {
  check(p, () => fs.existsSync(path.join(DIST, p)) || `missing: ${p}`);
}

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
check("papers.json 数量等于 notes 数量", () => papersJson.length === noteFiles.length || `${papersJson.length} vs ${noteFiles.length}`);
check("papers.json 每条有 slug+title+url", () => {
  const bad = papersJson.find(p => !p.slug || !p.title || !p.url);
  return !bad || `bad entry: ${JSON.stringify(bad).slice(0, 60)}`;
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
  check("sw.js VERSION 已注入构建时间戳", () => /const VERSION = "\d{12}"/.test(sw) || `VERSION 未替换`);
  const idx = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
  check("index.html 引用 sw-register.js", () => idx.includes("sw-register.js") || `无 sw-register`);
  check("index.html 含 theme-color", () => idx.includes('name="theme-color"') || `无 theme-color`);
  check("index.html 引用 manifest", () => idx.includes("site.webmanifest") || `无 manifest link`);
  check("index.html 引用 favicon.svg", () => idx.includes("favicon.svg") || `无 favicon link`);
  check("index.html 含 OpenSearch link", () => idx.includes("opensearch.xml") || `无 opensearch`);
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

const linkRe = /href="([^"#?]+)"/g;
const broken = [];
let totalLinks = 0;
const seenLinks = new Set();

// 探测 prefix（GitHub Pages 的 SITE_BASE）
let prefix = "";
const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const m = indexHtml.match(/href="([^"]*)\/styles\.css"/);
if (m) prefix = m[1];

// stratified sample：papers/issues/topics/eras/learn/lists 各取若干 + 根级所有
const sampled = (() => {
  const buckets = { paper: [], issue: [], topic: [], era: [], learn: [], list: [], root: [] };
  for (const f of htmlFiles) {
    const rel = path.relative(DIST, f);
    if (rel.startsWith("papers/")) buckets.paper.push(f);
    else if (rel.startsWith("issues/")) buckets.issue.push(f);
    else if (rel.startsWith("topics/")) buckets.topic.push(f);
    else if (rel.startsWith("eras/")) buckets.era.push(f);
    else if (rel.startsWith("learn/")) buckets.learn.push(f);
    else if (rel.startsWith("lists/")) buckets.list.push(f);
    else buckets.root.push(f);
  }
  return [
    ...buckets.root,                      // 全部根级页
    ...buckets.paper.slice(0, 20),        // 20 papers
    ...buckets.issue.slice(0, 7),         // 全部 7 issues
    ...buckets.topic.slice(0, 5),
    ...buckets.era.slice(0, 3),
    ...buckets.learn.slice(0, 3),
    ...buckets.list.slice(0, 1),
  ];
})();
console.log(`  sampled ${sampled.length} files (stratified) for link check`);
for (const file of sampled) {
  const html = fs.readFileSync(file, "utf8");
  let match;
  linkRe.lastIndex = 0;
  while ((match = linkRe.exec(html))) {
    const href = match[1];
    if (href.startsWith("http") || href.startsWith("//") || href.startsWith("mailto:") || href.startsWith("#")) continue;
    if (href.endsWith(".js") || href.endsWith(".css") || href.endsWith(".xml") || href.endsWith(".json") || href.endsWith(".webmanifest")) continue;
    totalLinks++;
    if (seenLinks.has(href)) continue;
    seenLinks.add(href);
    // 去 prefix
    let target = href;
    if (prefix && target.startsWith(prefix)) target = target.slice(prefix.length);
    if (!target.startsWith("/")) continue;
    // 解析候选路径
    let candidate = path.join(DIST, target);
    if (target.endsWith("/")) candidate = path.join(candidate, "index.html");
    if (!fs.existsSync(candidate)) {
      // 试 .html
      const altHtml = candidate + ".html";
      if (fs.existsSync(altHtml)) continue;
      broken.push({ file: path.relative(DIST, file), href });
    }
  }
}
check(`${seenLinks.size} 唯一链接均可达`, () => broken.length === 0 || `${broken.length} 个死链 (sample): ${broken.slice(0, 3).map(b => b.href).join(", ")}`);

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

// HTML 单页超过 350KB 警告（index 因 156 卡片必然较重）
const heavyHtml = allFiles.filter(f => f.path.endsWith(".html") && f.size > 350 * 1024);
check(`HTML 页面均 < 350KB`, () => heavyHtml.length === 0 || `${heavyHtml.length} 页超 350KB: ${heavyHtml.map(f => path.relative(DIST, f.path)).join(", ")}`);

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
  const TASK_SLUGS = [
    "llava", "3dshape2vecset", "saycan", "openvla", "vlas", "mla",
    "cosmos-policy", "rf-slam", "mmclip", "nlos-mmwave",
    "proactive-hearing", "neuralaids", "acoustic-swarms",
  ];
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

console.log("\n=== Source path integrity ===");
{
  let sourceBroken = 0;
  for (const f of noteFiles) {
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data } = matter(raw);
    const src = data["来源"] || data.source || "";
    if (src.startsWith("papers/")) {
      // 检查 papers/<slug>/ 目录是否存在（至少有 paper.md 或 paper.pdf）
      const papersDir = path.join(ROOT, path.dirname(src));
      if (!fs.existsSync(papersDir)) {
        sourceBroken++;
        console.log(`  ✗ ${f}: 来源引用 ${src} 但目录不存在`);
      }
    }
  }
  check("来源引用 papers/ 的笔记目录均存在", () => sourceBroken === 0 || `${sourceBroken} 篇来源目录缺失`);
}

console.log(`\n=== Summary ===`);
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
