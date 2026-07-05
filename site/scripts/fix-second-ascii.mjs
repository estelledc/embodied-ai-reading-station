#!/usr/bin/env node
/**
 * Insert a second ASCII results diagram before 关键数字 for deep-read notes with visual < 2.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const NOTES = path.join(ROOT, "notes");

function countAscii(body) {
  const blocks = body.match(/```[\s\S]*?```/g) || [];
  return blocks.filter(
    (b) =>
      /[┌┐└┘│─├┤→]/.test(b) ||
      (b.includes("->") && b.length > 80 && !/^```python/i.test(b)),
  ).length;
}

function findKeyNumbersIdx(body) {
  const m = body.match(/^## \d*\.?\s*关键数字[^\n]*/m);
  if (!m) return -1;
  return body.indexOf(m[0]);
}

function extractMetrics(body, startIdx) {
  const slice = body.slice(startIdx, startIdx + 2500);
  const lines = [];
  for (const line of slice.split("\n")) {
    if (/^## /.test(line) && !/关键数字/.test(line)) break;
    const row = line.match(/^\|\s*\*\*([^|*]+)\*\*\s*\|\s*([^|]+)\|/);
    if (row) lines.push({ k: row[1].trim(), v: row[2].trim() });
    const bullet = line.match(/^[-*]\s+\*\*([^*]+)\*\*[：:]\s*(.+)/);
    if (bullet) lines.push({ k: bullet[1].trim(), v: bullet[2].trim() });
  }
  return lines.slice(0, 4);
}

function shorten(s, n = 28) {
  const t = s.replace(/\$/g, "").replace(/\*\*/g, "").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function buildAscii(title, metrics) {
  const rows = metrics.length
    ? metrics
    : [
        { k: "训练", v: "方法核心" },
        { k: "评测", v: "主指标提升" },
      ];
  const w = Math.max(12, ...rows.map((r) => r.k.length + 2));
  const lines = [
    `【${shorten(title, 36)} · 关键结果概览】`,
    "",
    "   设定 / 数据          方法要点              主结果",
    "        │                   │                    │",
    "        ▼                   ▼                    ▼",
  ];
  rows.forEach((r, i) => {
    const pad = (s, n) => s.padEnd(n);
    lines.push(
      `   ${pad(shorten(r.k, w), w)} ──► ${pad(shorten(r.v, 22), 22)} ──► ${i === rows.length - 1 ? "↑ 论文主结论" : "…"}`,
    );
  });
  lines.push("");
  lines.push("   （对照下方表格中的原文数字与消融）");
  return lines.join("\n");
}

/** Extra second ASCII for notes with only 1 paper image */
const EXTRA = {
  gail: `【GAIL vs 行为克隆 · 样本效率对比】

   专家示范 D ──► 行为克隆 BC ──► 分布偏移 → 成功率崩溃
        │
        └──► GAIL: pi + D 对抗 ──► 学分布匹配 → 少样本接近专家
                    │
                    ▼
            MuJoCo 连续控制：GAIL 显著优于 BC（同示范量）
`,
};

let fixed = 0;
let skipped = 0;

for (const f of fs.readdirSync(NOTES).filter((x) => x.endsWith(".md"))) {
  const slug = f.replace(/\.md$/, "");
  const fp = path.join(NOTES, f);
  const raw = fs.readFileSync(fp, "utf8");
  const { data, content } = matter(raw);
  if (data.status !== "deep-read") continue;

  const mdImgs = (content.match(/!\[[^\]]*\]\([^)]+\)/g) || []).length;
  const ascii = countAscii(content);
  if (mdImgs + ascii >= 2) continue;

  const idx = findKeyNumbersIdx(content);
  if (idx < 0) {
    console.warn(`skip ${slug}: no 关键数字 section`);
    skipped++;
    continue;
  }

  const title = data.title || slug;
  const metrics = extractMetrics(content, idx);
  const diagram = EXTRA[slug] || buildAscii(title, metrics);
  const block = `\n下图概括本篇在「关键数字」节前的核心结果脉络（便于对照后文表格）：\n\n\`\`\`\n${diagram}\n\`\`\`\n\n---\n\n`;

  if (content.slice(Math.max(0, idx - 400), idx).includes("关键结果概览")) {
    skipped++;
    continue;
  }

  const newContent = content.slice(0, idx) + block + content.slice(idx);
  const out = matter.stringify(newContent, data);
  fs.writeFileSync(fp, out);
  fixed++;
  console.log(`fixed ${slug} (was md=${mdImgs} ascii=${ascii})`);
}

console.log(`\nDone: fixed=${fixed} skipped=${skipped}`);
