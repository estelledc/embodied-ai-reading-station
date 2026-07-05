#!/usr/bin/env node
/**
 * Fill missing card thumbnails from papers img_000, inline scene, or topic hero.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");
const CARDS = path.join(ROOT, "site", "src", "images", "cards");
const INLINE = path.join(ROOT, "site", "src", "images", "inline");
const TOPICS = path.join(ROOT, "site", "src", "images", "topics");

function cardSrc(slug, topic) {
  const paperImg = path.join(PAPERS, slug, "images", "img_000.jpg");
  if (fs.existsSync(paperImg)) return paperImg;
  const inline = path.join(INLINE, `${slug}-scene.webp`);
  if (fs.existsSync(inline)) return inline;
  const topicImg = path.join(TOPICS, `${topic}.webp`);
  if (topic && fs.existsSync(topicImg)) return topicImg;
  return null;
}

function toCardWebp(src, dst) {
  fs.mkdirSync(CARDS, { recursive: true });
  execSync(`ffmpeg -y -i "${src}" -vf "scale=640:-2" -q:v 4 "${dst}"`, { stdio: "pipe" });
}

let filled = 0;
for (const f of fs.readdirSync(NOTES).filter((x) => x.endsWith(".md"))) {
  const slug = f.replace(/\.md$/, "");
  const dst = path.join(CARDS, `${slug}.webp`);
  if (fs.existsSync(dst)) continue;
  const { data } = matter(fs.readFileSync(path.join(NOTES, f), "utf8"));
  const src = cardSrc(slug, data.topic || "");
  if (!src) {
    console.warn(`SKIP card ${slug}`);
    continue;
  }
  try {
    toCardWebp(src, dst);
    filled++;
    console.log(`OK card ${slug}`);
  } catch (e) {
    console.error(`FAIL card ${slug}:`, e.message);
  }
}
console.log(`\n=== filled ${filled} card webp ===`);
