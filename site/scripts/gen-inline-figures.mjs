#!/usr/bin/env node
// 给每篇笔记内部生成 2 张图：场景图 + 方法图
import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { SCENE_SECTION_RE, METHOD_SECTION_RE, extractSectionParagraph } from "./figure-section-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const OUT = path.join(ROOT, "site", "src", "images", "inline");
fs.mkdirSync(OUT, { recursive: true });

const STYLE = "Magazine-grade abstract editorial illustration. Style: warm hand-pressed paper background (#efe7d2 ivory), coral red (#ed6f5c) and mustard yellow (#e9b94a) accents, occasional olive green (#6e7448), subtle hairline rules. Pure flat editorial illustration, like Apartamento or Monocle magazine. NO photorealism, NO 3D rendering, NO TEXT, NO LABELS, NO LETTERS. Aspect ratio 16:9. Save the image. Output the saved file path.";

function callCodex(prompt) {
  const r = spawnSync("codex", ["exec", "--skip-git-repo-check", `generate an image: ${prompt}. ${STYLE}`], {
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
    encoding: "utf8",
  });
  const stdout = r.stdout || "";
  const m = stdout.match(/\/Users\/jason\/\.codex\/generated_images\/[^\s]+\.png/);
  if (!m) return null;
  const png = m[0];
  if (!fs.existsSync(png)) return null;
  return png;
}

function extractScene(content) {
  return extractSectionParagraph(content, SCENE_SECTION_RE);
}

function extractMethod(content) {
  let text = extractSectionParagraph(content, METHOD_SECTION_RE);
  if (!text) {
    // fallback: TL;DR + 新想法
    const tldr = extractSectionParagraph(content, /##\s*(?:\d+\.\s*)?(?:一句话讲什么|TL;DR)[^\n]*/);
    const idea = extractSectionParagraph(content, /##\s*(?:\d+\.\s*)?(?:这篇论文的新想法|新想法)[^\n]*/);
    text = [tldr, idea].filter(Boolean).join(" ").slice(0, 400);
  }
  return text || null;
}

function makeScenePrompt(slug, title, scene) {
  // 场景图：用日常事物表达"这论文要解决的现实问题"
  return `a real-life situation that this paper addresses: ${scene.slice(0, 250)}. Show this as a metaphor with everyday objects (kitchen utensils, school items, factory tools, household scenes), not technical illustration. Single focal scene with one or two supporting elements`;
}

function makeMethodPrompt(slug, title, method) {
  // 方法图：技术 pipeline 抽象表达
  return `a pipeline or architecture diagram for "${title.split(":")[0].trim()}": ${method.slice(0, 250)}. Show this as flowing geometric shapes with arrows connecting input to output, no text or labels. Use 2-3 stages with clear directional flow`;
}

function loadAllNotes() {
  const result = [];
  for (const f of fs.readdirSync(NOTES)) {
    if (!f.endsWith(".md")) continue;
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES, f), "utf8");
    const { data, content } = matter(raw);
    if (!data.num || !data.topic) continue;
    const scene = extractScene(content);
    const method = extractMethod(content);
    result.push({ slug, num: data.num, topic: data.topic, title: data.title || slug, scene, method });
  }
  return result;
}

const notes = loadAllNotes();
console.log(`scanned ${notes.length} notes`);

let done = 0, failed = 0, skipped = 0;
const start = Date.now();
const total = notes.length;
for (const n of notes) {
  done++;
  const elapsed = Math.round((Date.now() - start) / 60000);
  const eta = done > 1 ? Math.round((Date.now() - start) / (done - 1) * (total - done + 1) / 60000) : "?";
  console.log(`\n[${done}/${total}] ${n.slug} — elapsed ${elapsed}min, ETA ${eta}min`);

  for (const kind of ["scene", "method"]) {
    const out = path.join(OUT, `${n.slug}-${kind}.webp`);
    if (fs.existsSync(out)) {
      skipped++;
      continue;
    }
    const prompt = kind === "scene"
      ? (n.scene ? makeScenePrompt(n.slug, n.title, n.scene) : null)
      : (n.method ? makeMethodPrompt(n.slug, n.title, n.method) : null);
    if (!prompt) {
      console.log(`  - ${kind}: skipped (no source paragraph)`);
      continue;
    }
    const png = callCodex(prompt);
    if (!png) {
      console.error(`  - ${kind}: FAIL`);
      failed++;
      continue;
    }
    try {
      execSync(`cwebp -q 85 -m 6 "${png}" -o "${out}"`, { stdio: "pipe" });
      const out800 = path.join(OUT, `${n.slug}-${kind}-800.webp`);
      execSync(`cwebp -q 80 -m 6 -resize 800 0 "${png}" -o "${out800}"`, { stdio: "pipe" });
      const sz = Math.round(fs.statSync(out).size / 1024);
      console.log(`  - ${kind}: OK ${sz}KB`);
    } catch (e) {
      console.error(`  - ${kind}: cwebp FAIL`);
      failed++;
    }
  }
}
console.log(`\n=== done: ${done}, failed: ${failed}, skipped: ${skipped} ===`);
