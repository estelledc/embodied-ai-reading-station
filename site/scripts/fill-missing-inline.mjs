#!/usr/bin/env node
/**
 * Fill missing inline scene/method webp from papers/{slug}/images/ (Cloud fallback when codex unavailable).
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
const INLINE = path.join(ROOT, "site", "src", "images", "inline");
const TOPICS = path.join(ROOT, "site", "src", "images", "topics");
const HERO = path.join(ROOT, "site", "src", "images", "hero.webp");

function firstPaperImage(slug) {
  const dir = path.join(PAPERS, slug, "images");
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  return files[0] ? path.join(dir, files[0]) : null;
}

function toWebp(src, dst, w = 1672) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  execSync(
    `ffmpeg -y -i "${src}" -vf "scale='min(${w},iw)':-2" -q:v 4 "${dst}"`,
    { stdio: "pipe" },
  );
  const dst800 = dst.replace(/\.webp$/, "-800.webp");
  execSync(
    `ffmpeg -y -i "${src}" -vf "scale=800:-2" -q:v 5 "${dst800}"`,
    { stdio: "pipe" },
  );
}

function fallbackSrc(slug, topic) {
  return (
    firstPaperImage(slug) ||
    (topic && fs.existsSync(path.join(TOPICS, `${topic}.webp`))
      ? path.join(TOPICS, `${topic}.webp`)
      : null) ||
    (fs.existsSync(HERO) ? HERO : null)
  );
}

function loadNotes() {
  return fs
    .readdirSync(NOTES)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const slug = f.replace(/\.md$/, "");
      const { data } = matter(fs.readFileSync(path.join(NOTES, f), "utf8"));
      return { slug, topic: data.topic || "" };
    });
}

let filled = 0;
for (const { slug, topic } of loadNotes()) {
  for (const kind of ["scene", "method"]) {
    const out = path.join(INLINE, `${slug}-${kind}.webp`);
    if (fs.existsSync(out)) continue;
    const src = fallbackSrc(slug, topic);
    if (!src) {
      console.warn(`SKIP ${slug}-${kind}: no source`);
      continue;
    }
    try {
      toWebp(src, out);
      filled++;
      console.log(`OK ${slug}-${kind} <- ${path.basename(src)}`);
    } catch (e) {
      console.error(`FAIL ${slug}-${kind}:`, e.message);
    }
  }
}
console.log(`\n=== filled ${filled} missing inline webp ===`);
