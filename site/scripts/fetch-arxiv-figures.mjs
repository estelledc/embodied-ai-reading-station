#!/usr/bin/env node
/**
 * Fetch 2–3 figures from ar5iv (or Nature URLs in paper.md) into papers/{slug}/images/
 * and wire references into notes. Targets primer + task papers without local images.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");
const PAPERS = path.join(ROOT, "papers");

/** PDF-only slugs → arXiv id (from paper.md / note bib) */
const SLUG_ARXIV = {
  "3d-diffusion-policy": "2403.03954",
  "anymal": "2309.16058",
  "code-as-policies": "2107.03374",
  habitat: "1904.01201",
  imagebind: "2305.05665",
  "inner-monologue": "2207.05608",
  "isaac-gym": "2108.10470",
  "rt-1": "2212.06817",
  "rt-2": "2307.15818",
  "world-models-ha": "1803.10122",
};

const TARGETS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : null;

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`download ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function resolveArxivId(slug, data, raw) {
  if (SLUG_ARXIV[slug]) return SLUG_ARXIV[slug];
  const src = data["来源"] || data.source || "";
  let m = src.match(/arxiv\.org\/abs\/([0-9.]+v?\d*)/i);
  if (m) return m[1].replace(/v\d+$/, "");
  m = raw.match(/arxiv\.org\/abs\/([0-9.]+v?\d*)/i);
  if (m) return m[1].replace(/v\d+$/, "");
  const paperMd = path.join(PAPERS, slug, "paper.md");
  if (fs.existsSync(paperMd)) {
    const pm = fs.readFileSync(paperMd, "utf8");
    m = pm.match(/arXiv:([0-9.]+)v?\d*/i);
    if (m) return m[1];
  }
  return null;
}

function extractAr5ivAssets(html, arxivId) {
  const esc = arxivId.replace(/\./g, "\\.");
  const re = new RegExp(
    `src="/html/${esc}/assets/([^"]+\\.(?:png|jpe?g|webp))"`,
    "gi",
  );
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const file = m[1];
    if (seen.has(file)) continue;
    seen.add(file);
    out.push(`https://ar5iv.labs.arxiv.org/html/${arxivId}/assets/${file}`);
  }
  return out;
}

async function fetchPdfFigures(arxivId, imgDir, max = 3) {
  const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
  const pdfPath = path.join(imgDir, "_paper.pdf");
  fs.mkdirSync(imgDir, { recursive: true });
  const sz = await download(pdfUrl, pdfPath);
  if (sz < 5000) return [];
  const wired = [];
  try {
    const py = `
import fitz, sys, os
doc = fitz.open(sys.argv[1])
out = sys.argv[2]
n = min(${max}, len(doc))
for i in range(n):
    pix = doc[i].get_pixmap(matrix=fitz.Matrix(2, 2))
    pix.save(os.path.join(out, f"img_{i:03d}.jpg"))
print(n)
`;
    const n = Number(
      execSync(`python3 -c ${JSON.stringify(py)} "${pdfPath}" "${imgDir}"`, {
        stdio: ["pipe", "pipe", "pipe"],
      }).toString().trim(),
    );
    for (let i = 0; i < n; i++) {
      wired.push({
        file: `img_${String(i).padStart(3, "0")}.jpg`,
        cap: `Figure ${i + 1}（PDF 第 ${i + 1} 页）`,
      });
    }
  } catch {
    /* pymupdf unavailable */
  }
  if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
  return wired;
}

function extractNatureImages(slug) {
  const paperMd = path.join(PAPERS, slug, "paper.md");
  if (!fs.existsSync(paperMd)) return [];
  const md = fs.readFileSync(paperMd, "utf8");
  const re = /!\[([^\]]*)\]\((\/\/media\.springernature\.com[^)]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    out.push({ caption: m[1], url: `https:${m[2]}` });
  }
  return out;
}

function toJpg(srcPath, destPath) {
  if (/\.jpe?g$/i.test(srcPath) && srcPath !== destPath) {
    fs.copyFileSync(srcPath, destPath);
    return;
  }
  execSync(
    `ffmpeg -y -loglevel error -i "${srcPath}" -q:v 2 "${destPath}"`,
    { stdio: "pipe" },
  );
}

