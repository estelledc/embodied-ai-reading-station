// 内容发现与加载：topics.json、notes/*.md frontmatter 扫描、tag 推断、guide 章节发现。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NOTES_DIR, GUIDE_DIR } from "./config.mjs";
import {
  extractTLDR, countWords, readingTime,
  rewriteImagePaths, rewriteGuideLinks, stripFirstH1,
} from "./markdown.mjs";

// --- topics + papers loaded dynamically from notes/ -------------------------
const TOPICS_JSON = path.join(NOTES_DIR, "topics.json");
export const TOPIC_ORDER = JSON.parse(fs.readFileSync(TOPICS_JSON, "utf8")).topics;
export const TOPIC_BY_ID = new Map(TOPIC_ORDER.map(t => [t.id, t]));

// 自动发现：扫 notes/*.md 的 frontmatter，按 num 排序生成 PAPERS
// 缓存：discoverPapers 已经读了文件，loadNotes 不要再读一次
const NOTE_CACHE = new Map(); // slug -> { raw, data, content }

export function discoverPapers() {
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith(".md"));
  const papers = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES_DIR, f), "utf8");
    const parsed = matter(raw);
    NOTE_CACHE.set(slug, { raw, data: parsed.data, content: parsed.content });
    const { data } = parsed;
    if (!data.num || !data.topic) continue;
    const t = TOPIC_BY_ID.get(data.topic);
    if (!t) {
      console.warn(`unknown topic '${data.topic}' for ${slug}, skip`);
      continue;
    }
    papers.push({
      slug,
      num: Number(data.num),
      title: data.title || slug,
      topic: data.topic,
      topicLabel: t.label,
      topicRoman: t.roman,
      era: data.era || "classic",
    });
  }
  papers.sort((a, b) => a.num - b.num);
  return papers;
}

export const PAPERS = discoverPapers();

// 动态计数（文案插值用，避免内容增长后数字漂移）
export const PAPER_COUNT = PAPERS.length;
export const TOPIC_COUNT = TOPIC_ORDER.length;
export const GUIDE_CHAPTER_COUNT = fs.existsSync(GUIDE_DIR)
  ? fs.readdirSync(GUIDE_DIR).filter(f => f.startsWith("ch") && f.endsWith(".md")).length
  : 0;

// --- era 排序 -----------------------------------------------------------------
// era 升序：祖师爷 founder → 经典 classic → 前沿 frontier；未知 era 按 classic 处理。
const ERA_RANK = { founder: 0, classic: 1, frontier: 2 };

// era 比较器工厂。各视图共用同一套 era 主序，真实差异只有两个维度，用参数表达：
// - pinTask: true 时 num ≤ 13 的原始任务论文整体置顶（组内按 num 升序）
// - tiebreak: 同 era 内次级排序，"num"（编号升序）或 "year"（年份升序，缺年份排最后）
export function eraComparator({ pinTask = false, tiebreak = "num" } = {}) {
  const tie = tiebreak === "year"
    ? (a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999)
    : (a, b) => a.num - b.num;
  return (a, b) => {
    if (pinTask) {
      const aPin = a.num <= 13 ? 0 : 1;
      const bPin = b.num <= 13 ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      if (aPin === 0) return a.num - b.num;
    }
    const ea = ERA_RANK[a.era] ?? 1;
    const eb = ERA_RANK[b.era] ?? 1;
    if (ea !== eb) return ea - eb;
    return tie(a, b);
  };
}

