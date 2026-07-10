// marked 配置与自定义 renderer + markdown 文本工具函数。

import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { SCENE_SECTION_RE, METHOD_SECTION_RE } from "../figure-section-utils.mjs";
import { SITE, BASE, url } from "./config.mjs";

// --- markdown renderer ------------------------------------------------------
const renderer = new marked.Renderer();
let figureCounter = 0;

// Marked 已会把 token text/title 中的危险字符编码成实体。这里保留已有实体，
// 同时补齐直接调用 renderer 时的属性/文本转义，避免双重编码。
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);)/gi, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const URL_BASE = "https://same-site.invalid/";
const URL_CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;
const HTML_ENTITY_RE = /&(?:#\d+|#x[\da-f]+|[a-z][\da-z]+);/i;

function allowedMarkdownUrl(raw, { allowMailto = true } = {}) {
  if (typeof raw !== "string") return null;
  const candidate = raw.trim();
  if (URL_CONTROL_CHAR_RE.test(candidate) || HTML_ENTITY_RE.test(candidate)) return null;
  if (candidate.startsWith("//") || candidate.startsWith("\\\\")) return null;

  let parsed;
  try { parsed = new URL(candidate, URL_BASE); }
  catch { return null; }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(candidate);
  if (!hasScheme) {
    return parsed.origin === new URL(URL_BASE).origin ? candidate : null;
  }
  if (parsed.protocol === "http:" || parsed.protocol === "https:") return candidate;
  if (allowMailto && parsed.protocol === "mailto:") return candidate;
  return null;
}

renderer.image = (token) => {
  // marked v14 token: { href, title, text }
  const { href, title, text } = token;
  const safeHref = allowedMarkdownUrl(href, { allowMailto: false });
  const safeText = escapeHtml(text || "");
  if (safeHref === null) return safeText;
  figureCounter++;
  const roman = ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii"][figureCounter - 1] ?? String(figureCounter);
  // codex 生图全部 16:9，1672×941。给 inline / cards 默认尺寸避免 CLS
  let dims = "";
  if (safeHref.includes("/images/inline/") || safeHref.includes("/images/cards/") || safeHref.includes("/images/topics/")) {
    dims = ` width="1672" height="941"`;
  }
  // lazy 加载 + decoding async（首屏图片可能例外，但 inline figures 都在首屏下方）
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  const caption = safeText || escapeHtml(title || "");
  return `<figure><img src="${escapeHtml(safeHref)}" alt="${safeText}"${titleAttr}${dims} loading="lazy" decoding="async"/><figcaption><span class="plate">Plate Nº ${roman.toUpperCase()}</span>${caption}</figcaption></figure>`;
};

// 给 H2/H3 加 id（让 outline 能锚点跳转）
export function slugify(s) {
  return s.toLowerCase()
    .replace(/[^一-龥\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50) || "section";
}
const headingIds = new Map();
renderer.heading = function (token) {
  const { tokens, depth, text } = token;
  // marked v14: this.parser.parseInline 渲染 inline tokens（含 bold/code/link）
  const inner = (tokens && this && this.parser)
    ? this.parser.parseInline(tokens)
    : text;
  if (depth === 2 || depth === 3) {
    let base = slugify(text);
    let id = base;
    let n = 2;
    while (headingIds.has(id)) id = `${base}-${n++}`;
    headingIds.set(id, true);
    return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
  }
  return `<h${depth}>${inner}</h${depth}>\n`;
};

// 段落只含一张图时不包 <p>（避免 <figure> 在 <p> 内被浏览器 split 出空 p）
renderer.paragraph = function (token) {
  const tokens = token.tokens || [];
  // 只有一个 image token，或恰好是单个 image 加可忽略空白
  const meaningful = tokens.filter(t => !(t.type === "text" && /^\s*$/.test(t.text || "")));
  if (meaningful.length === 1 && meaningful[0].type === "image") {
    return (this && this.parser ? this.parser.parseInline(tokens) : "") + "\n";
  }
  const inner = this && this.parser ? this.parser.parseInline(tokens) : (token.text || "");
  return `<p>${inner}</p>\n`;
};

// 内部绝对链接 (/papers/x/ /topics/y/ 等) 自动加 BASE prefix；外链不动
renderer.link = function (token) {
  const { href, title, tokens } = token;
  const inner = (tokens && this && this.parser) ? this.parser.parseInline(tokens) : (token.text || href);
  const safeHref = allowedMarkdownUrl(href);
  if (safeHref === null) return inner;
  let finalHref = safeHref;
  if (safeHref.startsWith("/") && !safeHref.startsWith("//")) {
    finalHref = BASE + safeHref;
  }
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  return `<a href="${escapeHtml(finalHref)}"${titleAttr}>${inner}</a>`;
};

marked.use({ renderer, gfm: true, breaks: false });

// 页面级可变渲染状态（figure 编号、heading id 去重表）的唯一重置入口。
// 每次渲染一个新页面的 markdown 前调用，避免跨页面串号。
export function resetPageState() {
  figureCounter = 0;
  headingIds.clear();
}

// --- inline figures ---------------------------------------------------------
export function injectInlineFigures(slug, body, paperTitle = "") {
  const inlineDir = path.join(SITE, "src", "images", "inline");
  const sceneImg = path.join(inlineDir, `${slug}-scene.webp`);
  const methodImg = path.join(inlineDir, `${slug}-method.webp`);

  // 用 paper title prefix 让 alt 更具体（屏幕阅读器友好）
  const head = paperTitle ? paperTitle.split(":")[0].trim() : slug;
  let result = body;
  // 在「这是个什么场景」H2 段后插场景图（支持编号标题如 ## 2. 场景）
  if (fs.existsSync(sceneImg)) {
    const sceneMd = `\n\n![${head} — 场景示意：这论文要解决的现实问题](${url(`/images/inline/${slug}-scene.webp`)})\n`;
    const sceneRe = new RegExp(`(${SCENE_SECTION_RE.source}[^\\n]*\\n[\\s\\S]*?)(?=\\n## )`);
    result = result.replace(sceneRe, (m) => m + sceneMd);
  }
  // 在「方法」H2 段后插方法图（支持 ## 方法 / ## 5. 方法 等）
  if (fs.existsSync(methodImg)) {
    const methodMd = `\n\n![${head} — 方法示意：核心 pipeline](${url(`/images/inline/${slug}-method.webp`)})\n`;
    const methodRe = new RegExp(`(${METHOD_SECTION_RE.source}[^\\n]*\\n[\\s\\S]*?)(?=\\n## )`);
    result = result.replace(methodRe, (m) => m + methodMd);
  }
  return result;
}

// --- markdown text utils ----------------------------------------------------
export function extractTLDR(md) {
  // 1) 优先：## 一句话讲什么 / ## TL;DR / ## 一句话 / ## 一句话讲清 后的第一段实质内容
  const headingPatterns = [
    /##\s*(?:一句话讲什么|一句话|一句话讲清|一句话总结|TL;DR|TLDR|tl;dr)[^\n]*\n+([\s\S]*?)(?=\n##|$)/,
  ];
  for (const re of headingPatterns) {
    const m = md.match(re);
    if (m) {
      // 取第一个非空、非引用、非列表标记的行/段
      const text = m[1]
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('>') && !l.startsWith('*所以') && !l.startsWith('---'))
        .map(l => l.replace(/^[-*]\s*/, '').replace(/\*\*/g, '').replace(/`/g, ''))
        .filter(l => !/^[（(].+?[）)]$/.test(l)) // 整行括号注释
        .join(' ');
      const cleaned = text.replace(/^[（(].+?[）)]\s*/, '').trim();
      if (cleaned) return cleaned.slice(0, 140);
    }
  }
  // 2) 兜底：第一个非引用非标题的实质段
  const lines = md.split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('```') && !l.startsWith('---') && !l.startsWith('*'))
    .map(l => l.replace(/^[-*]\s*/, '').replace(/\*\*/g, ''));
  return (lines[0] || '').trim().slice(0, 140);
}

export function countWords(md) {
  // 中文按字数算，英文按词算
  const stripped = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_\-=|]/g, " ");
  const cn = (stripped.match(/[一-龥]/g) || []).length;
  const en = (stripped.match(/[a-zA-Z]+/g) || []).length;
  return cn + en;
}

export function readingTime(wc) {
  // 中文 350 字/分钟，英文已折算同一单位
  return Math.max(1, Math.round(wc / 350));
}

export function extractOutline(md) {
  // 扫所有 H2，提取标题 + slug，用于右栏 outline
  const lines = md.split("\n");
  const out = [];
  const seen = new Map();
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (!m) continue;
    const text = m[1].replace(/`/g, "").trim();
    let base = slugify(text);
    let id = base;
    let n = 2;
    while (seen.has(id)) id = `${base}-${n++}`;
    seen.set(id, true);
    out.push({ id, text });
  }
  return out;
}

export function rewriteImagePaths(md, slug) {
  // normalize relative paths so build copies them under /assets/<slug>/
  return md.replace(/!\[([^\]]*)\]\((?:\.\.\/)?papers\/[^/]+\/images\/([^)]+)\)/g,
    (_, alt, file) => `![${alt}](${url(`/assets/${slug}/${file}`)})`);
}

export function rewriteGuideLinks(md) {
  // 笔记内 [text](../guide/chXX-name.md#anchor) → [text](/guide/chXX-name/#anchor)
  // NOTE: bare absolute path (no BASE prefix) — renderer.link 会自动给 "/" 开头的 href 加 BASE
  return md.replace(/\]\((?:\.\.\/)?guide\/([\w-]+)\.md(#[^)]*)?\)/g,
    (_, name, anchor) => `](/guide/${name}/${anchor ?? ""})`);
}

export function stripFirstH1(md) {
  // remove the first H1 heading anywhere near the top (titled page already shows the H1 in note-shell)
  return md.replace(/^\s*#\s+[^\n]+\n+/, "");
}
