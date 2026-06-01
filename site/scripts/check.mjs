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

for (const file of htmlFiles.slice(0, 30)) { // 抽 30 个 html 检查（全部 2400+ 太慢）
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

console.log(`\n=== Summary ===`);
console.log(`  ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