// --- tags -------------------------------------------------------------------
// 自动从笔记 title + body 关键词推断 tag（每篇 0-5 个）
const TAG_RULES = [
  { tag: "diffusion", keywords: /\b(diffusion|denoising|noise schedul|ddpm|ddim|score-based)\b/i },
  { tag: "flow-matching", keywords: /flow.?matching|consistency model|rectified flow/i },
  { tag: "transformer", keywords: /\btransformer\b|self.?attention|multi.?head/i },
  { tag: "mamba-ssm", keywords: /\bmamba\b|state.?space model|\bSSM\b/i },
  { tag: "3D", keywords: /point cloud|3D point|voxel|nerf|3D shape|mesh|sapien|3d-vla|3d-diffusion/i },
  { tag: "language", keywords: /\bLLM\b|language model|natural language|instruct|GPT|PaLM|LLaMA/i },
  { tag: "vision", keywords: /\bvisual\b|image encoder|RGB|camera|ViT|CLIP|SigLIP/i },
  { tag: "tactile", keywords: /tactile|haptic|GelSight|DIGIT|sparsh/i },
  { tag: "audio-speech", keywords: /\baudio\b|speech|ASR|whisper|microphone|acoustic/i },
  { tag: "RF-radar", keywords: /\bradar\b|mmWave|WiFi|RF |electromagnetic|panoradar|millimap/i },
  { tag: "manipulation", keywords: /manipulat|grasp|pick.?and.?place|gripper|dexterous/i },
  { tag: "locomotion", keywords: /locomotion|legged|walk|gait|quadruped|humanoid/i },
  { tag: "navigation", keywords: /navigat|exploration|SLAM|mapping/i },
  { tag: "RL", keywords: /reinforcement learning|\bRL\b|policy gradient|Q-learning/i },
  { tag: "imitation", keywords: /imitation|behavior\s*clon|behavioral\s*clon|teleoperat|demonstration|模仿/i },
  { tag: "world-model", keywords: /world model|latent dynamics|imagined rollout/i },
  { tag: "VLA", keywords: /vision.?language.?action|\bVLA\b/i },
  { tag: "VLM", keywords: /vision.?language model|\bVLM\b|multimodal LLM/i },
  { tag: "sim2real", keywords: /sim.?to.?real|domain randomi|sim2real/i },
  { tag: "dataset", keywords: /\bdataset\b|benchmark|trajector|episodes/i },
  { tag: "open-source", keywords: /open.?source|publicly released|github\.com/i },
];

export function inferTags(note) {
  const text = (note.title + " " + (note.body || "").slice(0, 4000)).toLowerCase();
  const tags = [];
  for (const r of TAG_RULES) {
    if (r.keywords.test(text)) tags.push(r.tag);
  }
  return tags.slice(0, 6); // 最多 6 个
}

// --- guide pages (22-chapter reading guide) ---------------------------------
// 返回形状恒为 { chapters: [], readmeRaw: "" }，无 guide 目录时 chapters 为空数组
export function discoverGuide() {
  if (!fs.existsSync(GUIDE_DIR)) return { chapters: [], readmeRaw: "" };
  const readmePath = path.join(GUIDE_DIR, "README.md");
  const readmeRaw = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, "utf8") : "";
  const files = fs.readdirSync(GUIDE_DIR).filter(f => f.startsWith("ch") && f.endsWith(".md"));
  files.sort((a, b) => {
    const na = parseInt(a.replace(/^ch0?/, ""), 10);
    const nb = parseInt(b.replace(/^ch0?/, ""), 10);
    return na - nb;
  });
  const chapters = files.map(f => {
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(GUIDE_DIR, f), "utf8");
    // Extract title from first H1
    const h1Match = raw.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1] : slug;
    // Extract chapter number
    const numMatch = slug.match(/^ch(\d+)/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;
    return { slug, filename: f, title, num, raw };
  });
  return { chapters, readmeRaw };
}

// --- main -------------------------------------------------------------------
export function loadNotes() {
  const notes = [];
  for (const p of PAPERS) {
    // 复用 discoverPapers 缓存的 raw + parsed
    const cached = NOTE_CACHE.get(p.slug);
    if (!cached) {
      notes.push({ ...p, status: "missing", body: "# 笔记尚未生成\n\n请稍后回来看。" });
      continue;
    }
    const { data, content } = cached;
    const stripped = stripFirstH1(rewriteGuideLinks(rewriteImagePaths(content, p.slug)));
    const wc = countWords(stripped);
    notes.push({
      ...p,
      title: data.title || p.title,
      difficulty: data.difficulty || "",
      status: data.status || "auto-summary",
      sourcePath: data["来源"] || data.source || "",
      dek: data.dek || "",
      era: data.era || "classic",
      year: data.year || null,
      venue: data.venue || "",
      tags: [], // 待 build 后注入

      tldr: extractTLDR(content),
      wordCount: wc,
      readingTime: readingTime(wc),
      body: stripped,
    });
  }
  return notes;
}
