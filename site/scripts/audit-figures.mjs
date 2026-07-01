#!/usr/bin/env node
/**
 * Audit figure coverage across notes, papers/, and site/src/images.
 * Writes dist/data/figures-audit.json when run after build, or standalone JSON to stdout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");
const INLINE = path.join(ROOT, "site", "src", "images", "inline");
const CARDS = path.join(ROOT, "site", "src", "images", "cards");

function countAsciiBlocks(body) {
  const blocks = body.match(/```[\s\S]*?```/g) || [];
  return blocks.filter(
    (b) =>
      /[┌┐└┘│─├┤→]/.test(b) ||
      (b.includes("->") && b.length > 80 && !/^```python/i.test(b)),
  ).length;
}

function auditNote(slug, data, body) {
  const mdImgs = (body.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const paperImgs = (body.match(/!\[[^\]]*\]\(\.\.\/papers\//g) || []).length;
  const ascii = countAsciiBlocks(body);
  const visual = mdImgs + ascii;
  const imgDir = path.join(PAPERS, slug, "images");
  const localCount = fs.existsSync(imgDir)
    ? fs.readdirSync(imgDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).length
    : 0;
  const scene = fs.existsSync(path.join(INLINE, `${slug}-scene.webp`));
  const method = fs.existsSync(path.join(INLINE, `${slug}-method.webp`));
  const card = fs.existsSync(path.join(CARDS, `${slug}.webp`));
  const issues = [];
  if (data.status === "deep-read" && visual < 2) issues.push("visual_lt_2");
  if (localCount >= 5 && paperImgs === 0) issues.push("local_unused");
  if (!scene) issues.push("no_inline_scene");
  if (!method) issues.push("no_inline_method");
  if (!card) issues.push("no_card");
  return {
    slug,
    status: data.status,
    mdImgs,
    paperImgs,
    ascii,
    visual,
    localCount,
    scene,
    method,
    card,
    issues,
  };
}

const rows = [];
for (const f of fs.readdirSync(NOTES).filter((x) => x.endsWith(".md"))) {
  const slug = f.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
  const { data, content } = matter(raw);
  rows.push(auditNote(slug, data, content));
}

const deep = rows.filter((r) => r.status === "deep-read");
const summary = {
  generated_at: new Date().toISOString().slice(0, 10),
  total: rows.length,
  deep_read: deep.length,
  deep_visual_ok: deep.filter((r) => r.visual >= 2).length,
  deep_local_wired: deep.filter((r) => r.localCount === 0 || r.paperImgs >= 2).length,
  inline_scene: rows.filter((r) => r.scene).length,
  inline_method: rows.filter((r) => r.method).length,
  cards: rows.filter((r) => r.card).length,
  with_issues: rows.filter((r) => r.issues.length).length,
  rows,
};

const outPath = process.argv.includes("--write")
  ? path.join(ROOT, "site", "dist", "data", "figures-audit.json")
  : null;
if (outPath) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
}

console.log(JSON.stringify({
  deep_visual_ok: `${summary.deep_visual_ok}/${summary.deep_read}`,
  inline_scene: `${summary.inline_scene}/${summary.total}`,
  inline_method: `${summary.inline_method}/${summary.total}`,
  cards: `${summary.cards}/${summary.total}`,
  with_issues: summary.with_issues,
}, null, 2));

const fails = deep.filter((r) => r.issues.includes("visual_lt_2"));
if (fails.length) {
  console.error("FAIL visual_lt_2:", fails.map((r) => r.slug).join(", "));
  process.exitCode = 1;
}