function wireFigures(slug, figures) {
  const notePath = path.join(NOTES, `${slug}.md`);
  if (!fs.existsSync(notePath)) return false;
  let body = fs.readFileSync(notePath, "utf8");
  const fmEnd = body.indexOf("---", 4);
  const front = body.slice(0, fmEnd + 4);
  let content = body.slice(fmEnd + 4);
  content = content.replace(/\n<!-- paper-figures:begin -->[\s\S]*?<!-- paper-figures:end -->\n/g, "\n");
  const block =
    "\n<!-- paper-figures:begin -->\n" +
    figures
      .map(({ file, cap }) =>
        `\n![${cap}](../papers/${slug}/images/${file})\n\n*上图说明：${cap}（论文原图）。*\n`,
      )
      .join("") +
    "<!-- paper-figures:end -->\n";
  const methodRe = /(## (?:\d+\.\s*)?(?:它分几步做的|方法)[^\n]*\n)/;
  const keyRe = /(## (?:\d+\.\s*)?关键数字[^\n]*\n)/;
  if (methodRe.test(content)) content = content.replace(methodRe, `$1${block}`);
  else if (keyRe.test(content)) content = content.replace(keyRe, `$1${block}`);
  else return false;
  fs.writeFileSync(notePath, front + content);
  return true;
}

function listTargets() {
  const topics = JSON.parse(fs.readFileSync(path.join(NOTES, "topics.json"), "utf8"));
  const primers = new Set(topics.topics.flatMap((t) => t.primer));
  const slugs = new Set(primers);
  for (const f of fs.readdirSync(NOTES).filter((x) => x.endsWith(".md"))) {
    const { data } = matter(fs.readFileSync(path.join(NOTES, f), "utf8"));
    if (data.task === "required") slugs.add(f.replace(/\.md$/, ""));
  }
  return [...slugs].filter((slug) => {
    const imgDir = path.join(PAPERS, slug, "images");
    const n = fs.existsSync(imgDir)
      ? fs.readdirSync(imgDir).filter((x) => /\.(jpe?g|png|webp)$/i.test(x)).length
      : 0;
    return n === 0;
  });
}

async function fetchSlug(slug) {
  const notePath = path.join(NOTES, `${slug}.md`);
  if (!fs.existsSync(notePath)) {
    console.log(`SKIP ${slug}: no note`);
    return;
  }
  const raw = fs.readFileSync(notePath, "utf8");
  const { data } = matter(raw);
  const imgDir = path.join(PAPERS, slug, "images");
  const existing = fs.existsSync(imgDir)
    ? fs.readdirSync(imgDir).filter((x) => /^img_\d+\.jpe?g$/i.test(x)).length
    : 0;
  if (existing >= 2) {
    console.log(`SKIP ${slug}: already has ${existing} images`);
    return;
  }

  const wired = [];
  const nature = extractNatureImages(slug);
  if (nature.length) {
    fs.mkdirSync(imgDir, { recursive: true });
    const picks = [nature[0], nature[Math.min(2, nature.length - 1)]].filter(Boolean);
    for (let i = 0; i < picks.length; i++) {
      const tmp = path.join(imgDir, `_tmp_${i}.png`);
      const dest = path.join(imgDir, `img_${String(i).padStart(3, "0")}.jpg`);
      const sz = await download(picks[i].url, tmp);
      if (sz < 2000) continue;
      toJpg(tmp, dest);
      fs.unlinkSync(tmp);
      wired.push({ file: path.basename(dest), cap: picks[i].caption || `Figure ${i + 1}` });
    }
  } else {
    const arxivId = resolveArxivId(slug, data, raw);
    if (!arxivId) {
      console.log(`SKIP ${slug}: no arXiv id`);
      return;
    }
    const html = await fetchText(`https://ar5iv.labs.arxiv.org/html/${arxivId}`);
    const urls = extractAr5ivAssets(html, arxivId);
    fs.mkdirSync(imgDir, { recursive: true });
    if (urls.length) {
      let idx = 0;
      for (const url of urls) {
        if (wired.length >= 3) break;
        const ext = path.extname(url).slice(1) || "png";
        const tmp = path.join(imgDir, `_tmp_${idx}.${ext}`);
        const dest = path.join(imgDir, `img_${String(idx).padStart(3, "0")}.jpg`);
        try {
          const sz = await download(url, tmp);
          if (sz < 3000) {
            fs.unlinkSync(tmp);
            continue;
          }
          toJpg(tmp, dest);
          if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
          wired.push({ file: path.basename(dest), cap: `Figure ${idx + 1}（ar5iv 原图）` });
          idx++;
        } catch {
          if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
        }
      }
    }
    if (wired.length < 2) {
      const pdfFigs = await fetchPdfFigures(arxivId, imgDir, 3);
      for (const fig of pdfFigs) {
        if (wired.some((w) => w.file === fig.file)) continue;
        wired.push(fig);
        if (wired.length >= 3) break;
      }
    }
    if (!wired.length) {
      console.log(`SKIP ${slug}: no figures for ${arxivId}`);
      return;
    }
  }

  if (wired.length < 2) {
    console.log(`WARN ${slug}: only ${wired.length} images fetched`);
  }
  if (wired.length && wireFigures(slug, wired)) {
    console.log(`OK ${slug}: ${wired.length} images + wired`);
  } else if (wired.length) {
    console.log(`OK ${slug}: ${wired.length} images (wire failed)`);
  }
}

const slugs = TARGETS || listTargets();
console.log(`Fetching ${slugs.length} slugs…`);
for (const slug of slugs) {
  try {
    await fetchSlug(slug);
  } catch (e) {
    console.error(`ERR ${slug}:`, e.message);
  }
}
