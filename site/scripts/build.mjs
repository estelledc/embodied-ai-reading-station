#!/usr/bin/env node
// Build the embodied-ai reading station: markdown notes → atelier-zero styled HTML.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import matter from "gray-matter";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(__dirname, "..");
const ROOT = path.resolve(SITE, "..");
const NOTES_DIR = path.join(ROOT, "notes");
const PAPERS_DIR = path.join(ROOT, "papers");
const DIST = path.join(SITE, "dist");

// Base path for GitHub Pages project sites (e.g. estelledc.github.io/<REPO>/).
// Override with SITE_BASE="" for root-domain deploys, or any prefix.
// Default empty in dev (npm run serve), filled by GitHub Actions to "/embodied-ai-reading-station".
const BASE = (process.env.SITE_BASE ?? "").replace(/\/$/, "");
const url = (p) => BASE + (p.startsWith("/") ? p : `/${p}`);

// --- topics + papers loaded dynamically from notes/ -------------------------
const TOPICS_JSON = path.join(NOTES_DIR, "topics.json");
const TOPIC_ORDER = JSON.parse(fs.readFileSync(TOPICS_JSON, "utf8")).topics;
const TOPIC_BY_ID = new Map(TOPIC_ORDER.map(t => [t.id, t]));

// 自动发现：扫 notes/*.md 的 frontmatter，按 num 排序生成 PAPERS
function discoverPapers() {
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith(".md"));
  const papers = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(NOTES_DIR, f), "utf8");
    const { data } = matter(raw);
    if (!data.num || !data.topic) continue; // 没补全的跳过
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

const PAPERS = discoverPapers();

// --- page hero helper -------------------------------------------------------
function pageHeroHtml(slug, alt) {
  const SITE_DIR = path.resolve(__dirname, "..");
  const heroPath = path.join(SITE_DIR, "src", "images", "pages", `${slug}.webp`);
  if (!fs.existsSync(heroPath)) return "";
  return `<figure class="page-hero">
    <picture>
      <source type="image/webp" srcset="${url(`/images/pages/${slug}-800.webp`)} 800w, ${url(`/images/pages/${slug}.webp`)} 1672w" sizes="(max-width: 900px) 100vw, 1200px">
      <img src="${url(`/images/pages/${slug}.webp`)}" alt="${alt}" loading="lazy" width="1672" height="941">
    </picture>
  </figure>`;
}

// --- helpers ----------------------------------------------------------------
function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }

function copy(src, dst) {
  if (!fs.existsSync(src)) return;
  ensure(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  ensure(dst);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function read(p) { return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; }

function write(p, content) { ensure(path.dirname(p)); fs.writeFileSync(p, content); }

// --- markdown renderer ------------------------------------------------------
const renderer = new marked.Renderer();
let figureCounter = 0;
renderer.image = (token) => {
  // marked v14 token: { href, title, text }
  const { href, title, text } = token;
  figureCounter++;
  const roman = ["i","ii","iii","iv","v","vi","vii","viii","ix","x","xi","xii"][figureCounter - 1] ?? String(figureCounter);
  // codex 生图全部 16:9，1672×941。给 inline / cards 默认尺寸避免 CLS
  let dims = "";
  if (href && (href.includes("/images/inline/") || href.includes("/images/cards/") || href.includes("/images/topics/"))) {
    dims = ` width="1672" height="941"`;
  }
  // lazy 加载 + decoding async（首屏图片可能例外，但 inline figures 都在首屏下方）
  return `<figure><img src="${href}" alt="${text || ""}"${title ? ` title="${title}"` : ""}${dims} loading="lazy" decoding="async"/><figcaption><span class="plate">Plate Nº ${roman.toUpperCase()}</span>${text || title || ""}</figcaption></figure>`;
};

// 给 H2/H3 加 id（让 outline 能锚点跳转）
function slugify(s) {
  return s.toLowerCase()
    .replace(/[^一-龥\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 50) || "section";
}
const headingIds = new Map();
renderer.heading = (token) => {
  const { tokens, depth, text } = token;
  const inner = tokens ? this?.parser?.parseInline?.(tokens) ?? text : text;
  if (depth === 2 || depth === 3) {
    let base = slugify(text);
    let id = base;
    let n = 2;
    while (headingIds.has(id)) id = `${base}-${n++}`;
    headingIds.set(id, true);
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  }
  return `<h${depth}>${text}</h${depth}>\n`;
};

marked.use({ renderer, gfm: true, breaks: false });

// --- layout templates -------------------------------------------------------
function masthead(active) {
  // 主导航：4 项关键入口
  const primaryItems = [
    { href: url("/"), label: "Index", id: "index" },
    { href: url("/topics/"), label: "Topics", id: "topics" },
    { href: url("/learn/"), label: "Learn", id: "learn" },
    { href: url("/issues/"), label: "Issues", id: "issues" },
  ];
  // 视图（折叠）
  const viewItems = [
    { href: url("/timeline/"), label: "Timeline", id: "timeline" },
    { href: url("/eras/founder/"), label: "Eras", id: "eras" },
    { href: url("/lists/"), label: "Lists", id: "lists" },
    { href: url("/discover/"), label: "Discover", id: "discover" },
    { href: url("/cheatsheet/"), label: "Cheatsheet", id: "cheatsheet" },
    { href: url("/syllabus/"), label: "Syllabus", id: "syllabus" },
    { href: url("/changelog/"), label: "Changelog", id: "changelog" },
    { href: url("/site-map/"), label: "Site map", id: "sitemap" },
    { href: url("/compare/"), label: "Compare", id: "compare" },
    { href: url("/graph/"), label: "Graph", id: "graph" },
    { href: url("/heatmap/"), label: "Heatmap", id: "heatmap" },
    { href: url("/stats/"), label: "Stats", id: "stats" },
    { href: url("/venues/"), label: "Venues", id: "venues" },
    { href: url("/tags/"), label: "Tags", id: "tags" },
    { href: url("/glossary/"), label: "Glossary", id: "glossary" },
    { href: url("/deck/"), label: "Deck", id: "deck" },
    { href: url("/about/"), label: "About", id: "about" },
  ];
  const allItems = [...primaryItems, ...viewItems];
  // 当前 active 是否在折叠区，决定 More 是否高亮
  const moreActive = viewItems.some(v => v.id === active);
  return `<header class="masthead">
    <div><a class="jx-return-to-hub" href="https://estelledc.github.io/" rel="home">回 Jason 主站</a><span class="mast-divider">·</span><span class="star">★</span><a href="${url("/")}">Embodied AI Reading Station</a></div>
    <nav aria-label="主导航">${primaryItems.map(i => `<a href="${i.href}"${i.id === active ? ' style="color:var(--coral)" aria-current="page"' : ""}>${i.label}</a>`).join("")}
      <details class="more-nav"${moreActive ? " open" : ""}>
        <summary${moreActive ? ' style="color:var(--coral)"' : ""} aria-label="更多导航">More ▾</summary>
        <div class="more-nav-panel">
          ${viewItems.map(i => `<a href="${i.href}"${i.id === active ? ' style="color:var(--coral)" aria-current="page"' : ""}>${i.label}</a>`).join("")}
        </div>
      </details>
    </nav>
    <button class="search-trigger" type="button" aria-label="搜索 (按 / 唤起)">
      <span class="search-icon">⌕</span><span class="search-hint">/</span>
    </button>
    <button class="kb-trigger" type="button" aria-label="键盘快捷键 (按 ? 唤起)" onclick="document.dispatchEvent(new KeyboardEvent('keydown', {key: '?'}))">
      <span class="search-hint">?</span>
    </button>
  </header>
  <dialog class="search-dialog" aria-label="站内搜索">
    <form method="dialog" class="search-close-form"><button class="search-close" aria-label="关闭">×</button></form>
    <div class="search-container" data-base="${BASE}"></div>
    <div class="search-history" hidden></div>
    <div class="search-shortcuts">
      <div class="ss-eyebrow">没主意？快捷入口</div>
      <div class="ss-grid">
        <a href="${url("/learn/path/")}">📖 30 天路径</a>
        <a href="${url("/learn/faq/")}">❓ FAQ</a>
        <a href="${url("/lists/")}">📚 阅读包</a>
        <a href="${url("/random/")}">🎲 随机一篇</a>
        <a href="${url("/topics/")}">🏷 主题</a>
        <a href="${url("/glossary/")}">📔 术语</a>
        <a href="${url("/timeline/")}">📅 时间线</a>
        <a href="${url("/graph/")}">🔗 关系图</a>
      </div>
    </div>
  </dialog>`;
}

// active page id → 3 个相关视图（不含自身）
const RELATED_VIEWS_MAP = {
  index: ["topics", "timeline", "issues"],
  topics: ["compare", "graph", "heatmap"],
  timeline: ["compare", "stats", "venues"],
  compare: ["topics", "timeline", "tags"],
  graph: ["heatmap", "tags", "topics"],
  heatmap: ["graph", "tags", "stats"],
  tags: ["heatmap", "glossary", "graph"],
  glossary: ["tags", "learn", "venues"],
  venues: ["stats", "compare", "timeline"],
  stats: ["timeline", "venues", "compare"],
  learn: ["glossary", "issues", "topics"],
  issues: ["learn", "stats", "timeline"],
  about: ["learn", "issues", "topics"],
  deck: ["learn", "issues", "topics"],
};
const VIEW_DESC = {
  index: { label: "Index 首页", desc: "156 篇卡片网格按主题分组" },
  topics: { label: "Topics 主题", desc: "11 个主题深度页 + primer 入门 3 篇" },
  timeline: { label: "Timeline", desc: "2011 → 2025 演化时间线" },
  compare: { label: "Compare", desc: "同主题 era 并排对比表" },
  graph: { label: "Graph", desc: "D3 力导论文关系图" },
  heatmap: { label: "Heatmap", desc: "21 × 21 标签共现矩阵" },
  tags: { label: "Tags", desc: "21 个跨主题技术标签" },
  glossary: { label: "Glossary", desc: "60 个术语字典" },
  venues: { label: "Venues", desc: "37 个会议按类别分布" },
  stats: { label: "Stats", desc: "5 维度数据看板" },
  learn: { label: "Learn", desc: "学习路径 + math primer" },
  issues: { label: "Issues", desc: "4 期编辑总结" },
  about: { label: "About", desc: "项目说明" },
  deck: { label: "Deck", desc: "LLaVA 演讲" },
};

function relatedViewsHtml(active) {
  const ids = RELATED_VIEWS_MAP[active] || [];
  if (!ids.length) return "";
  return `<aside class="related-views">
    <div class="rv-eyebrow">Related views ↘</div>
    <div class="rv-grid">
      ${ids.map(id => {
        const v = VIEW_DESC[id];
        if (!v) return "";
        return `<a class="rv-card" href="${url("/" + (id === "index" ? "" : id + "/"))}">
          <span class="rv-label">${v.label}</span>
          <span class="rv-desc">${v.desc}</span>
        </a>`;
      }).join("")}
    </div>
  </aside>`;
}

function footerHtml(active) {
  return `${relatedViewsHtml(active)}<footer class="jx-footer">
    <div class="footer-cols">
      <div class="footer-col">
        <h4>路径</h4>
        <a href="${url("/learn/path/")}">30 天路径</a>
        <a href="${url("/learn/faq/")}">FAQ</a>
        <a href="${url("/lists/")}">阅读包</a>
        <a href="${url("/random/")}">随机一篇</a>
      </div>
      <div class="footer-col">
        <h4>视图</h4>
        <a href="${url("/topics/")}">Topics</a>
        <a href="${url("/timeline/")}">Timeline</a>
        <a href="${url("/compare/")}">Compare</a>
        <a href="${url("/graph/")}">Graph</a>
        <a href="${url("/heatmap/")}">Heatmap</a>
      </div>
      <div class="footer-col">
        <h4>数据</h4>
        <a href="${url("/data/papers.json")}">papers.json</a>
        <a href="${url("/data/tags.json")}">tags.json</a>
        <a href="${url("/feed.xml")}">Atom feed</a>
        <a href="${url("/sitemap.xml")}">sitemap.xml</a>
      </div>
      <div class="footer-col">
        <h4>关于</h4>
        <a href="${url("/about/")}">About</a>
        <a href="${url("/contributors/")}">Contributors</a>
        <a href="${url("/changelog/")}">Changelog</a>
        <a href="https://github.com/estelledc/embodied-ai-reading-station">GitHub</a>
      </div>
    </div>
    <hr style="margin:1.5rem 0 1rem;border:none;border-top:1px solid var(--paper-dark)"/>
    <div class="footer-star-row">
      <a class="star-cta" href="https://github.com/estelledc/embodied-ai-reading-station" target="_blank" rel="noopener">
        <span class="star-icon">★</span>
        <span class="star-text">如果有帮到你，给个 star</span>
      </a>
      <span class="star-mood">— 没有更新订阅，没有广告，只是一个学生的笔记。</span>
    </div>
    <div class="jx-footer__colophon">
      <strong>Embodied AI Reading Station</strong>
      <span lang="en">VOL · MMXXVI</span>
    </div>
    <nav class="jx-footer__index">
      <a href="${url("/")}">index</a>
      <a href="${url("/topics/")}">topics</a>
      <a href="${url("/site-map/")}">site map</a>
      <a href="${url("/feed.xml")}" type="application/atom+xml">rss</a>
    </nav>
    <time class="jx-footer__stamp" datetime="${new Date().toISOString()}" lang="en" title="构建时间 (UTC)">${new Date().toISOString().slice(0,16).replace("T", " · ")}</time>
  </footer>`;
}

function page({ title, body, active, extraHead = "", ogTitle = null, ogDescription = null, ogImage = null, ogUrl = null, jsonLd = null }) {
  const SITE_URL = "https://estelledc.github.io/embodied-ai-reading-station";
  const _ogTitle = ogTitle || title;
  const _ogDesc = ogDescription || "156 篇具身智能论文，用零基础也能读懂的中文重写。从 CLIP 到 π0，11 主题全景。";
  const _ogImg = ogImage || `${SITE_URL}/images/hero.webp`;
  const _ogUrl = ogUrl || SITE_URL + "/";
  const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${escAttr(_ogDesc)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escAttr(_ogTitle)}">
  <meta property="og:description" content="${escAttr(_ogDesc)}">
  <meta property="og:image" content="${escAttr(_ogImg)}">
  <meta property="og:url" content="${escAttr(_ogUrl)}">
  <meta property="og:site_name" content="Embodied AI Reading Station">
  <meta property="og:locale" content="zh_CN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(_ogTitle)}">
  <meta name="twitter:description" content="${escAttr(_ogDesc)}">
  <meta name="twitter:image" content="${escAttr(_ogImg)}">
  <link rel="stylesheet" href="${url("/jx/tokens.css")}">
  <link rel="stylesheet" href="${url("/jx/components.css")}">
  <link rel="stylesheet" href="${url("/styles.css")}">
  <link rel="stylesheet" href="${url("/pagefind/pagefind-ui.css")}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <link rel="alternate" type="application/atom+xml" title="Embodied AI Reading — Atom feed" href="${url("/feed.xml")}">
  <link rel="icon" type="image/svg+xml" href="${url("/favicon.svg")}">
  <link rel="manifest" href="${url("/site.webmanifest")}">
  <link rel="search" type="application/opensearchdescription+xml" title="Embodied AI Reading" href="${url("/opensearch.xml")}">
  <meta name="theme-color" content="#ed6f5c">
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ""}
  <script>(function(){var m=localStorage.getItem("eaireading.theme");if(m==="dark")document.documentElement.classList.add("dark-theme");else if(m==="light")document.documentElement.classList.add("light-theme");})();</script>
  ${extraHead}
</head>
<body>
  <a class="skip-link" href="#main-content">Skip to content</a>
  ${masthead(active)}
  <div id="main-content" tabindex="-1">${body}</div>
  ${footerHtml(active)}
  <script src="${url("/pagefind/pagefind-ui.js")}" defer></script>
  <script src="${url("/search.js")}" defer></script>
  <script src="${url("/outline.js")}" defer></script>
  <script src="${url("/reading-progress.js")}" defer></script>
  <script src="${url("/quick-filter.js")}" defer></script>
  <script src="${url("/keyboard.js")}" defer></script>
  <script src="${url("/theme-toggle.js")}" defer></script>
  <script src="${url("/link-preview.js")}" defer></script>
  <script src="${url("/sw-register.js")}" defer></script>
  <script src="${url("/svg-export.js")}" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" defer onload="renderMathInElement(document.body, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });"></script>
</body>
</html>`;
}

// --- index page -------------------------------------------------------------
function buildIndex(notes, latestIssue = null) {
  const total = PAPERS.length;
  const done = notes.filter(n => n.status && n.status !== "stub" && n.status !== "missing").length;

  // 最新 3 commit
  let lastCommits = "";
  try {
    const lines = _execSync(`git -C "${ROOT}" log -3 --pretty=format:'%h|%ar|%s'`, { encoding: "utf8" }).split("\n");
    lastCommits = lines.map(l => {
      const [hash, ago, subject] = l.split("|");
      const cleanSubj = subject.replace(/^(feat|fix|docs|chore|ci|perf|refactor)[:(].*?:\s*/, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return `<li><span class="lc-ago">${ago}</span> <span class="lc-subject">${cleanSubj.slice(0, 60)}${cleanSubj.length > 60 ? "…" : ""}</span></li>`;
    }).join("");
  } catch {}

  let body = `<main class="shell">
    <span class="eyebrow">Filed under · embodied AI · 2026 · ${notes.length} papers</span>
    <div class="hero-grid">
      <div class="hero-text">
        <h1><em>${total} 篇</em>讲机器人怎么学会<em>看、想、做事</em>的论文 — 用<em>能读懂</em>的版本。</h1>
        <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:42ch">这站把 ${total} 篇顶会论文（CoRL、NeurIPS、MobiCom、SIGCOMM、ICML、ICLR、CVPR）翻译成入门读者也能跟下来的语言——任何术语第一次出现都给一句话定义和一个生活类比，方法分步骤拆解，关键数字配生活语境。</p>
      </div>
      <figure class="hero-figure">
        <picture>
          <source type="image/webp" srcset="${url("/images/hero-1200.webp")} 1200w, ${url("/images/hero.webp")} 1672w" sizes="(max-width: 900px) 100vw, 50vw">
          <img src="${url("/images/hero.webp")}" alt="A robotic hand reaching toward floating eyes, text fragments, and arrows — abstract editorial illustration of embodied AI" loading="eager" width="1672" height="941">
        </picture>
        <figcaption><span class="plate">Plate Nº 0</span>— A robotic hand reaching for vision, language, and action.</figcaption>
      </figure>
    </div>

    <a href="${url("/learn/")}" style="display:inline-flex;align-items:baseline;gap:0.6rem;margin:1.6rem 0 0;padding:0.85rem 1.4rem;background:var(--ink);color:var(--paper);text-decoration:none;font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;border:1px solid var(--ink);transition:background 0.15s">
      <span style="color:var(--coral)">→</span>
      <span>从这里开始 · 学习路径 · 术语字典 · 实战教程</span>
    </a>

    ${lastCommits ? `<aside class="last-commits">
      <span class="lc-eyebrow">Recently updated ↘</span>
      <ul>${lastCommits}</ul>
      <a class="lc-more" href="${url("/changelog/")}">完整 changelog →</a>
    </aside>` : ""}

    <div class="stats-grid">
      <div class="stat-cell"><span class="stat-num">${done}</span><span class="stat-denom"> / ${total}</span><span class="stat-label">papers noted</span></div>
      <div class="stat-cell"><span class="stat-num" data-eai-read-count>0</span><span class="stat-denom"> / ${total}</span><span class="stat-label">你已读</span></div>
      <div class="stat-cell"><span class="stat-num">${TOPIC_ORDER.length}</span><span class="stat-label">topics</span></div>
      <div class="stat-cell"><span class="stat-num">${notes.reduce((s, n) => s + (n.wordCount || 0), 0).toLocaleString()}</span><span class="stat-label">total 字</span></div>
      <div class="stat-cell"><span class="stat-num">${Math.round(notes.reduce((s, n) => s + (n.readingTime || 0), 0) / 60)}</span><span class="stat-label">小时阅读</span></div>
      <div class="stat-cell"><span class="stat-num">${(() => { const ys = notes.map(n => Number(n.year)).filter(Boolean); return Math.min(...ys) + "–" + Math.max(...ys); })()}</span><span class="stat-label">year span</span></div>
    </div>

    <aside class="daily-pick" id="eai-daily-pick" hidden>
      <div class="dp-eyebrow">Today's pick · 今日推荐</div>
      <a class="dp-card" href="#">
        <div class="dp-meta"><span class="dp-num"></span><span class="dp-topic"></span></div>
        <h3 class="dp-title"></h3>
        <p class="dp-tldr"></p>
        <div class="dp-foot"><span class="dp-difficulty"></span><span class="dp-date"></span></div>
      </a>
    </aside>

    <section class="whats-new">
      <div class="wn-eyebrow">最新 ↘ what's new</div>
      <div class="wn-grid">
        ${latestIssue ? `<a class="wn-card wn-issue" href="${url(`/issues/${latestIssue.slug.replace("issue-", "")}/`)}">
          <div class="wn-tag">Issue Nº ${latestIssue.issueNumber}</div>
          <div class="wn-title">${latestIssue.title.replace(/^Issue Nº \w+ — /, "")}</div>
          <div class="wn-tldr">${latestIssue.intro || ""}</div>
        </a>` : ""}
        ${(() => {
          const recent = [...notes]
            .filter(n => n.status !== "missing" && n.status !== "stub")
            .sort((a, b) => (b.num || 0) - (a.num || 0))
            .slice(0, 4);
          return recent.map(n => `<a class="wn-card" href="${url(`/papers/${n.slug}/`)}" data-slug="${n.slug}">
            <div class="wn-tag">${n.topicLabel}</div>
            <div class="wn-title">${n.title.split(":")[0]}</div>
            <div class="wn-tldr">${(n.tldr || "").slice(0, 70)}${(n.tldr || "").length > 70 ? "…" : ""}</div>
          </a>`).join("");
        })()}
      </div>
    </section>

    <aside class="streak-box" id="eai-streak-box" hidden>
      <div class="streak-flame">·</div>
      <div class="streak-main">
        <span class="streak-num" data-streak-days>0</span>
        <span class="streak-label">天连续阅读</span>
      </div>
      <div class="streak-detail">
        <div><span data-streak-today>0</span> <span class="dl">今日</span></div>
        <div><span data-streak-week>0</span> <span class="dl">本周</span></div>
        <div><span data-streak-month>0</span> <span class="dl">本月</span></div>
      </div>
      <span class="streak-goal" hidden></span>
      <button class="streak-export" id="eai-set-goal" type="button" title="设每日阅读目标">⚙ 目标</button>
      <button class="streak-export" id="eai-streak-export" type="button" title="导出已读清单为 markdown">↓ 导出</button>
    </aside>

    <aside class="next-pick" id="eai-next-pick" hidden>
      <div class="next-pick-eyebrow">读完上一篇了？接着这篇 →</div>
      <a class="next-pick-card" href="#">
        <div class="next-pick-meta">
          <span class="next-pick-num"></span>
          <span class="next-pick-topic"></span>
        </div>
        <h3 class="next-pick-title"></h3>
        <p class="next-pick-tldr"></p>
        <div class="next-pick-foot">
          <span class="next-pick-difficulty"></span>
          <span class="next-pick-reason"></span>
        </div>
      </a>
    </aside>
    <script id="eai-papers-data" type="application/json">${JSON.stringify(notes.map(n => ({
      slug: n.slug, num: n.num, title: n.title, topic: n.topicLabel, era: n.era || "classic",
      difficulty: (n.difficulty || "").length || 2,
      tldr: (n.tldr || "").slice(0, 120),
      url: url(`/papers/${n.slug}/`),
      year: n.year || null, venue: n.venue || "",
      wordCount: n.wordCount || 0,
    })))}</script>
    <hr/>`;

  // 快筛工具栏
  body += `<aside class="quick-filter" id="eai-quick-filter">
    <div class="qf-row">
      <span class="qf-label">主题</span>
      <button type="button" class="qf-chip qf-chip-all is-active" data-filter-type="topic" data-value="">全部</button>
      ${TOPIC_ORDER.map(t => `<button type="button" class="qf-chip" data-filter-type="topic" data-value="${t.id}">${t.roman}. ${t.label}</button>`).join("")}
    </div>
    <div class="qf-row">
      <span class="qf-label">难度</span>
      <button type="button" class="qf-chip qf-chip-all is-active" data-filter-type="difficulty" data-value="">全部</button>
      <button type="button" class="qf-chip" data-filter-type="difficulty" data-value="2">★★ 入门</button>
      <button type="button" class="qf-chip" data-filter-type="difficulty" data-value="3">★★★ 中</button>
      <button type="button" class="qf-chip" data-filter-type="difficulty" data-value="4">★★★★ 进阶</button>
    </div>
    <div class="qf-row">
      <span class="qf-label">era</span>
      <button type="button" class="qf-chip qf-chip-all is-active" data-filter-type="era" data-value="">全部</button>
      <button type="button" class="qf-chip" data-filter-type="era" data-value="founder">祖师爷</button>
      <button type="button" class="qf-chip" data-filter-type="era" data-value="classic">经典</button>
      <button type="button" class="qf-chip" data-filter-type="era" data-value="frontier">前沿</button>
    </div>
    <div class="qf-row">
      <span class="qf-label">深度</span>
      <button type="button" class="qf-chip qf-chip-all is-active" data-filter-type="status" data-value="">全部</button>
      <button type="button" class="qf-chip" data-filter-type="status" data-value="deep-read">深度精读</button>
      <button type="button" class="qf-chip" data-filter-type="status" data-value="auto-summary">auto 摘要</button>
      <button type="button" class="qf-chip" data-filter-type="status" data-value="auto-summary-light">短摘要</button>
      <span class="qf-count" id="eai-qf-count" style="margin-left:auto"></span>
    </div>
  </aside>`;

  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id);
    if (!inTopic.length) continue;
    const topicHeroPath = path.join(SITE, "src", "images", "topics", `${t.id}.webp`);
    const hasTopicHero = fs.existsSync(topicHeroPath);
    body += `<section data-topic-section="${t.id}">
      <div class="topic-row">
        <span class="topic-roman">${t.roman}</span>
        <h2>${t.label} <span style="color:var(--ink-faint);font-weight:400;font-size:0.7em;margin-left:0.5rem">${t.subtitle}</span></h2>
        <span class="count">${inTopic.length} paper${inTopic.length > 1 ? "s" : ""}</span>
      </div>
      ${hasTopicHero ? `<figure class="topic-hero">
        <picture>
          <source type="image/webp" srcset="${url(`/images/topics/${t.id}-800.webp`)} 800w, ${url(`/images/topics/${t.id}.webp`)} 1672w" sizes="(max-width: 900px) 100vw, 1200px">
          <img src="${url(`/images/topics/${t.id}.webp`)}" alt="${t.label} — ${t.subtitle}" loading="lazy" width="1672" height="941">
        </picture>
      </figure>` : ""}
      <div class="papers-grid">`;
    // 排序优先级：1) num<=13 的原始 13 篇置顶 (按 num)
    //              2) era: founder → classic → frontier
    //              3) 同 era 内按 num 升序
    const eraRank = { founder: 0, classic: 1, frontier: 2 };
    const sorted = [...inTopic].sort((a, b) => {
      const aPin = a.num <= 13 ? 0 : 1;
      const bPin = b.num <= 13 ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      if (aPin === 0) return a.num - b.num; // 原 13 篇按 num
      const ea = eraRank[a.era] ?? 1;
      const eb = eraRank[b.era] ?? 1;
      if (ea !== eb) return ea - eb;
      return a.num - b.num;
    });
    body += `<p class="era-hint">按演进顺序：祖师爷 → 现代经典 → 前沿延伸</p>`;
    for (const n of sorted) {
      const badge = makeDifficultyBadge(n.difficulty);
      const realThumb = path.join(PAPERS_DIR, n.slug, "images", "img_000.jpg");
      const cardThumb = path.join(SITE, "src", "images", "cards", `${n.slug}.webp`);
      const hasReal = fs.existsSync(realThumb);
      const hasCard = fs.existsSync(cardThumb);
      const thumbDiv = hasReal
        ? `<div class="thumb" style="background-image:url('${url(`/assets/${n.slug}/img_000.jpg`)}')"></div>`
        : hasCard
          ? `<div class="thumb" style="background-image:url('${url(`/images/cards/${n.slug}.webp`)}')"></div>`
          : `<div class="thumb thumb-placeholder"><span>${t.roman}</span></div>`;
      body += `<article class="paper-card" data-slug="${n.slug}" data-topic="${n.topic}" data-difficulty="${(n.difficulty || "").length || 2}" data-era="${n.era || "classic"}" data-status="${n.status || "auto-summary"}">
        ${thumbDiv}
        <span class="num">№ ${String(n.num).padStart(2,"0")}</span>
        <span class="status ${n.status === "stub" ? "stub" : ""}">${n.status === "stub" ? "stub" : n.status === "deep-read" ? "deep" : "auto"}</span>
        <span class="topic">${t.label}</span>
        <h3><a href="${url(`/papers/${n.slug}/`)}">${n.title}</a></h3>
        <div style="display:flex;gap:0.4rem;align-items:center;flex-wrap:wrap">
          <span class="badge ${badge.class}">${badge.label}</span>
          <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--ink-faint);letter-spacing:0.06em">${n.readingTime}min · ${n.wordCount}字</span>
        </div>
        <p>${n.tldr || ""}</p>
      </article>`;
    }
    body += `</div></section>`;
  }

  body += `</main>`;
  return page({ title: "Embodied AI Reading Station", body, active: "index" });
}

// --- topics page ------------------------------------------------------------
function buildTopics(notes) {
  const topicCount = TOPIC_ORDER.length;
  const totalPapers = notes.length;
  let body = `<main class="shell">
    <span class="eyebrow">Index by · topic</span>
    <h1><em>${topicCount} chapters</em> · ${totalPapers} papers.</h1>
    ${pageHeroHtml("topics-index", "Topic taxonomy — seven labeled doors")}`;
  const eraRank = { founder: 0, classic: 1, frontier: 2 };
  const sortInTopic = (a, b) => {
    const aPin = a.num <= 13 ? 0 : 1;
    const bPin = b.num <= 13 ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    if (aPin === 0) return a.num - b.num;
    const ea = eraRank[a.era] ?? 1;
    const eb = eraRank[b.era] ?? 1;
    if (ea !== eb) return ea - eb;
    return a.num - b.num;
  };
  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id).sort(sortInTopic);
    body += `<section>
      <div class="topic-row">
        <span class="topic-roman">${t.roman}</span>
        <h2><a href="${url(`/topics/${t.id}/`)}" style="color:inherit">${t.label}</a></h2>
        <span class="count">${inTopic.length} paper${inTopic.length > 1 ? "s" : ""}</span>
      </div>
      <p style="margin-left:0.5rem;color:var(--ink-mute);font-size:0.95rem">${t.subtitle} · <a href="${url(`/topics/${t.id}/`)}" style="color:var(--coral)">read primer →</a></p>
      <ul style="list-style:none;margin:0">`;
    for (const n of inTopic) {
      body += `<li style="border-bottom:1px solid var(--paper-dark);padding:0.7rem 0;display:flex;align-items:baseline;gap:0.8rem;font-family:var(--font-mono);font-size:0.92rem">
        <span style="color:var(--ink-faint);width:2.5em">№ ${String(n.num).padStart(2,"0")}</span>
        <a href="${url(`/papers/${n.slug}/`)}" style="font-family:var(--font-display);font-weight:700;font-size:1.05rem;letter-spacing:-0.01em">${n.title}</a>
        <span style="color:var(--coral);margin-left:auto">${n.difficulty || ""}</span>
        <span style="color:var(--ink-faint);text-transform:uppercase;font-size:0.72rem">${n.status === "stub" ? "stub" : n.status === "deep-read" ? "deep" : "auto"}</span>
      </li>`;
    }
    body += `</ul></section>`;
  }
  body += `</main>`;
  return page({ title: "Topics — Embodied AI Reading", body, active: "topics" });
}

// --- glossary page ----------------------------------------------------------
function buildGlossary(notes) {
  const glossPath = path.join(NOTES_DIR, "glossary.json");
  if (!fs.existsSync(glossPath)) return null;
  const { terms } = JSON.parse(fs.readFileSync(glossPath, "utf8"));
  // group by initial letter
  const groups = new Map();
  for (const t of terms) {
    const first = t.term[0].toUpperCase();
    const key = /[A-Z]/.test(first) ? first : "中";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const sortedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "中") return 1;
    if (b === "中") return -1;
    return a.localeCompare(b);
  });
  for (const k of sortedKeys) {
    groups.get(k).sort((a, b) => a.term.localeCompare(b.term));
  }

  let body = `<main class="shell">
    <span class="eyebrow">Glossary · 术语字典</span>
    <h1>${terms.length} 个<em>术语</em>，每个一句话讲清楚。</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch;margin-top:1rem">
      看论文最大障碍是术语雪崩。这页把 156 篇里反复出现的核心词收齐，一句话说清楚是什么、首次出现在哪篇。
    </p>
    <nav class="glossary-nav">${sortedKeys.map(k => `<a href="#g-${k}">${k}</a>`).join("")}</nav>
    <hr class="ornament"/>`;

  for (const k of sortedKeys) {
    body += `<section class="glossary-section">
      <h2 class="glossary-letter" id="g-${k}">${k}</h2>
      <dl class="glossary-list">`;
    for (const t of groups.get(k)) {
      const linked = t.anchor ? notes.find(n => n.slug === t.anchor) : null;
      body += `<dt class="glossary-term">
        <span class="glossary-name">${t.term}</span>
        ${t.full && t.full !== t.term ? `<span class="glossary-full">${t.full}</span>` : ""}
      </dt>
      <dd class="glossary-def">${t.def}${linked ? ` <a class="glossary-source" href="${url(`/papers/${linked.slug}/`)}">→ ${linked.title.split(":")[0]}</a>` : ""}</dd>`;
    }
    body += `</dl></section>`;
  }
  body += `</main>`;
  return page({ title: "Glossary — Embodied AI Reading", body, active: "glossary" });
}

// --- per-topic landing ------------------------------------------------------
function buildTopicLanding(t, notes) {
  const eraRank = { founder: 0, classic: 1, frontier: 2 };
  const inTopic = notes.filter(n => n.topic === t.id).sort((a, b) => {
    const aPin = a.num <= 13 ? 0 : 1;
    const bPin = b.num <= 13 ? 0 : 1;
    if (aPin !== bPin) return aPin - bPin;
    if (aPin === 0) return a.num - b.num;
    const ea = eraRank[a.era] ?? 1;
    const eb = eraRank[b.era] ?? 1;
    if (ea !== eb) return ea - eb;
    return (Number(a.year) || 9999) - (Number(b.year) || 9999);
  });

  const primerSlugs = t.primer || [];
  const primerNotes = primerSlugs.map(s => notes.find(n => n.slug === s)).filter(Boolean);

  const heroPath = path.join(SITE, "src", "images", "topics", `${t.id}.webp`);
  const hasHero = fs.existsSync(heroPath);
  const heroHtml = hasHero ? `<picture class="topic-landing-hero">
    <source type="image/webp" srcset="${url(`/images/topics/${t.id}-800.webp`)} 800w, ${url(`/images/topics/${t.id}.webp`)} 1672w" sizes="(max-width: 900px) 100vw, 1200px">
    <img src="${url(`/images/topics/${t.id}.webp`)}" alt="${t.label} — ${t.subtitle}" loading="eager" width="1672" height="941">
  </picture>` : "";

  const founders = inTopic.filter(n => n.era === "founder").length;
  const frontiers = inTopic.filter(n => n.era === "frontier").length;
  const classics = inTopic.filter(n => !n.era || n.era === "classic").length;

  let body = `<main class="shell">
    <nav style="font-family:var(--font-mono);font-size:0.78rem;color:var(--ink-faint);margin-bottom:1rem">
      <a href="${url("/topics/")}" style="color:var(--ink-faint)">← all topics</a>
    </nav>
    <span class="eyebrow">Topic ${t.roman} · ${t.subtitle}</span>
    <h1>${t.label}</h1>
    ${heroHtml}
    <div class="topic-meta-grid">
      <div><span class="stat-num">${inTopic.length}</span><span class="stat-label">papers</span></div>
      <div><span class="stat-num">${founders}</span><span class="stat-label">founder</span></div>
      <div><span class="stat-num">${classics}</span><span class="stat-label">classic</span></div>
      <div><span class="stat-num">${frontiers}</span><span class="stat-label">frontier</span></div>
    </div>
    <aside class="topic-progress" data-topic="${t.id}" data-topic-slugs="${inTopic.map(n => n.slug).join(",")}" hidden>
      <span class="tp-label">你在该主题已读</span>
      <span class="tp-num"><span data-tp-done>0</span> / <span data-tp-total>${inTopic.length}</span></span>
      <div class="tp-bar"><div class="tp-fill"></div></div>
    </aside>
    ${t.intro ? `<p class="topic-intro">${t.intro}</p>` : ""}`;

  if (primerNotes.length) {
    body += `<hr class="ornament"/>
    <section>
      <span class="eyebrow">Primer · 入门 3 篇</span>
      <h2 style="margin-top:0.4rem">先读这<em>三篇</em>。</h2>
      ${t.primerNote ? `<p style="color:var(--ink-soft);font-size:1.02rem;line-height:1.55;max-width:46ch">${t.primerNote}</p>` : ""}
      <ol class="primer-list">`;
    primerNotes.forEach((n, i) => {
      body += `<li class="primer-item">
        <span class="primer-num">${i + 1}</span>
        <div class="primer-body">
          <a href="${url(`/papers/${n.slug}/`)}" class="primer-title">${n.title}</a>
          <span class="primer-meta">${n.year || ""} ${n.venue ? `· ${n.venue}` : ""} ${n.difficulty ? `· ${n.difficulty}` : ""}</span>
          ${n.tldr ? `<p class="primer-tldr">${n.tldr.slice(0, 140)}${n.tldr.length > 140 ? "…" : ""}</p>` : ""}
        </div>
      </li>`;
    });
    body += `</ol></section>`;
  }

  // 横轴 timeline
  const yearsInTopic = inTopic.map(n => Number(n.year)).filter(Boolean);
  const minYear = yearsInTopic.length ? Math.min(...yearsInTopic) : 2017;
  const maxYear = yearsInTopic.length ? Math.max(...yearsInTopic) : 2025;
  const yearSpan = Math.max(1, maxYear - minYear);
  const W = 800, H = 90;
  const padX = 50, padY = 30;
  const innerW = W - 2 * padX;
  const xOf = y => padX + ((Number(y) - minYear) / yearSpan) * innerW;
  // 同年多篇时垂直分散
  const yearBuckets = new Map();
  for (const n of inTopic) {
    if (!n.year) continue;
    const y = Number(n.year);
    if (!yearBuckets.has(y)) yearBuckets.set(y, []);
    yearBuckets.get(y).push(n);
  }
  const dots = [];
  for (const [y, ns] of yearBuckets) {
    ns.forEach((n, i) => {
      const offset = (i - (ns.length - 1) / 2) * 12;
      dots.push({ n, cx: xOf(y), cy: padY + offset, era: n.era || "classic" });
    });
  }
  const eraColor = { founder: "var(--coral)", classic: "var(--olive)", frontier: "var(--mustard)" };
  const yearTicks = [];
  for (let y = minYear; y <= maxYear; y++) yearTicks.push(y);
  const timelineSvg = `<svg class="topic-timeline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${t.label} 论文按年份分布">
    <line x1="${padX}" y1="${padY}" x2="${W - padX}" y2="${padY}" stroke="var(--paper-dark)" stroke-width="1"/>
    ${yearTicks.map(y => `<g>
      <line x1="${xOf(y)}" y1="${padY - 4}" x2="${xOf(y)}" y2="${padY + 4}" stroke="var(--paper-dark)"/>
      <text x="${xOf(y)}" y="${padY + 22}" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--ink-faint)">${y}</text>
    </g>`).join("")}
    ${dots.map(d => `<a href="${url(`/papers/${d.n.slug}/`)}">
      <circle cx="${d.cx}" cy="${d.cy}" r="${d.era === "founder" ? 5 : 4}" fill="${eraColor[d.era]}" stroke="var(--paper)" stroke-width="1.5">
        <title>${d.n.title.split(":")[0]} (${d.n.year || "?"})</title>
      </circle>
    </a>`).join("")}
  </svg>`;

  body += `<hr class="ornament"/>
    <section class="topic-timeline-section">
      <span class="eyebrow">Distribution · 年份分布</span>
      <h2 style="margin-top:0.4rem">${minYear} 到 ${maxYear}，<em>${inTopic.length} 篇</em>怎么排开。</h2>
      <div class="topic-timeline-wrap">${timelineSvg}</div>
      <div class="timeline-legend">
        <span class="lg-item"><span class="lg-dot" style="background:var(--coral)"></span>祖师爷</span>
        <span class="lg-item"><span class="lg-dot" style="background:var(--olive)"></span>经典</span>
        <span class="lg-item"><span class="lg-dot" style="background:var(--mustard)"></span>前沿</span>
      </div>
    </section>
    <section>
      <span class="eyebrow">All papers · 按 era 排</span>
      <h2 style="margin-top:0.4rem">${t.label} 全部 ${inTopic.length} 篇。</h2>
      <table class="compare-table">
        <thead><tr><th>era</th><th>year</th><th>title</th><th>venue</th></tr></thead>
        <tbody>`;
  for (const n of inTopic) {
    const eraLabel = n.era === "founder" ? "祖师爷" : n.era === "frontier" ? "前沿" : "经典";
    const eraClass = n.era === "founder" ? "era-founder" : n.era === "frontier" ? "era-frontier" : "era-classic";
    body += `<tr>
      <td><span class="era-badge ${eraClass}">${eraLabel}</span></td>
      <td class="cell-year">${n.year || "—"}</td>
      <td class="cell-title"><a href="${url(`/papers/${n.slug}/`)}">${n.title}</a></td>
      <td class="cell-venue">${n.venue || ""}</td>
    </tr>`;
  }
  body += `</tbody></table></section>`;

  // 主题间 prev/next
  const idx = TOPIC_ORDER.findIndex(x => x.id === t.id);
  const prevT = idx > 0 ? TOPIC_ORDER[idx - 1] : null;
  const nextT = idx < TOPIC_ORDER.length - 1 ? TOPIC_ORDER[idx + 1] : null;
  if (prevT || nextT) {
    body += `<nav class="prev-next-nav" style="margin-top:3rem">
      ${prevT ? `<a class="pn-card pn-prev" href="${url(`/topics/${prevT.id}/`)}">
        <span class="pn-dir">← 上一主题</span>
        <span class="pn-title">${prevT.roman}. ${prevT.label}</span>
        <span class="pn-tldr">${prevT.subtitle}</span>
      </a>` : `<div class="pn-card pn-empty"></div>`}
      ${nextT ? `<a class="pn-card pn-next" href="${url(`/topics/${nextT.id}/`)}">
        <span class="pn-dir">下一主题 →</span>
        <span class="pn-title">${nextT.roman}. ${nextT.label}</span>
        <span class="pn-tldr">${nextT.subtitle}</span>
      </a>` : `<div class="pn-card pn-empty"></div>`}
    </nav>`;
  }

  body += `</main>`;

  return page({ title: `${t.label} — Embodied AI Reading`, body, active: "topics" });
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

function inferTags(note) {
  const text = (note.title + " " + (note.body || "").slice(0, 4000)).toLowerCase();
  const tags = [];
  for (const r of TAG_RULES) {
    if (r.keywords.test(text)) tags.push(r.tag);
  }
  return tags.slice(0, 6); // 最多 6 个
}

function buildTagsIndex(notes) {
  const tagMap = new Map();
  for (const n of notes) {
    for (const tag of (n.tags || [])) {
      if (!tagMap.has(tag)) tagMap.set(tag, []);
      tagMap.get(tag).push(n);
    }
  }
  const sortedTags = [...tagMap.entries()].sort((a, b) => b[1].length - a[1].length);
  let body = `<main class="shell">
    <span class="eyebrow">Tags · 跨主题标签</span>
    <h1><em>${sortedTags.length} 个</em>tag，把 ${notes.length} 篇笔记<em>横切</em>。</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch">
      主题(topic)按研究领域分。tag 按技术手段或物理形态分——一篇 VLA 论文也可能同时是"transformer"和"manipulation"。
    </p>
    <hr class="ornament"/>
    <div class="tag-cloud">`;
  for (const [tag, ns] of sortedTags) {
    body += `<a class="tag-cloud-item" href="${url(`/tags/${tag}/`)}">
      <span class="tag-name">${tag}</span>
      <span class="tag-count">${ns.length}</span>
    </a>`;
  }
  body += `</div></main>`;
  return page({ title: "Tags — Embodied AI Reading", body, active: "tags" });
}

function buildTagPage(tag, notes) {
  const inTag = [...notes].sort((a, b) => (b.year || 0) - (a.year || 0));
  let body = `<main class="shell">
    <nav class="breadcrumbs">
      <a href="${url("/")}">Home</a>
      <span class="bc-sep">›</span>
      <a href="${url("/tags/")}">Tags</a>
      <span class="bc-sep">›</span>
      <span class="bc-current">${tag}</span>
    </nav>
    <span class="eyebrow">Tag</span>
    <h1>#${tag} <span style="color:var(--ink-faint);font-weight:400;font-size:0.6em">(${inTag.length} 篇)</span></h1>
    <table class="compare-table" style="margin-top:1.5rem">
      <thead><tr><th>year</th><th>title</th><th>topic</th><th>venue</th></tr></thead>
      <tbody>${inTag.map(n => `<tr>
        <td class="cell-year">${n.year || "—"}</td>
        <td class="cell-title"><a href="${url(`/papers/${n.slug}/`)}">${n.title}</a></td>
        <td class="cell-venue" style="color:var(--ink-mute)">${n.topicLabel}</td>
        <td class="cell-venue">${n.venue || ""}</td>
      </tr>`).join("")}</tbody>
    </table>
  </main>`;
  return page({ title: `#${tag} — Embodied AI Reading`, body, active: "tags" });
}

// --- reading lists ----------------------------------------------------------
const READING_LISTS = [
  {
    id: "vla-starter",
    title: "VLA 入门 6 篇",
    subtitle: "从动作 token 到产业基础模型",
    intro: "想理解'机器人怎么直接看图听话出动作'？这 6 篇按 era 升序排，读完你能自己讲清 VLA 路线。",
    slugs: ["clip", "rt-1", "rt-2", "openvla", "openvla-oft", "pi0"],
    estMinutes: 90,
  },
  {
    id: "diffusion-policy",
    title: "扩散策略 5 篇",
    subtitle: "从'选动作'变成'去噪'",
    intro: "Diffusion Policy 把控制问题重新定义。读完知道为什么扩散赢过 transformer 在 manipulation 上。",
    slugs: ["diffusion-policy", "3d-diffusion-policy", "consistency-policy", "dit-policy", "pi0"],
    estMinutes: 70,
  },
  {
    id: "world-models",
    title: "世界模型 4 篇",
    subtitle: "在脑子里预演",
    intro: "教 AI 在想象里走一遍。这 4 篇覆盖从 World Models 鼻祖到 Genie/Cosmos 工业级。",
    slugs: ["world-models-ha", "dreamer-v3", "genie", "cosmos-world-foundation"],
    estMinutes: 55,
  },
  {
    id: "rf-perception",
    title: "射频感知 5 篇",
    subtitle: "WiFi 和毫米波看世界",
    intro: "电磁波怎么穿墙、抗烟雾、画出 LiDAR 级 3D。这 5 篇讲清射频感知的核心套路。",
    slugs: ["rf-pose-through-wall", "person-in-wifi", "millimap", "panoradar", "argus-mmego"],
    estMinutes: 60,
  },
  {
    id: "imitation-hardware",
    title: "模仿学习硬件 4 篇",
    subtitle: "怎么采到好数据",
    intro: "VLA 的瓶颈是数据。这 4 篇讲明白：ALOHA、UMI、DexCap、HumanPlus 各解决了什么采集问题。",
    slugs: ["act-aloha", "umi", "dexcap", "humanplus"],
    estMinutes: 50,
  },
];

function buildReadingLists(notes) {
  let body = `<main class="shell">
    <span class="eyebrow">Reading lists · 主题精选</span>
    <h1><em>${READING_LISTS.length} 套</em>策划好的<em>读书包</em>。</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch">
      不知道 156 篇该从哪开始？挑一个你最感兴趣的方向，按 era 顺序读完一个包。每包 50-90 分钟，读完能在那个细分领域跟人聊起。
    </p>
    <hr class="ornament"/>`;
  for (const list of READING_LISTS) {
    const items = list.slugs.map(s => notes.find(n => n.slug === s)).filter(Boolean);
    body += `<section class="reading-list" data-list-id="${list.id}" data-list-slugs="${items.map(n => n.slug).join(",")}">
      <header class="rl-header">
        <span class="rl-tag">${list.id}</span>
        <h2 class="rl-title">${list.title}</h2>
        <p class="rl-subtitle">${list.subtitle}</p>
        <span class="rl-meta">${items.length} 篇 · ~${list.estMinutes} 分钟</span>
      </header>
      <p class="rl-intro">${list.intro}</p>
      <div class="rl-progress" hidden>
        <div class="rl-progress-track"><div class="rl-progress-fill"></div></div>
        <span class="rl-progress-text"></span>
      </div>
      <ol class="primer-list">
        ${items.map((n, i) => `<li class="primer-item" data-slug="${n.slug}">
          <span class="primer-num">${i + 1}</span>
          <div class="primer-body">
            <a href="${url(`/papers/${n.slug}/`)}" class="primer-title">${n.title}</a>
            <span class="primer-meta">${n.year || ""} ${n.venue ? `· ${n.venue}` : ""} ${n.difficulty ? `· ${n.difficulty}` : ""} · ${n.topicLabel}</span>
            ${n.tldr ? `<p class="primer-tldr">${n.tldr.slice(0, 120)}${n.tldr.length > 120 ? "…" : ""}</p>` : ""}
          </div>
        </li>`).join("")}
      </ol>
    </section>`;
  }
  body += `</main>`;
  return page({ title: "Reading lists — Embodied AI Reading", body, active: "lists" });
}

// --- era landing pages ------------------------------------------------------
const ERA_INFO = {
  founder: {
    label: "祖师爷 · Founder",
    intro: "每个领域的第一篇——把这个研究方向第一次讲清楚的论文。RT-1 之于 VLA、CLIP 之于 VLM、Diffusion Policy 之于扩散策略。读懂这些，你就掌握了每个分支的'第一性'。",
    color: "var(--coral)",
    accent: "rgba(237, 111, 92, 0.12)",
  },
  classic: {
    label: "经典 · Classic",
    intro: "每个领域里被反复引用、几乎成事实标准的工作。它们不必是第一篇，但是绕不开的。读这一档你能拿到该领域的核心认知。",
    color: "var(--olive)",
    accent: "rgba(110, 116, 72, 0.12)",
  },
  frontier: {
    label: "前沿 · Frontier",
    intro: "2024-2025 还在火热推进的方向。架构试错、规模扩展、模态融合都还没有定论。这一档变化最快——今天的 SOTA 半年后就可能被新方法替代。",
    color: "var(--mustard)",
    accent: "rgba(233, 185, 74, 0.18)",
  },
};

function buildEraPage(era, notes) {
  const info = ERA_INFO[era];
  if (!info) return null;
  const inEra = notes.filter(n => (n.era || "classic") === era);
  // 按主题分组，组内按年份升序
  const byTopic = new Map();
  for (const n of inEra) {
    if (!byTopic.has(n.topic)) byTopic.set(n.topic, []);
    byTopic.get(n.topic).push(n);
  }
  for (const arr of byTopic.values()) {
    arr.sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999));
  }

  let body = `<main class="shell">
    <nav class="breadcrumbs">
      <a href="${url("/")}">Home</a>
      <span class="bc-sep">›</span>
      <span class="bc-current">${info.label}</span>
    </nav>
    <span class="eyebrow">Era</span>
    <h1 style="color:${info.color}">${info.label}</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:46ch">${info.intro}</p>

    <div class="big-stats" style="margin-top:2rem">
      <div><span class="bs-num" style="color:${info.color}">${inEra.length}</span><span class="bs-label">总篇数</span></div>
      <div><span class="bs-num" style="color:${info.color}">${byTopic.size}</span><span class="bs-label">覆盖主题</span></div>
      <div><span class="bs-num" style="color:${info.color}">${Math.min(...inEra.map(n => Number(n.year)).filter(Boolean))}–${Math.max(...inEra.map(n => Number(n.year)).filter(Boolean))}</span><span class="bs-label">年份跨度</span></div>
      <div><span class="bs-num" style="color:${info.color}">${inEra.reduce((s, n) => s + (n.wordCount || 0), 0).toLocaleString()}</span><span class="bs-label">字</span></div>
    </div>

    <hr class="ornament"/>`;

  // 三 era 互链
  body += `<div style="margin:2rem 0;display:flex;gap:0.6rem;font-family:var(--font-mono);font-size:0.78rem">
    ${["founder", "classic", "frontier"].filter(e => e !== era).map(e => {
      const ei = ERA_INFO[e];
      return `<a href="${url(`/eras/${e}/`)}" style="padding:0.5rem 1rem;border:1px solid ${ei.color};color:${ei.color};text-decoration:none">${ei.label} →</a>`;
    }).join("")}
  </div>`;

  for (const t of TOPIC_ORDER) {
    const ns = byTopic.get(t.id);
    if (!ns || !ns.length) continue;
    body += `<section style="margin:2.5rem 0">
      <h2 style="display:flex;align-items:baseline;gap:0.6rem;border-bottom:1px solid var(--paper-dark);padding-bottom:0.4rem">
        <span class="topic-roman" style="color:${info.color}">${t.roman}</span>
        <a href="${url(`/topics/${t.id}/`)}" style="color:inherit;text-decoration:none">${t.label}</a>
        <span style="color:var(--ink-faint);font-weight:400;font-size:0.62em;margin-left:auto">${ns.length} 篇</span>
      </h2>
      <ul class="primer-list" style="margin-top:0.8rem">
        ${ns.map(n => `<li class="primer-item">
          <span class="primer-num" style="color:${info.color}">${n.year || "?"}</span>
          <div class="primer-body">
            <a href="${url(`/papers/${n.slug}/`)}" class="primer-title">${n.title}</a>
            <span class="primer-meta">${n.venue || ""} ${n.difficulty ? `· ${n.difficulty}` : ""}</span>
            ${n.tldr ? `<p class="primer-tldr">${n.tldr.slice(0, 140)}${n.tldr.length > 140 ? "…" : ""}</p>` : ""}
          </div>
        </li>`).join("")}
      </ul>
    </section>`;
  }
  body += `</main>`;
  return page({ title: `${info.label} — Embodied AI Reading`, body, active: "eras" });
}

// --- /syllabus/ checkable 30-day course plan -------------------------------
const SYLLABUS_WEEKS = [
  {
    week: 1, title: "Week 1 · 把视觉和语言连起来",
    goal: "理解为什么所有 VLA 都先有一个 VLM",
    days: [
      { d: 1, slug: "clip", focus: "图文进入同一坐标系" },
      { d: 2, slug: "blip", focus: "弱标注 + 自我清洗" },
      { d: 3, slug: "blip-2", focus: "Q-Former 桥接冻结的 VLM/LLM" },
      { d: 4, slug: "llava", focus: "MLP 把视觉特征注入 LLM" },
      { d: 5, slug: "flamingo", focus: "交错图文 + Perceiver Resampler" },
      { d: 6, slug: "siglip", focus: "sigmoid 替换 softmax" },
      { d: 7, slug: null, focus: "复习 + 整理 [Glossary](/glossary/)" },
    ],
  },
  {
    week: 2, title: "Week 2 · 看懂 VLA 的进化",
    goal: "讲清机器人怎么从看图直接出关节速度",
    days: [
      { d: 8, slug: "rt-1", focus: "把动作 token 化" },
      { d: 9, slug: "saycan", focus: "LLM 给候选 + 可行性打分" },
      { d: 10, slug: "code-as-policies", focus: "LLM 直接写 Python 调机器人" },
      { d: 11, slug: "rt-2", focus: "网络知识 → robot policy" },
      { d: 12, slug: "openvla", focus: "完全开源民主化" },
      { d: 13, slug: "pi0", focus: "VLM + flow matching head" },
      { d: 14, slug: null, focus: "复习 + 整理 [VLA topic page](/topics/vla/)" },
    ],
  },
  {
    week: 3, title: "Week 3 · 数据、模仿、扩散",
    goal: "明白 Diffusion Policy 为什么赢了 transformer 在 manipulation",
    days: [
      { d: 15, slug: "dagger", focus: "误差累积 + 解决方案" },
      { d: 16, slug: "act-aloha", focus: "双臂遥操作 + action chunking" },
      { d: 17, slug: "umi", focus: "野外采数据无需机器人" },
      { d: 18, slug: "open-x-embodiment", focus: "22 家机构数据合一" },
      { d: 19, slug: "diffusion-policy", focus: "选动作 = 去噪" },
      { d: 20, slug: "3d-diffusion-policy", focus: "加 3D 点云做眼睛" },
      { d: 21, slug: null, focus: "复习 + 整理 [Imitation topic](/topics/imitation/)" },
    ],
  },
  {
    week: 4, title: "Week 4 · 周边生态",
    goal: "具备读 2026 年新论文 abstract 不发蒙的能力",
    days: [
      { d: 22, slug: "world-models-ha", focus: "在脑子里预演" },
      { d: 23, slug: "dreamer-v3", focus: "跨域固定超参世界模型" },
      { d: 24, slug: "genie", focus: "无标签视频学潜在动作" },
      { d: 25, slug: "habitat", focus: "室内仿真器照片级" },
      { d: 26, slug: "isaac-gym", focus: "GPU 并行物理仿真" },
      { d: 27, slug: "imagebind", focus: "六模态通过图像锚点" },
      { d: 28, slug: "whisper", focus: "弱标注 + 大规模 = 零样本 ASR" },
      { d: 29, slug: null, focus: "复习 + 看 [Compare](/compare/)" },
      { d: 30, slug: null, focus: "写一篇自己的 review" },
    ],
  },
];

function buildSyllabus(notes) {
  const slugMap = new Map(notes.map(n => [n.slug, n]));
  let body = `<main class="shell">
    <span class="eyebrow">Syllabus · 30 天课程提纲</span>
    <h1>30 个<em>检查框</em>，30 天读完。</h1>
    <p style="font-size:1.1rem;color:var(--ink-soft);max-width:48ch;line-height:1.55">
      可勾选版本的 [30 天路径](/learn/path/)。每天勾完会存到浏览器，第二天回来自动恢复。完成度同步到顶部进度条。
    </p>

    <aside class="syl-progress" id="syl-progress">
      <div class="syl-bar"><div class="syl-fill" style="width:0%"></div></div>
      <div class="syl-num"><span data-syl-done>0</span> / 30 天</div>
    </aside>
    <hr class="ornament"/>`;
  for (const w of SYLLABUS_WEEKS) {
    body += `<section class="syl-week">
      <h2 class="syl-week-h">${w.title}</h2>
      <p class="syl-goal">本周收获 → ${w.goal}</p>
      <ol class="syl-days">`;
    for (const d of w.days) {
      const note = d.slug ? slugMap.get(d.slug) : null;
      const link = note ? `<a class="syl-paper" href="${url(`/papers/${d.slug}/`)}">${note.title.split(":")[0]}</a>` : "";
      // focus 内嵌 markdown 链接转 html
      const focusHtml = d.focus.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, h) => `<a href="${url(h)}">${t}</a>`);
      body += `<li class="syl-day">
        <input type="checkbox" class="syl-check" data-syl-day="${d.d}" id="syl-${d.d}">
        <label for="syl-${d.d}" class="syl-day-num">Day ${d.d}</label>
        <div class="syl-day-body">
          ${link ? link + "<br>" : ""}<span class="syl-focus">${focusHtml}</span>
        </div>
      </li>`;
    }
    body += `</ol></section>`;
  }
  body += `</main>
  <script>
  (function(){
    var KEY = 'eaireading.syllabus';
    var done = new Set();
    try { done = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch(e) {}
    function save() { localStorage.setItem(KEY, JSON.stringify([...done])); render(); }
    function render() {
      var pct = (done.size / 30) * 100;
      document.querySelector('.syl-fill').style.width = pct + '%';
      document.querySelector('[data-syl-done]').textContent = done.size;
    }
    document.querySelectorAll('.syl-check').forEach(function(cb){
      var d = parseInt(cb.dataset.sylDay, 10);
      cb.checked = done.has(d);
      cb.addEventListener('change', function(){
        if (cb.checked) done.add(d); else done.delete(d);
        save();
        cb.closest('.syl-day').classList.toggle('syl-done', cb.checked);
      });
      if (cb.checked) cb.closest('.syl-day').classList.add('syl-done');
    });
    render();
  })();
  </script>`;
  return page({ title: "Syllabus — Embodied AI Reading", body, active: "syllabus" });
}

// --- /cheatsheet/ all papers tldr in one page ------------------------------
function buildCheatsheet(notes) {
  // 按主题分组
  const eraRank = { founder: 0, classic: 1, frontier: 2 };
  const sortInTopic = (a, b) => {
    const ea = eraRank[a.era] ?? 1;
    const eb = eraRank[b.era] ?? 1;
    if (ea !== eb) return ea - eb;
    return (Number(a.year) || 9999) - (Number(b.year) || 9999);
  };
  let body = `<main class="shell">
    <span class="eyebrow">Cheatsheet · 156 篇 tldr 速查</span>
    <h1><em>156 篇</em>论文一句话<em>速览</em>。</h1>
    <p style="font-size:1.05rem;color:var(--ink-soft);max-width:48ch;line-height:1.55">
      把 156 篇全部 tldr 放在一页。Cmd+F 即可全文搜索。打印（Cmd+P）输出 ~10 页 A4 cheatsheet。
    </p>
    <p style="font-family:var(--font-mono);font-size:0.78rem;color:var(--ink-faint);letter-spacing:0.04em">
      显示模式：每行 编号 · 标题 / 一句话 / 主题 · 年份
    </p>
    <hr class="ornament"/>`;
  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id).sort(sortInTopic);
    if (!inTopic.length) continue;
    body += `<section class="cs-section">
      <h2 class="cs-topic-h"><span class="cs-roman">${t.roman}</span> <a href="${url(`/topics/${t.id}/`)}">${t.label}</a> <span class="cs-count">${inTopic.length}</span></h2>
      <ol class="cs-list">`;
    for (const n of inTopic) {
      const eraTag = n.era === "founder" ? "F" : n.era === "frontier" ? "→" : "·";
      body += `<li class="cs-item">
        <span class="cs-num">${String(n.num).padStart(3, "0")}</span>
        <span class="cs-era cs-era-${n.era || "classic"}">${eraTag}</span>
        <a href="${url(`/papers/${n.slug}/`)}" class="cs-title">${n.title.split(":")[0]}</a>
        <span class="cs-tldr">${n.tldr || ""}</span>
        <span class="cs-meta">${n.year || ""}${n.venue ? " · " + n.venue : ""}</span>
      </li>`;
    }
    body += `</ol></section>`;
  }
  body += `</main>`;
  return page({ title: "Cheatsheet — Embodied AI Reading", body, active: "cheatsheet" });
}

// --- /discover/ exploration page -------------------------------------------
function buildDiscover(notes) {
  const dataPapers = notes.map(n => ({
    slug: n.slug, num: n.num, title: n.title, topic: n.topicLabel, era: n.era || "classic",
    difficulty: (n.difficulty || "").length || 2,
    tldr: (n.tldr || "").slice(0, 110),
    url: url(`/papers/${n.slug}/`),
    year: n.year || null,
  }));

  const body = `<main class="shell">
    <span class="eyebrow">Discover · 漫游模式</span>
    <h1>不知道读什么？让<em>站点替你挑</em>。</h1>
    <p style="color:var(--ink-soft);font-size:1.1rem;line-height:1.55;max-width:46ch">
      4 种推荐策略并行：今日固定一篇 / 5 篇随机预览 / 一段你没读过的 era / 一个你没碰过的主题。每次刷新都不同（除了今日）。
    </p>
    <hr class="ornament"/>

    <section class="discover-section" id="dis-today">
      <h2>① 今日推荐</h2>
      <p class="ds-hint">基于日期 hash，全站统一。</p>
      <div class="ds-card" data-discover-mode="today"></div>
    </section>

    <section class="discover-section" id="dis-shuffle">
      <h2>② 随机 5 篇</h2>
      <p class="ds-hint">每次刷新换一组。</p>
      <div class="ds-list" data-discover-mode="shuffle"></div>
    </section>

    <section class="discover-section" id="dis-newera">
      <h2>③ 未读 era 推荐</h2>
      <p class="ds-hint">从你读得最少的 era 里挑一篇。</p>
      <div class="ds-card" data-discover-mode="newera"></div>
    </section>

    <section class="discover-section" id="dis-newtopic">
      <h2>④ 没碰过的主题</h2>
      <p class="ds-hint">如果你只读了 VLA，这里给你看世界模型或 RF。</p>
      <div class="ds-card" data-discover-mode="newtopic"></div>
    </section>

    <script id="eai-discover-data" type="application/json">${JSON.stringify(dataPapers)}</script>
    <script>
    (function(){
      var papers = JSON.parse(document.getElementById('eai-discover-data').textContent);
      var read = new Set();
      try { read = new Set(JSON.parse(localStorage.getItem('eaireading.read') || '[]')); } catch(e) {}

      function cardHtml(p) {
        return '<a class="ds-link" href="' + p.url + '">' +
          '<span class="ds-meta">№ ' + String(p.num).padStart(2,'0') + ' · ' + p.topic + ' · ' + (p.year||'') + '</span>' +
          '<h3 class="ds-title">' + p.title.split(':')[0] + '</h3>' +
          (p.tldr ? '<p class="ds-tldr">' + p.tldr + '…</p>' : '') +
          '</a>';
      }

      // ① today
      var today = new Date();
      var ymd = today.getFullYear() * 10000 + (today.getMonth()+1) * 100 + today.getDate();
      var h = ((ymd * 9301) + 49297) % 233280;
      var pToday = papers[h % papers.length];
      var todayEl = document.querySelector('[data-discover-mode="today"]');
      if (todayEl) todayEl.innerHTML = cardHtml(pToday);

      // ② shuffle 5
      var pool = papers.slice();
      pool.sort(function(){ return Math.random() - 0.5; });
      var shuf = pool.slice(0, 5);
      var shufEl = document.querySelector('[data-discover-mode="shuffle"]');
      if (shufEl) shufEl.innerHTML = shuf.map(cardHtml).join('');

      // ③ unread era：找用户读得最少的 era
      var eraCount = { founder: 0, classic: 0, frontier: 0 };
      for (var i = 0; i < papers.length; i++) {
        if (read.has(papers[i].slug)) eraCount[papers[i].era]++;
      }
      var leastEra = Object.keys(eraCount).sort(function(a,b){ return eraCount[a] - eraCount[b]; })[0];
      var unreadInEra = papers.filter(function(p){ return p.era === leastEra && !read.has(p.slug); });
      if (unreadInEra.length) {
        var pEra = unreadInEra[Math.floor(Math.random() * unreadInEra.length)];
        var eraEl = document.querySelector('[data-discover-mode="newera"]');
        if (eraEl) eraEl.innerHTML = cardHtml(pEra);
      }

      // ④ unread topic：找用户没读过的主题
      var topicSeen = {};
      for (var i = 0; i < papers.length; i++) {
        if (read.has(papers[i].slug)) topicSeen[papers[i].topic] = true;
      }
      var allTopics = {};
      papers.forEach(function(p){ allTopics[p.topic] = true; });
      var unseenTopics = Object.keys(allTopics).filter(function(t){ return !topicSeen[t]; });
      var pickTopic = unseenTopics.length ? unseenTopics[Math.floor(Math.random() * unseenTopics.length)] : Object.keys(allTopics)[0];
      var inTopic = papers.filter(function(p){ return p.topic === pickTopic && p.era === 'founder'; });
      if (!inTopic.length) inTopic = papers.filter(function(p){ return p.topic === pickTopic; });
      if (inTopic.length) {
        var pTopic = inTopic[0];
        var topEl = document.querySelector('[data-discover-mode="newtopic"]');
        if (topEl) topEl.innerHTML = cardHtml(pTopic);
      }
    })();
    </script>
  </main>`;
  return page({ title: "Discover — Embodied AI Reading", body, active: "discover" });
}

// --- /next/ smart next paper redirect --------------------------------------
function buildNext(notes) {
  const slugs = JSON.stringify(notes.map(n => ({ slug: n.slug, topic: n.topicLabel, era: n.era || "classic" })));
  const body = `<main class="shell" style="text-align:center;padding-top:6rem">
    <span class="eyebrow">Next · 帮你挑下一篇</span>
    <h1>正在<em>选下一篇</em>...</h1>
    <p style="color:var(--ink-soft);font-size:1.05rem;margin-top:1rem">基于你已读的主题分布。</p>
    <p style="margin-top:2rem"><a id="eai-next-fallback" href="${url("/")}" style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">没自动跳转？回首页 →</a></p>
    <script>
    (function(){
      var stylesLink = document.querySelector('link[href*="/styles.css"]');
      var base = stylesLink ? stylesLink.getAttribute('href').replace(/\\/styles\\.css$/, '') : '';
      var papers = ${slugs};
      try {
        var read = new Set(JSON.parse(localStorage.getItem('eaireading.read') || '[]'));
        var unread = papers.filter(function(p){ return !read.has(p.slug); });
        if (!unread.length) {
          location.replace(base + '/lists/');
          return;
        }
        var pick = null;
        if (read.size === 0) {
          // 0 已读：CLIP 优先
          pick = unread.find(function(p){ return p.slug === 'clip'; }) || unread[0];
        } else {
          // 已读最多某主题 → 推同主题下一篇
          var byTopic = {};
          papers.forEach(function(p){ if (read.has(p.slug)) byTopic[p.topic] = (byTopic[p.topic] || 0) + 1; });
          var sorted = Object.keys(byTopic).sort(function(a,b){ return byTopic[b] - byTopic[a]; });
          for (var i = 0; i < sorted.length; i++) {
            var cands = unread.filter(function(p){ return p.topic === sorted[i]; });
            if (cands.length) {
              var eraOrder = { founder: 0, classic: 1, frontier: 2 };
              cands.sort(function(a,b){ return (eraOrder[a.era] || 1) - (eraOrder[b.era] || 1); });
              pick = cands[0];
              break;
            }
          }
          if (!pick) pick = unread[0];
        }
        location.replace(base + '/papers/' + pick.slug + '/');
      } catch(e) {
        location.replace(base + '/');
      }
    })();
    </script>
  </main>`;
  return page({ title: "Next — Embodied AI Reading", body, active: "" });
}

// --- random paper redirect --------------------------------------------------
function buildRandom(notes) {
  const slugs = JSON.stringify(notes.map(n => n.slug));
  const body = `<main class="shell" style="text-align:center;padding-top:6rem">
    <span class="eyebrow">Random · 随机一篇</span>
    <h1>正在<em>抽签</em>...</h1>
    <p style="color:var(--ink-soft);font-size:1.05rem;margin-top:1rem">从 ${notes.length} 篇里随机挑一篇给你。</p>
    <p style="margin-top:2rem"><a id="eai-random-fallback" href="${url("/")}" style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">没自动跳转？点这里手动选 →</a></p>
    <script>
    (function(){
      var stylesLink = document.querySelector('link[href*="/styles.css"]');
      var base = stylesLink ? stylesLink.getAttribute('href').replace(/\\/styles\\.css$/, '') : '';
      var slugs = ${slugs};
      // 优先未读
      try {
        var read = new Set(JSON.parse(localStorage.getItem('eaireading.read') || '[]'));
        var unread = slugs.filter(function(s){ return !read.has(s); });
        if (unread.length > 0) slugs = unread;
      } catch(e) {}
      var pick = slugs[Math.floor(Math.random() * slugs.length)];
      location.replace(base + '/papers/' + pick + '/');
    })();
    </script>
  </main>`;
  return page({ title: "Random — Embodied AI Reading", body, active: "" });
}

// --- human-readable site map -----------------------------------------------
function buildSiteMap(notes, issuePages, learnPages) {
  const sections = [
    {
      title: "入口",
      items: [
        { url: "/", label: "Index", desc: "156 张论文卡 + 主题分组 + 快筛" },
        { url: "/learn/path/", label: "30 天路径", desc: "零基础入门推荐顺序" },
        { url: "/learn/faq/", label: "FAQ", desc: "新人 12 题" },
        { url: "/lists/", label: "Reading lists", desc: "5 套主题精选包" },
      ],
    },
    {
      title: "视图",
      items: [
        { url: "/topics/", label: "Topics", desc: "11 个主题概览" },
        { url: "/timeline/", label: "Timeline", desc: "2011→2025 演化时间线" },
        { url: "/compare/", label: "Compare", desc: "同主题 era 并排对比" },
        { url: "/graph/", label: "Graph", desc: "D3 力导论文关系图（3 种布局）" },
        { url: "/heatmap/", label: "Heatmap", desc: "21 tag 共现矩阵" },
        { url: "/eras/founder/", label: "Eras", desc: "祖师爷 / 经典 / 前沿三档" },
      ],
    },
    {
      title: "分类",
      items: [
        { url: "/tags/", label: "Tags", desc: "21 跨主题技术标签" },
        { url: "/glossary/", label: "Glossary", desc: "60 术语字典" },
        { url: "/venues/", label: "Venues", desc: "37 会议按类别" },
        { url: "/stats/", label: "Stats", desc: "5 维数据看板 + 你的快照" },
      ],
    },
    {
      title: "11 个主题",
      items: TOPIC_ORDER.map(t => ({ url: `/topics/${t.id}/`, label: `${t.roman}. ${t.label}`, desc: t.subtitle })),
    },
    {
      title: "Issues 期刊",
      items: issuePages.map(p => ({
        url: `/issues/${p.slug.replace("issue-", "")}/`,
        label: `Issue Nº ${p.issueNumber}`,
        desc: p.title.replace(/^Issue Nº \w+ — /, ""),
      })),
    },
    {
      title: "学习",
      items: learnPages.map(p => ({
        url: `/learn/${p.slug}/`,
        label: p.title,
        desc: p.intro || "",
      })),
    },
    {
      title: "数据 + 元",
      items: [
        { url: "/data/index.json", label: "Data manifest", desc: "JSON 数据 manifest" },
        { url: "/data/papers.json", label: "papers.json", desc: "156 篇全元数据" },
        { url: "/data/tags.json", label: "tags.json", desc: "21 tag + 共现矩阵" },
        { url: "/data/topics.json", label: "topics.json", desc: "11 主题元数据" },
        { url: "/feed.xml", label: "Atom feed", desc: "RSS 订阅" },
        { url: "/sitemap.xml", label: "sitemap.xml", desc: "搜索引擎用" },
        { url: "/changelog/", label: "Changelog", desc: "git log 自动" },
        { url: "/contributors/", label: "Contributors", desc: "原作者致谢" },
      ],
    },
  ];

  let body = `<main class="shell">
    <span class="eyebrow">Site map · 站点地图</span>
    <h1><em>${notes.length} 篇笔记</em>，<em>${[...sections.reduce((s, sec) => sec.items.forEach(_ => s.add(true)) || s, new Set())].length} +</em>个入口。</h1>
    <p style="color:var(--ink-soft);max-width:48ch;line-height:1.55">人可读版的站点地图。机器版在 <a href="${url("/sitemap.xml")}">/sitemap.xml</a>。</p>
    <hr class="ornament"/>`;
  for (const sec of sections) {
    if (!sec.items.length) continue;
    body += `<section class="sm-section">
      <h2>${sec.title}</h2>
      <ul class="sm-list">
        ${sec.items.map(i => `<li>
          <a class="sm-label" href="${url(i.url)}">${i.label}</a>
          <span class="sm-desc">${i.desc}</span>
          <span class="sm-url">${i.url}</span>
        </li>`).join("")}
      </ul>
    </section>`;
  }
  body += `</main>`;
  return page({ title: "Site map — Embodied AI Reading", body, active: "sitemap" });
}

// --- contributors page ------------------------------------------------------
function buildContributors(notes) {
  const venueCount = new Map();
  for (const n of notes) {
    const v = (n.venue || "Unknown").trim() || "Unknown";
    venueCount.set(v, (venueCount.get(v) || 0) + 1);
  }
  const topVenues = [...venueCount.entries()].sort((a, b) => b[1] - a[1]);
  const totalLab = topVenues.reduce((s, [, c]) => s + c, 0);

  const body = `<main class="shell">
    <span class="eyebrow">Contributors · 谁的工作让这站存在</span>
    <h1>致<em>所有原作者</em>。</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch">
      这站的 156 篇笔记不是原创研究——它们是 ${topVenues.length} 个会议/期刊上 ${totalLab} 篇论文的入门转写。
      所有的科学贡献都属于这些原论文的作者。
    </p>
    <hr class="ornament"/>

    <section>
      <h2>原始论文出处</h2>
      <p style="color:var(--ink-soft);font-size:0.95rem">每条 venue 对应一群作者，他们的工作让这站有内容可写。点击跳到该 venue 在 [/venues/](/venues/) 的对应位置。</p>
      <div class="venue-bars" style="margin-top:1rem">
        ${topVenues.map(([v, c]) => {
          const pct = (c / topVenues[0][1]) * 100;
          return `<div class="venue-bar-row" style="cursor:default">
            <span class="venue-name">${v}</span>
            <div class="venue-bar-track"><div class="venue-bar-fill" style="width:${pct}%"></div></div>
            <span class="venue-count">${c}</span>
          </div>`;
        }).join("")}
      </div>
    </section>

    <hr class="ornament"/>

    <section>
      <h2>怎么找到原作者</h2>
      <p style="color:var(--ink-soft);font-size:0.95rem;line-height:1.6">每篇笔记顶部的 <strong>来源</strong> 字段都指向 PDF。在论文 PDF 第 1 页能看到完整作者列表。如果你引用某个想法，请引用<strong>原论文</strong>而不是这站。</p>
      <p style="color:var(--ink-soft);font-size:0.95rem;line-height:1.6">如果你是其中一位原作者，希望调整笔记内容（比如更准确的定义、补充关键引用、纠正误解）：</p>
      <ul style="font-family:var(--font-mono);font-size:0.9rem;color:var(--ink-mute)">
        <li><a href="https://github.com/estelledc/embodied-ai-reading-station/issues">提 GitHub issue</a></li>
        <li>或 fork + PR</li>
      </ul>
    </section>

    <hr class="ornament"/>

    <section>
      <h2>这站本身的贡献</h2>
      <p style="color:var(--ink-soft);font-size:0.95rem;line-height:1.6">
        这站做的事是<strong>翻译 + 重组</strong>：把论文的核心思想拆成入门读者能消化的语言，配生活类比，标关键数字。所有功劳归原作者；所有笔记错误归这站。
      </p>
      <p style="color:var(--ink-soft);font-size:0.95rem;line-height:1.6">
        基础设施（构建系统、设计、可视化）由 Jason 开发，开源 MIT 协议。
      </p>
    </section>
  </main>`;
  return page({ title: "Contributors — Embodied AI Reading", body, active: "about" });
}

// --- changelog (从 git log 自动生成) ---------------------------------------
import { execSync as _execSync } from "node:child_process";
function buildChangelog() {
  let lines = "";
  try {
    const out = _execSync(
      `git -C "${ROOT}" log -50 --pretty=format:'%h|%ad|%s' --date=short`,
      { encoding: "utf8" }
    );
    lines = out;
  } catch (e) {
    return null; // 仓库外或 git 不可用
  }
  const entries = lines.split("\n").filter(Boolean).map(l => {
    const [hash, date, subject] = l.split("|");
    let kind = "other";
    if (/^feat[:(]/.test(subject)) kind = "feat";
    else if (/^fix[:(]/.test(subject)) kind = "fix";
    else if (/^docs?[:(]/.test(subject)) kind = "docs";
    else if (/^refactor[:(]/.test(subject)) kind = "refactor";
    else if (/^perf[:(]/.test(subject)) kind = "perf";
    else if (/^chore[:(]/.test(subject)) kind = "chore";
    else if (/^ci[:(]/.test(subject)) kind = "ci";
    return { hash, date, subject, kind };
  });

  // 按日期分组
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }
  const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

  let body = `<main class="shell">
    <span class="eyebrow">Changelog · 站点更新日志</span>
    <h1><em>${entries.length} 个</em>提交，最近 ${dates.length} 天。</h1>
    <p style="color:var(--ink-soft);max-width:48ch;line-height:1.55">
      自动从 git log 生成。前缀 feat / fix / docs / perf 标签自动着色。
    </p>
    <hr class="ornament"/>`;

  for (const date of dates) {
    body += `<section class="cl-day">
      <h2 class="cl-date">${date}</h2>
      <ul class="cl-list">
        ${byDate.get(date).map(e => `<li class="cl-item">
          <span class="cl-tag cl-tag-${e.kind}">${e.kind}</span>
          <span class="cl-subject">${e.subject.replace(/^\w+[:(].*?:\s*/, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
          <a class="cl-hash" href="https://github.com/estelledc/embodied-ai-reading-station/commit/${e.hash}">${e.hash}</a>
        </li>`).join("")}
      </ul>
    </section>`;
  }
  body += `</main>`;
  return page({ title: "Changelog — Embodied AI Reading", body, active: "changelog" });
}

// --- quality dashboard (作者用，不放主导航) ---------------------------------
function buildQuality(notes) {
  function inspect(n) {
    const issues = [];
    const wc = n.wordCount || 0;
    if (wc < 1500) issues.push({ kind: "thin", desc: `字数偏少 (${wc})` });
    else if (wc > 12000) issues.push({ kind: "thick", desc: `字数过多 (${wc})` });
    if (!n.tldr || n.tldr.length < 20) issues.push({ kind: "no-tldr", desc: "缺 TL;DR" });
    if (!n.year) issues.push({ kind: "no-year", desc: "缺 year frontmatter" });
    if (!n.venue) issues.push({ kind: "no-venue", desc: "缺 venue frontmatter" });
    const sceneImg = path.join(SITE, "src", "images", "inline", `${n.slug}-scene.webp`);
    const methodImg = path.join(SITE, "src", "images", "inline", `${n.slug}-method.webp`);
    if (!fs.existsSync(sceneImg)) issues.push({ kind: "no-scene-img", desc: "缺 scene 图" });
    if (!fs.existsSync(methodImg)) issues.push({ kind: "no-method-img", desc: "缺 method 图" });
    if (!n.tags || n.tags.length === 0) issues.push({ kind: "no-tags", desc: "无 tag 命中" });
    return issues;
  }

  const flagged = notes.map(n => ({ n, issues: inspect(n) })).filter(x => x.issues.length > 0);
  flagged.sort((a, b) => b.issues.length - a.issues.length);

  const issueTypeCount = new Map();
  for (const { issues } of flagged) for (const i of issues) issueTypeCount.set(i.kind, (issueTypeCount.get(i.kind) || 0) + 1);

  let body = `<main class="shell">
    <span class="eyebrow">Quality · 作者返工清单</span>
    <h1><em>${flagged.length} 篇</em>笔记需要<em>关注</em>。</h1>
    <p style="font-size:1rem;color:var(--ink-soft);max-width:48ch;line-height:1.55">
      这是给作者看的页，扫所有笔记的字数/前置元数据/图片，列出可改进项。读者不需要看这页。
    </p>

    <div class="quality-summary">
      ${[...issueTypeCount.entries()].sort((a, b) => b[1] - a[1]).map(([kind, count]) => `
        <div class="qs-cell">
          <span class="qs-num">${count}</span>
          <span class="qs-kind">${kind}</span>
        </div>
      `).join("")}
    </div>

    <hr class="ornament"/>

    <table class="quality-table">
      <thead><tr><th>№</th><th>title</th><th>topic</th><th>字数</th><th>问题</th></tr></thead>
      <tbody>
        ${flagged.map(({ n, issues }) => `<tr>
          <td class="cell-year">${String(n.num).padStart(3, "0")}</td>
          <td class="cell-title"><a href="${url(`/papers/${n.slug}/`)}">${n.title.slice(0, 60)}${n.title.length > 60 ? "…" : ""}</a></td>
          <td class="cell-venue">${n.topicLabel || ""}</td>
          <td class="cell-year">${n.wordCount || 0}</td>
          <td class="cell-tldr">${issues.map(i => `<span class="q-tag q-${i.kind}">${i.desc}</span>`).join(" ")}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </main>`;
  return page({ title: "Quality — Embodied AI Reading", body, active: "quality" });
}

// --- stats dashboard --------------------------------------------------------
function buildStats(notes, backlinkMap = new Map()) {
  const total = notes.length;
  const totalWords = notes.reduce((s, n) => s + (n.wordCount || 0), 0);
  const totalMinutes = notes.reduce((s, n) => s + (n.readingTime || 0), 0);
  const years = notes.map(n => Number(n.year)).filter(Boolean);
  const yearMin = Math.min(...years);
  const yearMax = Math.max(...years);

  // 按 era
  const eraCount = { founder: 0, classic: 0, frontier: 0 };
  for (const n of notes) eraCount[n.era || "classic"]++;

  // 按 topic
  const topicCount = new Map();
  for (const n of notes) topicCount.set(n.topic, (topicCount.get(n.topic) || 0) + 1);

  // 按 year
  const yearCount = new Map();
  for (const n of notes) {
    if (!n.year) continue;
    yearCount.set(Number(n.year), (yearCount.get(Number(n.year)) || 0) + 1);
  }

  // 按 difficulty
  const diffCount = new Map();
  for (const n of notes) {
    const d = (n.difficulty || "").length || 2;
    diffCount.set(d, (diffCount.get(d) || 0) + 1);
  }

  // 按 wordCount 桶
  const lengthBuckets = { "<2k": 0, "2-4k": 0, "4-6k": 0, "6k+": 0 };
  for (const n of notes) {
    const w = n.wordCount || 0;
    if (w < 2000) lengthBuckets["<2k"]++;
    else if (w < 4000) lengthBuckets["2-4k"]++;
    else if (w < 6000) lengthBuckets["4-6k"]++;
    else lengthBuckets["6k+"]++;
  }

  function bar(count, max) {
    const pct = (count / max) * 100;
    return `<div class="vbar"><div class="vbar-fill" style="width:${pct}%"></div><span class="vbar-num">${count}</span></div>`;
  }

  const maxYear = Math.max(...yearCount.values(), 1);
  const maxTopic = Math.max(...topicCount.values(), 1);
  const maxDiff = Math.max(...diffCount.values(), 1);
  const maxLen = Math.max(...Object.values(lengthBuckets), 1);
  const maxEra = Math.max(...Object.values(eraCount), 1);

  let body = `<main class="shell">
    <span class="eyebrow">Stats · 站点数据</span>
    <h1>${total} 篇笔记的<em>多角度</em>切片。</h1>
    <p style="font-size:1.05rem;color:var(--ink-soft);max-width:48ch;line-height:1.55">
      整站宏观看上去什么样：年代分布、字数长度、难度梯度、era 比例、topic 比例。
      每条直方都点击后跳转对应入口。
    </p>

    <hr class="ornament"/>

    <div class="big-stats">
      <div><span class="bs-num">${total}</span><span class="bs-label">总笔记数</span></div>
      <div><span class="bs-num">${totalWords.toLocaleString()}</span><span class="bs-label">总字数</span></div>
      <div><span class="bs-num">${Math.round(totalMinutes / 60)}h</span><span class="bs-label">总阅读时长</span></div>
      <div><span class="bs-num">${yearMin}–${yearMax}</span><span class="bs-label">年份跨度</span></div>
    </div>

    <hr class="ornament"/>

    <section class="stats-section">
      <h2>按年份</h2>
      <div class="stats-bars">
        ${[...yearCount.entries()].sort((a, b) => a[0] - b[0]).map(([y, c]) => `
          <div class="stats-row">
            <span class="stats-label">${y}</span>
            ${bar(c, maxYear)}
          </div>
        `).join("")}
      </div>
    </section>

    <section class="stats-section">
      <h2>按 era</h2>
      <div class="stats-bars">
        <div class="stats-row"><span class="stats-label">祖师爷</span>${bar(eraCount.founder, maxEra)}</div>
        <div class="stats-row"><span class="stats-label">经典</span>${bar(eraCount.classic, maxEra)}</div>
        <div class="stats-row"><span class="stats-label">前沿</span>${bar(eraCount.frontier, maxEra)}</div>
      </div>
    </section>

    <section class="stats-section">
      <h2>按主题</h2>
      <div class="stats-bars">
        ${TOPIC_ORDER.map(t => `
          <div class="stats-row">
            <a class="stats-label" href="${url(`/topics/${t.id}/`)}">${t.roman}. ${t.label}</a>
            ${bar(topicCount.get(t.id) || 0, maxTopic)}
          </div>
        `).join("")}
      </div>
    </section>

    <section class="stats-section">
      <h2>按难度</h2>
      <div class="stats-bars">
        ${[...diffCount.entries()].sort((a, b) => a[0] - b[0]).map(([d, c]) => `
          <div class="stats-row">
            <span class="stats-label">${"★".repeat(d)}</span>
            ${bar(c, maxDiff)}
          </div>
        `).join("")}
      </div>
    </section>

    <section class="stats-section">
      <h2>按字数</h2>
      <div class="stats-bars">
        ${Object.entries(lengthBuckets).map(([k, c]) => `
          <div class="stats-row">
            <span class="stats-label">${k}</span>
            ${bar(c, maxLen)}
          </div>
        `).join("")}
      </div>
    </section>

    ${(() => {
      // Top reads: 按 backlinks 数排，取前 10
      if (backlinkMap.size === 0) return "";
      const ranked = notes
        .map(n => ({ n, count: (backlinkMap.get(n.slug) || []).length }))
        .filter(x => x.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      if (!ranked.length) return "";
      const max = ranked[0].count;
      return `<section class="stats-section">
        <h2>被引用最多 top 10</h2>
        <p style="color:var(--ink-soft);font-size:0.9rem;margin:0 0 1rem">在其他笔记里被提及次数</p>
        <div class="stats-bars">
          ${ranked.map(({ n, count }) => `<div class="stats-row">
            <a class="stats-label" href="${url(`/papers/${n.slug}/`)}" style="font-family:var(--font-display);font-weight:700;font-size:0.95rem">${n.title.split(":")[0].slice(0, 40)}</a>
            <div class="vbar"><div class="vbar-fill" style="width:${count/max*100}%"></div><span class="vbar-num">${count}</span></div>
          </div>`).join("")}
        </div>
      </section>`;
    })()}

    ${(() => {
      // 字数最多 top 10
      const longest = [...notes].sort((a, b) => (b.wordCount || 0) - (a.wordCount || 0)).slice(0, 10);
      if (!longest.length) return "";
      const max = longest[0].wordCount || 1;
      return `<section class="stats-section">
        <h2>最长 top 10</h2>
        <p style="color:var(--ink-soft);font-size:0.9rem;margin:0 0 1rem">字数最多的深度笔记</p>
        <div class="stats-bars">
          ${longest.map(n => `<div class="stats-row">
            <a class="stats-label" href="${url(`/papers/${n.slug}/`)}" style="font-family:var(--font-display);font-weight:700;font-size:0.95rem">${n.title.split(":")[0].slice(0, 40)}</a>
            <div class="vbar"><div class="vbar-fill" style="width:${(n.wordCount||0)/max*100}%"></div><span class="vbar-num">${n.wordCount || 0}</span></div>
          </div>`).join("")}
        </div>
      </section>`;
    })()}

    <hr class="ornament"/>

    <section class="stats-section my-stats" id="eai-my-stats" hidden>
      <span class="eyebrow" style="color:var(--coral)">你的数据</span>
      <h2>你的<em>阅读快照</em>。</h2>
      <p style="color:var(--ink-soft);font-size:0.95rem;line-height:1.55">完全在浏览器本地。清缓存即清空。</p>
      <div class="big-stats">
        <div><span class="bs-num" data-my-read>0</span><span class="bs-label">已读篇数</span></div>
        <div><span class="bs-num" data-my-streak>0</span><span class="bs-label">连续天数</span></div>
        <div><span class="bs-num" data-my-words>0</span><span class="bs-label">已读字数</span></div>
        <div><span class="bs-num" data-my-pct>0%</span><span class="bs-label">完成度</span></div>
        <div style="opacity:0.45"><span class="bs-num" data-my-speed>—</span><span class="bs-label">字 / 分钟</span></div>
      </div>
      <div class="my-topic-bars" data-my-topic-bars></div>
      <div class="my-blindspot" data-my-blindspot hidden>
        <div class="mb-eyebrow">阅读盲点 → 这些主题你还没碰</div>
        <ul data-mb-list></ul>
      </div>
    </section>
    <script id="eai-papers-data" type="application/json">${JSON.stringify(notes.map(n => ({
      slug: n.slug, num: n.num, title: n.title, topic: n.topicLabel, era: n.era || "classic",
      difficulty: (n.difficulty || "").length || 2,
      tldr: (n.tldr || "").slice(0, 120),
      url: url(`/papers/${n.slug}/`),
    })))}</script>
  </main>`;
  return page({ title: "Stats — Embodied AI Reading", body, active: "stats" });
}

// --- venue stats ------------------------------------------------------------
function buildVenueStats(notes) {
  const venueCount = new Map();
  let unknown = 0;
  for (const n of notes) {
    const v = (n.venue || "").trim();
    if (!v) unknown++;
    else venueCount.set(v, (venueCount.get(v) || 0) + 1);
  }
  const venues = [...venueCount.entries()].sort((a, b) => b[1] - a[1]);
  const max = Math.max(...venueCount.values(), 1);

  // 按主题分类 venue（粗分）
  const venueByCategory = {
    "机器人 (CoRL/RSS/ICRA/IROS)": [],
    "AI 大会 (NeurIPS/ICLR/ICML)": [],
    "视觉 (CVPR/ICCV/ECCV)": [],
    "NLP/语言": [],
    "系统/网络 (MobiCom/SIGCOMM/UIST)": [],
    "其他": [],
  };
  const robotRe = /CoRL|RSS|ICRA|IROS/i;
  const aiRe = /NeurIPS|ICLR|ICML/i;
  const cvRe = /CVPR|ICCV|ECCV|SIGGRAPH/i;
  const nlpRe = /ACL|EMNLP|NAACL/i;
  const sysRe = /MobiCom|SIGCOMM|UIST|CHI|MobiSys|SenSys|MM\s/i;
  for (const [v, c] of venues) {
    let cat = "其他";
    if (robotRe.test(v)) cat = "机器人 (CoRL/RSS/ICRA/IROS)";
    else if (aiRe.test(v)) cat = "AI 大会 (NeurIPS/ICLR/ICML)";
    else if (cvRe.test(v)) cat = "视觉 (CVPR/ICCV/ECCV)";
    else if (nlpRe.test(v)) cat = "NLP/语言";
    else if (sysRe.test(v)) cat = "系统/网络 (MobiCom/SIGCOMM/UIST)";
    venueByCategory[cat].push([v, c]);
  }

  const total = notes.length;
  let body = `<main class="shell">
    <span class="eyebrow">Venues · 发表场所分布</span>
    <h1>${venueCount.size} 个会议/期刊，<em>${total - unknown} 篇</em>已标记。</h1>
    <p style="font-size:1.05rem;line-height:1.55;color:var(--ink-soft);max-width:48ch">
      具身 AI 横跨机器人会（CoRL/RSS/ICRA）、AI 大会（NeurIPS/ICLR/ICML）、视觉会（CVPR）、感知系统会（MobiCom/SIGCOMM）。
      看这页能直观知道：你想发哪种 venue，得读哪几篇代表作。
    </p>
    <hr class="ornament"/>`;
  for (const [cat, list] of Object.entries(venueByCategory)) {
    if (list.length === 0) continue;
    const catTotal = list.reduce((s, [, c]) => s + c, 0);
    body += `<section style="margin:2rem 0">
      <h2 style="margin-bottom:0.4rem">${cat} <span style="color:var(--ink-faint);font-size:0.6em">${catTotal} 篇</span></h2>
      <div class="venue-bars">`;
    for (const [v, c] of list) {
      const pct = (c / max) * 100;
      body += `<a class="venue-bar-row" href="${url("/compare/")}#venue-${encodeURIComponent(v)}">
        <span class="venue-name">${v}</span>
        <div class="venue-bar-track">
          <div class="venue-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="venue-count">${c}</span>
      </a>`;
    }
    body += `</div></section>`;
  }
  if (unknown > 0) {
    body += `<p style="color:var(--ink-faint);font-size:0.85rem">${unknown} 篇 venue 未标记，未计入。</p>`;
  }
  body += `</main>`;
  return page({ title: "Venues — Embodied AI Reading", body, active: "venues" });
}

// --- tag co-occurrence heatmap ---------------------------------------------
function buildHeatmap(notes) {
  // 收集所有 tag
  const tagCounts = new Map();
  for (const n of notes) for (const t of (n.tags || [])) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);

  // 共现矩阵
  const co = new Map();
  function key(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
  for (const n of notes) {
    const ts = n.tags || [];
    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        co.set(key(ts[i], ts[j]), (co.get(key(ts[i], ts[j])) || 0) + 1);
      }
    }
  }
  let maxCo = 0;
  for (const v of co.values()) if (v > maxCo) maxCo = v;

  // 构造单元格
  const N = tags.length;
  const cells = [];
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      let count;
      if (i === j) count = tagCounts.get(tags[i]);
      else count = co.get(key(tags[i], tags[j])) || 0;
      const intensity = i === j ? Math.min(1, count / Math.max(...tagCounts.values()))
                                : (maxCo > 0 ? count / maxCo : 0);
      cells.push({ i, j, count, intensity, ti: tags[i], tj: tags[j] });
    }
  }

  const SIZE = 28;
  const PAD = 130;
  const W = PAD + N * SIZE + 20;
  const H = PAD + N * SIZE + 20;

  let body = `<main class="shell" style="max-width:none;padding:1.5rem">
    <span class="eyebrow">Heatmap · 标签共现矩阵</span>
    <h1><em>${N} × ${N}</em> 共现强度。</h1>
    <p style="font-size:1.05rem;line-height:1.55;color:var(--ink-soft);max-width:48ch">
      格子越深，两个 tag 共同出现的论文越多。对角线 = 该 tag 自身论文数。看这页能发现"谁经常和谁一起出现"——比如 transformer × VLA 高，RF × tactile 几乎为零。
    </p>
    <div style="overflow-x:auto;margin-top:2rem">
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%">
        ${tags.map((t, i) => `<text x="${PAD - 6}" y="${PAD + i * SIZE + SIZE / 2 + 4}" text-anchor="end" font-family="var(--font-mono)" font-size="11" fill="var(--ink-mute)">${t}</text>`).join("")}
        ${tags.map((t, i) => `<g transform="translate(${PAD + i * SIZE + SIZE / 2}, ${PAD - 6}) rotate(-45)"><text font-family="var(--font-mono)" font-size="11" fill="var(--ink-mute)">${t}</text></g>`).join("")}
        ${cells.map(c => {
          const x = PAD + c.j * SIZE;
          const y = PAD + c.i * SIZE;
          const fillColor = c.i === c.j
            ? `rgba(233, 185, 74, ${c.intensity})`  // mustard 对角线
            : `rgba(237, 111, 92, ${c.intensity})`; // coral 共现
          return `<rect x="${x}" y="${y}" width="${SIZE - 1}" height="${SIZE - 1}" fill="${fillColor}" stroke="var(--paper-dark)" stroke-width="0.5">
            <title>${c.ti}${c.i === c.j ? "" : " × " + c.tj}: ${c.count}</title>
          </rect>${c.count >= 3 ? `<text x="${x + SIZE / 2}" y="${y + SIZE / 2 + 3}" text-anchor="middle" font-family="var(--font-mono)" font-size="9" fill="var(--ink)">${c.count}</text>` : ""}`;
        }).join("")}
      </svg>
    </div>
    <p style="margin-top:1.5rem;color:var(--ink-faint);font-size:0.85rem;font-family:var(--font-mono)">
      ★ 对角线 mustard = 该 tag 论文数 / 非对角 coral = 共现数 / 数字 ≥3 才显示
    </p>
  </main>`;
  return page({ title: "Heatmap — Embodied AI Reading", body, active: "heatmap" });
}

// --- 404 page ---------------------------------------------------------------
function build404(notes) {
  const random6 = [...notes]
    .filter(n => n.status !== "missing" && n.status !== "stub")
    .slice(0, 6); // 用前 6 篇当 fallback 推荐
  const body = `<main class="shell" style="text-align:center;padding-top:5rem;padding-bottom:5rem">
    <div style="font-family:var(--font-display);font-style:italic;font-weight:800;font-size:9rem;line-height:1;color:var(--coral);margin-bottom:1rem">404</div>
    <h1 style="margin-top:0">这页<em>没找到</em>。</h1>
    <p style="font-size:1.15rem;line-height:1.55;color:var(--ink-soft);max-width:42ch;margin:1rem auto 2rem">
      可能是链接拼错了，可能是页面被重命名了，也可能是这站还没那个内容。下面这几条入口或许能找到你要的。
    </p>
    <div style="display:flex;gap:0.6rem;justify-content:center;flex-wrap:wrap;margin-bottom:3rem">
      <a href="${url("/")}" style="display:inline-block;padding:0.7rem 1.4rem;background:var(--ink);color:var(--paper);text-decoration:none;font-family:var(--font-mono);font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase">回首页</a>
      <a href="${url("/topics/")}" style="display:inline-block;padding:0.7rem 1.4rem;border:1px solid var(--ink);color:var(--ink);text-decoration:none;font-family:var(--font-mono);font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase">浏览主题</a>
      <a href="${url("/glossary/")}" style="display:inline-block;padding:0.7rem 1.4rem;border:1px solid var(--ink);color:var(--ink);text-decoration:none;font-family:var(--font-mono);font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase">查术语字典</a>
      <a href="${url("/graph/")}" style="display:inline-block;padding:0.7rem 1.4rem;border:1px solid var(--ink);color:var(--ink);text-decoration:none;font-family:var(--font-mono);font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase">看关系图</a>
    </div>
    <hr class="ornament"/>

    <aside id="eai-404-suggest" hidden style="margin:2rem auto;max-width:38rem;text-align:left;background:var(--paper-warm);border:1px solid var(--coral);padding:1.2rem 1.4rem">
      <div class="eyebrow" style="color:var(--coral);margin-bottom:0.5rem">想找的可能是 ↓</div>
      <ol id="eai-404-list" style="list-style:none;padding:0;margin:0"></ol>
    </aside>

    <p class="eyebrow" style="margin-top:2rem">或者直接挑一篇读 ↘</p>
    <div class="papers-grid" style="margin-top:1.5rem;text-align:left">
      ${random6.map(n => `<article class="paper-card" style="min-height:auto;padding:1rem">
        <h3 style="margin:0 0 0.4rem"><a href="${url(`/papers/${n.slug}/`)}">${n.title.split(":")[0]}</a></h3>
        <p style="margin:0;font-size:0.86rem;color:var(--ink-soft);line-height:1.4">${(n.tldr || "").slice(0, 80)}…</p>
      </article>`).join("")}
    </div>

    <script>
    (function(){
      var stylesLink = document.querySelector('link[href*="/styles.css"]');
      var base = stylesLink ? stylesLink.getAttribute('href').replace(/\\/styles\\.css$/, '') : '';
      // 提取 URL 末段当 query
      var path = location.pathname.replace(base, '').replace(/\\/$/, '');
      var seg = path.split('/').filter(Boolean).pop() || '';
      if (!seg || seg === '404') return;
      var q = seg.replace(/[-_]/g, ' ').toLowerCase();
      fetch(base + '/data/papers.json')
        .then(function(r){ return r.json(); })
        .then(function(papers){
          var scored = papers.map(function(p){
            var hay = (p.title + ' ' + p.slug).toLowerCase();
            var s = 0;
            q.split(/\\s+/).forEach(function(w){
              if (!w) return;
              if (hay.indexOf(w) >= 0) s += w.length;
            });
            // slug 完全/部分匹配加权
            if (p.slug === seg) s += 100;
            else if (p.slug.indexOf(seg) >= 0 || seg.indexOf(p.slug) >= 0) s += 50;
            return { p: p, s: s };
          }).filter(function(x){ return x.s > 0; });
          scored.sort(function(a,b){ return b.s - a.s; });
          var top = scored.slice(0, 5);
          if (!top.length) return;
          var aside = document.getElementById('eai-404-suggest');
          var list = document.getElementById('eai-404-list');
          list.innerHTML = top.map(function(x){
            return '<li style="padding:0.4rem 0;border-bottom:1px dashed var(--paper-dark)">' +
              '<a href="' + x.p.url.replace('https://estelledc.github.io/embodied-ai-reading-station', base) + '" style="text-decoration:none;color:var(--ink);font-family:var(--font-display);font-weight:700">' + x.p.title + '</a>' +
              '<span style="display:block;font-family:var(--font-mono);font-size:0.74rem;color:var(--ink-faint);margin-top:0.2rem">' + x.p.topic + ' · ' + (x.p.year || '') + '</span></li>';
          }).join('');
          aside.hidden = false;
        })
        .catch(function(){});
    })();
    </script>
  </main>`;
  return page({ title: "404 — 这页没找到 — Embodied AI Reading", body, active: "" });
}

// --- about page -------------------------------------------------------------
function buildAbout(notes = []) {
  // Compute numbers from notes if available
  let bigNums = "";
  if (notes.length) {
    let commitCount = "?";
    try {
      commitCount = _execSync(`git -C "${ROOT}" rev-list --count HEAD`, { encoding: "utf8" }).trim();
    } catch {}
    const wc = notes.reduce((s, n) => s + (n.wordCount || 0), 0);
    const ys = notes.map(n => Number(n.year)).filter(Boolean);
    bigNums = `<div class="big-stats" style="margin:1.5rem 0 2rem">
      <div><span class="bs-num">${notes.length}</span><span class="bs-label">论文笔记</span></div>
      <div><span class="bs-num">${wc.toLocaleString()}</span><span class="bs-label">总字数</span></div>
      <div><span class="bs-num">${commitCount}</span><span class="bs-label">git commits</span></div>
      <div><span class="bs-num">${ys.length ? Math.min(...ys) + "–" + Math.max(...ys) : "—"}</span><span class="bs-label">年份跨度</span></div>
    </div>`;
  }
  const body = `<main class="note-shell">
    <span class="eyebrow">Colophon · 这站是怎么诞生的</span>
    <h1>About this <em>reading station</em></h1>
    ${pageHeroHtml("about", "Typewriter at a wooden desk — colophon illustration")}
    ${bigNums}
    <div class="note-content" style="max-width:68ch">
      <p>这站是为想读懂顶会论文、但还在入门阶段的人做的。<strong>具身智能（Embodied AI）</strong>讲的是「怎么让机器人有身体地融入世界」——它要看见、要听见、要听懂指令、要决定下一步怎么做。听起来像科幻，但 2024-2025 已经在论文里跑通了一大半。</p>
      <p>项目源于一个本科生科研任务：实验室给了 13 篇代表论文，覆盖 7 个主题。我把它们重写成<strong>能读懂的版本</strong>——保留所有数字和方法，但用基础的类比解释每个新词。</p>
      <p>七个主题是这样：</p>
      <ul>
        <li><strong>I. VLM Foundation</strong> — 视觉与语言对齐的基座模型</li>
        <li><strong>II. High-Level Planning</strong> — 让 LLM 输出"做得到"的指令</li>
        <li><strong>III. End-to-End VLA</strong> — 直接从图像 + 指令生成动作</li>
        <li><strong>IV. Multimodal Ecology</strong> — 语音、触觉、3D 等更多输入</li>
        <li><strong>V. Video World Model Policy</strong> — 用视频生成模型当机器人策略</li>
        <li><strong>VI. RF Perception & Mapping</strong> — 用毫米波雷达"看穿"墙和遮挡</li>
        <li><strong>VII. Auditory & Acoustic</strong> — 让设备在嘈杂环境中听清</li>
      </ul>

      <h2>Open data</h2>
      <p>站点数据全部以 JSON 公开，CC BY 4.0 协议。如果你想做二次分析、可视化或 LLM 训练数据：</p>
      <ul style="font-family:var(--font-mono);font-size:0.9rem">
        <li><a href="${url("/data/index.json")}">/data/index.json</a> — manifest（计数 + endpoint URL）</li>
        <li><a href="${url("/data/papers.json")}">/data/papers.json</a> — 156 篇全部元数据 + tldr</li>
        <li><a href="${url("/data/tags.json")}">/data/tags.json</a> — 21 tag 频次 + 共现矩阵</li>
        <li><a href="${url("/data/topics.json")}">/data/topics.json</a> — 11 主题 + primer</li>
      </ul>

      <h2>Workflow</h2>
      <ol>
        <li><code>lr pdf bundle paper.pdf</code> — 把 PDF 转成带图 markdown</li>
        <li><code>notes/&lt;slug&gt;.md</code> — 用统一模板写精读笔记</li>
        <li><code>node site/scripts/build.mjs</code> — 期刊风 HTML 渲染</li>
        <li>GitHub Actions → GitHub Pages — 部署</li>
      </ol>

      <h2>Visual reference</h2>
      <p>视觉风格借鉴 <a href="https://github.com/open-design/open-design">open-design</a> 的两个 design system：<strong>atelier-zero</strong>（暖纸 + 珊瑚红 + 罗马数字章节 + 三族字体混排）+ <strong>warm-editorial</strong>（GT Sectra serif + 长读节奏）。色板和字体规则严格按 DESIGN.md 提供的 token 实现。</p>

      <h2>Stack</h2>
      <ul>
        <li>Pure HTML + CSS, no framework — 156 张静态页面</li>
        <li>Markdown → HTML via <code>marked</code> + <code>gray-matter</code></li>
        <li>Build script: <code>site/scripts/build.mjs</code> 单文件 ~2400 行 Node</li>
        <li>搜索: <a href="https://pagefind.app">Pagefind</a> 全文索引</li>
        <li>数学: <a href="https://katex.org">KaTeX</a> CDN</li>
        <li>可视化: <a href="https://d3js.org">D3.js v7</a>（force-directed graph）</li>
        <li>PWA: 自定义 service worker 离线缓存</li>
        <li>部署: GitHub Pages + Actions（每 push 自动 build → healthcheck → deploy）</li>
      </ul>

      <h2>Colophon</h2>
      <p>设计参照：<a href="https://github.com/open-design/open-design">open-design</a> 的 <strong>atelier-zero</strong> design system。</p>
      <ul>
        <li><strong>字体</strong>：Inter Tight（正文 sans）/ Playfair Display（display italic）/ JetBrains Mono（mono）— 全部 Google Fonts</li>
        <li><strong>颜色</strong>：暖纸 ivory <code>#efe7d2</code> / 珊瑚红 <code>#ed6f5c</code> / 芥末黄 <code>#e9b94a</code> / 橄榄 <code>#6e7448</code> / 墨色 <code>#15140f</code></li>
        <li><strong>图标记法</strong>：罗马数字章节（I-XI）/ Plate Nº 编号 / 章节末尾 ◼</li>
      </ul>

      <h2>AI 工具</h2>
      <p>这站建成借助了几个 AI 工具：</p>
      <ul>
        <li><strong>Claude Code</strong>：主要的代码生成 + 笔记重写工具</li>
        <li><strong>Codex CLI</strong>：${notes_count_estimate()}+ 张内嵌图片生成（场景图 + 方法图，全部 16:9 webp）</li>
        <li><strong>MinerU + pdftotext</strong>：PDF → markdown 解析</li>
        <li><strong>lr (LightRead)</strong>：arXiv 检索 + PDF bundle 工具</li>
      </ul>
      <p>所有 AI 输出都经过手动校对。错误归人不归 AI。</p>

      <h2>License</h2>
      <ul>
        <li><strong>笔记内容</strong>: <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> — 引用请保留作者名</li>
        <li><strong>站点代码</strong>: <a href="https://opensource.org/licenses/MIT">MIT</a></li>
        <li><strong>原论文 PDF + 论文 figure 图</strong>: 版权归原作者，本站只作学习摘要</li>
        <li><strong>codex 生成图片</strong>: CC BY 4.0（同笔记）</li>
      </ul>

      <h2>Contact / 反馈</h2>
      <p>有几种方式联系：</p>
      <ul>
        <li><strong>笔记错误 / 想加论文 / 想改风格</strong>：<a href="https://github.com/estelledc/embodied-ai-reading-station/issues/new">GitHub issue</a></li>
        <li><strong>修正建议（你是原作者）</strong>：同上 issue 或 PR；引用论文 slug 即可</li>
        <li><strong>讨论 / 想法</strong>：<a href="https://github.com/estelledc/embodied-ai-reading-station/discussions">GitHub Discussions</a></li>
      </ul>
      <p style="color:var(--ink-soft);font-size:0.9rem">这是个人项目，不保证回复速度。但每个 issue 都会读。</p>

      <h2>Cite this site</h2>
      <p>整站作为参考资料引用：</p>
      <pre style="background:var(--bone);border:1px solid var(--paper-dark);padding:0.8rem 1rem;font-family:var(--font-mono);font-size:0.78rem;overflow-x:auto">@misc{embodied_ai_reading_station,
  title  = {Embodied AI Reading Station},
  author = {Jason},
  year   = {2026},
  url    = {https://estelledc.github.io/embodied-ai-reading-station/},
  note   = {156 readable Chinese notes on embodied AI papers}
}</pre>
      <p style="color:var(--ink-soft);font-size:0.9rem">单篇引用请用论文页底部的 BibTeX 块。</p>
    </div>
  </main>`;
  return page({ title: "About — Embodied AI Reading", body, active: "about" });
}

function notes_count_estimate() {
  // 实时数 inline 图（webp）
  try {
    const dir = path.join(SITE, "src", "images", "inline");
    if (!fs.existsSync(dir)) return 590;
    const count = fs.readdirSync(dir).filter(f => f.endsWith(".webp") && !f.includes("-800")).length;
    return count;
  } catch { return 590; }
}

// --- learn pages (beginner supplements) -------------------------------------
function buildLearnIndex(pages) {
  // 优先卡：30-day path / FAQ / Math primer 突出推荐
  const featured = ["path", "faq", "math-primer"];
  const featuredPages = featured.map(s => pages.find(p => p.slug === s)).filter(Boolean);
  const others = pages.filter(p => !featured.includes(p.slug));

  const body = `<main class="shell">
    <span class="eyebrow">Start here · 入门轨道</span>
    <h1>论文是<em>终点</em>，不是起点。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:48ch;margin-top:1rem">
      156 篇顶会论文堆在那里。不知道从哪开始？先看下面这三张卡，每张回答一个具体问题。
    </p>

    ${featuredPages.length ? `<section class="learn-featured">
      <div class="lf-grid">
        ${featuredPages.map((p, i) => {
          const labels = { "path": "30 天路径", "faq": "新人 FAQ", "math-primer": "公式速查" };
          const subs = { "path": "每天读什么", "faq": "12 题最常问", "math-primer": "Σ ∇ 怎么读" };
          return `<a class="lf-card" href="${url(`/learn/${p.slug}/`)}">
            <span class="lf-num">${["I","II","III"][i] || ""}</span>
            <span class="lf-title">${labels[p.slug] || p.title}</span>
            <span class="lf-sub">${subs[p.slug] || p.intro || ""}</span>
          </a>`;
        }).join("")}
      </div>
    </section>` : ""}

    ${others.length ? `<hr class="ornament"/>
    <h2 style="font-family:var(--font-mono);font-size:0.9rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-mute);margin:2rem 0 1rem">其他入门资料</h2>
    <div class="papers-grid">
      ${others.map((p, i) => `<article class="paper-card" style="background:var(--paper-warm)">
        <span class="num">№ ${String(i + 1).padStart(2, "0")}</span>
        <span class="topic">Beginner Track</span>
        <h3><a href="${url(`/learn/${p.slug}/`)}">${p.title}</a></h3>
        <p>${p.intro || ""}</p>
      </article>`).join("")}
    </div>` : ""}
  </main>`;
  return page({ title: "Learn — Embodied AI Reading", body, active: "learn" });
}

function buildLearnPage(p, allPages) {
  const html = marked.parse(p.body);
  const otherLinks = allPages.filter(x => x.slug !== p.slug).map(x =>
    `<li style="margin-bottom:0.5rem"><a href="${url(`/learn/${x.slug}/`)}">${x.title}</a></li>`
  ).join("");

  const body = `<main class="note-shell">
    <span class="eyebrow">Learn · Beginner Track</span>
    <h1>${p.title}</h1>
    ${p.intro ? `<p style="font-family:var(--font-serif);font-style:italic;color:var(--ink-mute);font-size:1.1rem;margin-top:0.5rem">${p.intro}</p>` : ""}
    ${pageHeroHtml(p.slug, p.title)}
    <hr/>
    <div class="note-content">${html}</div>

    <hr style="margin-top:4rem"/>
    <details style="margin-top:1rem;font-family:var(--font-mono);font-size:0.85rem;color:var(--ink-mute)">
      <summary style="cursor:pointer">Other beginner pages</summary>
      <ul style="margin-top:1rem;font-family:var(--font-sans);font-size:0.95rem;list-style:none">${otherLinks}</ul>
    </details>
  </main>`;
  return page({ title: `${p.title} — Learn`, body, active: "learn" });
}

// --- compare page (per-topic side-by-side) ----------------------------------
function buildCompare(notes) {
  const eraRank = { founder: 0, classic: 1, frontier: 2 };
  let body = `<main class="shell">
    <span class="eyebrow">Compare · 同主题对比</span>
    <h1>同一<em>主题</em>下，<em>哪几篇</em>该先读？</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch;margin-top:1rem">
      把每个主题里的论文按 era 排一排，每条带年份和一句话定位。一眼看到"祖师爷 → 经典 → 前沿"的关系。
    </p>
    <hr class="ornament"/>`;

  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id).sort((a, b) => {
      const aPin = a.num <= 13 ? 0 : 1;
      const bPin = b.num <= 13 ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      if (aPin === 0) return a.num - b.num;
      const ea = eraRank[a.era] ?? 1;
      const eb = eraRank[b.era] ?? 1;
      if (ea !== eb) return ea - eb;
      return (Number(a.year) || 9999) - (Number(b.year) || 9999);
    });
    if (!inTopic.length) continue;
    body += `<section class="compare-section">
      <h2 class="compare-topic"><span class="topic-roman">${t.roman}</span> ${t.label} <span style="color:var(--ink-faint);font-weight:400;font-size:0.7em;margin-left:0.5rem">${t.subtitle}</span></h2>
      <table class="compare-table">
        <thead>
          <tr>
            <th>era</th><th>year</th><th>title</th><th>venue</th><th>tldr</th>
          </tr>
        </thead>
        <tbody>`;
    for (const n of inTopic) {
      const eraLabel = n.era === "founder" ? "祖师爷" : n.era === "frontier" ? "前沿" : "经典";
      const eraClass = n.era === "founder" ? "era-founder" : n.era === "frontier" ? "era-frontier" : "era-classic";
      body += `<tr>
        <td><span class="era-badge ${eraClass}">${eraLabel}</span></td>
        <td class="cell-year">${n.year || "—"}</td>
        <td class="cell-title"><a href="${url(`/papers/${n.slug}/`)}">${n.title}</a></td>
        <td class="cell-venue">${n.venue || ""}</td>
        <td class="cell-tldr">${n.tldr || ""}</td>
      </tr>`;
    }
    body += `</tbody></table></section>`;
  }
  body += `</main>`;
  return page({ title: "Compare — Embodied AI Reading", body, active: "compare" });
}

// --- RSS / Atom feed --------------------------------------------------------
function buildFeed(issuePages, notes) {
  const SITE_URL = "https://estelledc.github.io/embodied-ai-reading-station";
  const updated = new Date().toISOString();
  const xmlEscape = s => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  const entries = [];
  for (const p of issuePages) {
    const slug = p.slug.replace("issue-", "");
    const link = `${SITE_URL}/issues/${slug}/`;
    const pubDate = p.issueDate || updated;
    entries.push(`  <entry>
    <title>${xmlEscape(p.title)}</title>
    <link href="${link}"/>
    <id>${link}</id>
    <updated>${updated}</updated>
    <summary>${xmlEscape(p.intro || "")}</summary>
    <content type="html">${xmlEscape(`<p>${p.intro || ""}</p><p>Published: ${pubDate}</p><p><a href="${link}">Read full issue →</a></p>`)}</content>
  </entry>`);
  }

  // 也把最近 10 篇笔记加进 feed（按 num 倒序，新加的在前）
  const recentNotes = [...notes]
    .filter(n => n.status !== "missing" && n.status !== "stub")
    .sort((a, b) => (b.num || 0) - (a.num || 0))
    .slice(0, 10);
  for (const n of recentNotes) {
    const link = `${SITE_URL}/papers/${n.slug}/`;
    entries.push(`  <entry>
    <title>${xmlEscape(`№ ${n.num} · ${n.title}`)}</title>
    <link href="${link}"/>
    <id>${link}</id>
    <updated>${updated}</updated>
    <category term="${xmlEscape(n.topicLabel)}"/>
    <summary>${xmlEscape(n.tldr || "")}</summary>
  </entry>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-CN">
  <title>Embodied AI Reading Station</title>
  <subtitle>156 篇具身 AI 论文，用能读懂的语言重写</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE_URL}/" rel="alternate" type="text/html"/>
  <id>${SITE_URL}/</id>
  <updated>${updated}</updated>
  <author><name>Jason</name></author>
${entries.join("\n")}
</feed>
`;
}

// --- graph page (force-directed) --------------------------------------------
function buildGraph(notes) {
  // 构造图数据：每篇笔记一个节点，按 topic 着色；同 topic 内 era 升序两两连边
  const nodes = notes.map(n => ({
    id: n.slug,
    title: n.title.split(":")[0].trim(),
    topic: n.topic,
    topicLabel: n.topicLabel,
    era: n.era || "classic",
    year: n.year || null,
    num: n.num,
    difficulty: (n.difficulty || "").length || 2,
    tldr: (n.tldr || "").slice(0, 80),
    url: url(`/papers/${n.slug}/`),
  }));
  const links = [];
  const eraRank = { founder: 0, classic: 1, frontier: 2 };
  for (const t of TOPIC_ORDER) {
    const inTopic = nodes.filter(n => n.topic === t.id).sort((a, b) => {
      const ea = eraRank[a.era] - eraRank[b.era];
      if (ea !== 0) return ea;
      return (Number(a.year) || 9999) - (Number(b.year) || 9999);
    });
    for (let i = 0; i < inTopic.length - 1; i++) {
      links.push({ source: inTopic[i].id, target: inTopic[i + 1].id, kind: "topic-chain" });
    }
  }
  // 跨主题连：相邻 topic 的 founder 节点互连，串起'谁先有'
  for (let i = 0; i < TOPIC_ORDER.length - 1; i++) {
    const a = nodes.find(n => n.topic === TOPIC_ORDER[i].id && n.era === "founder");
    const b = nodes.find(n => n.topic === TOPIC_ORDER[i + 1].id && n.era === "founder");
    if (a && b) links.push({ source: a.id, target: b.id, kind: "cross-topic" });
  }

  const data = { nodes, links };
  const body = `<main class="shell" style="max-width:none;padding:1.5rem 1.5rem 0">
    <span class="eyebrow">Graph · 论文关系图</span>
    <h1 style="margin-bottom:0.5rem">${nodes.length} 个<em>节点</em>，${links.length} 条<em>连线</em>。</h1>
    <p style="color:var(--ink-soft);max-width:46ch;line-height:1.5">同主题按 era 串成链；不同主题的祖师爷之间也有链。颜色 = 主题；大小 = 难度；hover 看一句话简介；点击跳转笔记。</p>
    <div class="graph-controls">
      <span class="gc-label">layout</span>
      <button type="button" class="gc-btn is-active" data-layout="force">Force</button>
      <button type="button" class="gc-btn" data-layout="cluster">Cluster</button>
      <button type="button" class="gc-btn" data-layout="timeline">Timeline</button>
      <input type="search" id="graph-search" class="gc-search" placeholder="搜节点（按 title 模糊匹配）" aria-label="搜索 graph 节点">
    </div>
    <div id="graph-legend" class="graph-legend">${TOPIC_ORDER.map(t => `<span class="legend-item" data-topic="${t.id}"><span class="legend-dot" style="background:var(--topic-${t.id})"></span>${t.roman}. ${t.label}</span>`).join("")}</div>
    <div id="graph-container" style="width:100%;height:75vh;min-height:520px;border:1px solid var(--paper-dark);background:var(--paper-warm);position:relative;overflow:hidden">
      <svg id="graph-svg" width="100%" height="100%"></svg>
      <div id="graph-tooltip" class="graph-tooltip" hidden></div>
      <aside class="graph-stats-panel">
        <div class="gsp-row"><span class="gsp-label">nodes</span><span class="gsp-num">${nodes.length}</span></div>
        <div class="gsp-row"><span class="gsp-label">edges</span><span class="gsp-num">${links.length}</span></div>
        <div class="gsp-row"><span class="gsp-label">topics</span><span class="gsp-num">${TOPIC_ORDER.length}</span></div>
        <div class="gsp-row"><span class="gsp-label">avg degree</span><span class="gsp-num">${(2 * links.length / nodes.length).toFixed(1)}</span></div>
      </aside>
    </div>
  </main>
  <script id="graph-data" type="application/json">${JSON.stringify(data)}</script>`;
  return page({
    title: "Graph — Embodied AI Reading",
    body,
    active: "graph",
    extraHead: `<script src="https://d3js.org/d3.v7.min.js" defer></script>
    <script src="${url("/graph.js")}" defer></script>`,
  });
}

// --- timeline page ----------------------------------------------------------
function buildTimeline(notes) {
  // 按年聚合
  const byYear = new Map();
  for (const n of notes) {
    const y = n.year || "?";
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(n);
  }
  // 排序：已知年份倒序，"?" 放最后
  const years = [...byYear.keys()].sort((a, b) => {
    if (a === "?") return 1;
    if (b === "?") return -1;
    return Number(b) - Number(a);
  });

  const total = notes.filter(n => n.year).length;
  const yearMin = Math.min(...notes.filter(n => n.year).map(n => Number(n.year)));
  const yearMax = Math.max(...notes.filter(n => n.year).map(n => Number(n.year)));

  let body = `<main class="shell">
    <span class="eyebrow">Timeline · 演化时间线</span>
    <h1>从 <em>${yearMin}</em> 到 <em>${yearMax}</em>，<em>${total} 篇</em>论文连成的演化路径。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:46ch;margin-top:1rem">
      把 ${total} 篇笔记按年份排开。同一年内按主题分组，颜色对应主题。
      看这一页，你会看到具身智能这五年里"先有什么、后有什么"的真实顺序。
    </p>
    <nav class="year-nav">${years.filter(y => y !== "?").map(y => `<a href="#y-${y}">${y}</a>`).join("")}</nav>
    <hr class="ornament"/>
  `;

  // 按 era 区段标注
  const ERA_BANDS = [
    { from: 2024, to: 2025, label: "Foundation models 时代", note: "VLA 工业化 / 数据集成熟 / 评测体系建立" },
    { from: 2022, to: 2023, label: "VLA 元年", note: "RT-1/RT-2 / Diffusion Policy / OpenVLA" },
    { from: 2018, to: 2021, label: "VLM 基座建立", note: "CLIP / Habitat / 早期 RL 仿真" },
    { from: 1900, to: 2017, label: "前 transformer 时期", note: "World Models / GAIL / DAgger" },
  ];
  function bandFor(y) {
    const yn = Number(y);
    return ERA_BANDS.find(b => yn >= b.from && yn <= b.to);
  }
  let lastBand = null;
  const eraRank = { founder: 0, classic: 1, frontier: 2 };
  for (const y of years) {
    const yearNotes = byYear.get(y).sort((a, b) => {
      const ea = eraRank[a.era] ?? 1;
      const eb = eraRank[b.era] ?? 1;
      if (ea !== eb) return ea - eb;
      return a.num - b.num;
    });
    const band = bandFor(y);
    if (band && band !== lastBand) {
      body += `<div class="timeline-band" data-from="${band.from}" data-to="${band.to}">
        <span class="tb-range">${band.from === band.to ? band.from : (band.from === 1900 ? `≤ ${band.to}` : `${band.from}–${band.to}`)}</span>
        <span class="tb-label">${band.label}</span>
        <span class="tb-note">${band.note}</span>
      </div>`;
      lastBand = band;
    }
    body += `<section class="timeline-year" id="y-${y}">
      <h2 class="timeline-year-label"><span class="year-num">${y}</span><span class="year-count">· ${yearNotes.length} paper${yearNotes.length > 1 ? "s" : ""}</span></h2>
      <ul class="timeline-list">`;
    for (const n of yearNotes) {
      body += `<li class="timeline-item">
        <a href="${url(`/papers/${n.slug}/`)}">
          <span class="timeline-topic" data-topic="${n.topic}">${n.topicRoman}</span>
          <span class="timeline-title">${n.title}</span>
          <span class="timeline-venue">${n.venue || ""}</span>
        </a>
      </li>`;
    }
    body += `</ul></section>`;
  }
  body += `</main>`;
  return page({ title: "Timeline — Embodied AI Reading", body, active: "timeline" });
}

// --- issue cover pages ------------------------------------------------------
function buildIssueIndex(issues) {
  const sortedDesc = [...issues].sort((a, b) => b.order - a.order);
  const latest = sortedDesc[0];
  const rest = sortedDesc.slice(1);
  const body = `<main class="shell">
    <span class="eyebrow">Issues · 期刊合订本</span>
    <h1>每一期是一个 <em>整体</em>，不只是论文堆。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:42ch;margin-top:1rem">
      把笔记打包成"期"，是为了让你像翻一本杂志一样翻完——有目录、有编辑前言、有完结。
    </p>

    ${latest ? `<a class="issue-hero-card" href="${url(`/issues/${latest.slug.replace("issue-", "")}/`)}">
      <div class="ihc-meta">
        <span class="ihc-tag">Latest</span>
        <span class="ihc-num">Issue Nº ${latest.issueNumber}</span>
        <span class="ihc-date">${latest.issueDate}</span>
      </div>
      <h2 class="ihc-title">${latest.title.replace(/^Issue Nº \w+ — /, "")}</h2>
      <p class="ihc-intro">${latest.intro}</p>
      <span class="ihc-cta">阅读最新一期 →</span>
    </a>` : ""}

    <hr class="ornament"/>

    <div class="issue-archive">
      <div class="ia-eyebrow">往期 ↓</div>
      ${rest.map(i => `<a class="ia-row" href="${url(`/issues/${i.slug.replace("issue-", "")}/`)}">
        <span class="ia-num">Nº ${i.issueNumber}</span>
        <span class="ia-title">${i.title.replace(/^Issue Nº \w+ — /, "")}</span>
        <span class="ia-date">${i.issueDate}</span>
      </a>`).join("")}
    </div>
  </main>`;
  return page({ title: "Issues — Embodied AI Reading", body, active: "issues" });
}

function buildIssuePage(issue, notes) {
  headingIds.clear();
  const html = marked.parse(issue.body);
  // 把 13 篇按 num 排序生成 plate 网格
  const plates = notes.map(n => `<a class="issue-plate" href="${url(`/papers/${n.slug}/`)}">
    <span class="plate-num">${["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII"][n.num - 1]}</span>
    <span class="plate-topic">${n.topicLabel}</span>
    <span class="plate-title">${n.title}</span>
  </a>`).join("");

  const outline = extractOutline(issue.body);
  const outlineHtml = outline.length >= 4 ? `<aside class="outline">
    <div class="outline-title">On this page</div>
    <ul>${outline.map(o => `<li><a href="#${o.id}">${o.text}</a></li>`).join("")}</ul>
  </aside>` : "";

  const body = `<main class="issue-cover ${outlineHtml ? "has-outline" : ""}">
    <div class="issue-masthead">
      <span class="issue-title">Embodied AI Reading Station</span>
      <span>Issue Nº ${issue.issueNumber}</span>
      <span>${issue.issueDate}</span>
    </div>
    <div class="issue-num">${issue.issueNumber}</div>
    <h1 class="issue-headline">${issue.title.replace(/^Issue Nº \w+ — /, "")}</h1>
    <div class="issue-editorial note-content" data-pagefind-body>${html}</div>
    ${outlineHtml}
    <hr class="ornament"/>
    <h2 style="font-family:var(--font-mono);font-size:0.9rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-mute);margin:2rem 0 1rem">本期论文 · 13 plates</h2>
    <div class="issue-toc">${plates}</div>
  </main>`;
  return page({ title: `${issue.title} — Embodied AI Reading`, body, active: "issues" });
}

// --- single note page -------------------------------------------------------
function injectInlineFigures(slug, body, paperTitle = "") {
  const inlineDir = path.join(SITE, "src", "images", "inline");
  const sceneImg = path.join(inlineDir, `${slug}-scene.webp`);
  const methodImg = path.join(inlineDir, `${slug}-method.webp`);

  // 用 paper title prefix 让 alt 更具体（屏幕阅读器友好）
  const head = paperTitle ? paperTitle.split(":")[0].trim() : slug;
  let result = body;
  // 在「这是个什么场景」H2 段后插场景图（在该段内容末尾，下一个 ## 之前）
  if (fs.existsSync(sceneImg)) {
    const sceneMd = `\n\n![${head} — 场景示意：这论文要解决的现实问题](${url(`/images/inline/${slug}-scene.webp`)})\n`;
    result = result.replace(/(## 这是个什么场景[^\n]*\n[\s\S]*?)(?=\n## )/, (m) => m + sceneMd);
  }
  // 在「方法」H2 段后插方法图
  if (fs.existsSync(methodImg)) {
    const methodMd = `\n\n![${head} — 方法示意：核心 pipeline](${url(`/images/inline/${slug}-method.webp`)})\n`;
    result = result.replace(/(## (?:它分几步做的|它怎么做的|这篇论文的关键想法)[^\n]*\n[\s\S]*?)(?=\n## )/, (m) => m + methodMd);
  }
  return result;
}

function buildNotePage(note, backlinks = [], prev = null, next = null, issuesMentioning = []) {
  figureCounter = 0; // reset for each note
  headingIds.clear();
  const SITE_URL = "https://estelledc.github.io/embodied-ai-reading-station";
  const enrichedBody = injectInlineFigures(note.slug, note.body, note.title);
  const html = marked.parse(enrichedBody);

  // 按 era 分组 backlinks
  function backlinksByEra(items) {
    const groups = { founder: [], classic: [], frontier: [] };
    for (const b of items) (groups[b.era] || groups.classic).push(b);
    return groups;
  }
  const blGroups = backlinks.length ? backlinksByEra(backlinks) : null;
  const eraLabels = { founder: "祖师爷引用", classic: "经典引用", frontier: "前沿引用" };
  const backlinksHtml = backlinks.length ? `<aside class="backlinks">
    <div class="backlinks-title">这些笔记也提到了它 (${backlinks.length})</div>
    ${["founder", "classic", "frontier"].map(era => {
      const list = blGroups[era];
      if (!list.length) return "";
      return `<div class="bl-era-group">
        <div class="bl-era-label">${eraLabels[era]} · ${list.length}</div>
        <ul class="backlinks-list">${list.map(b => `<li><a href="${url(`/papers/${b.slug}/`)}">
          <span class="bl-num">№ ${String(b.num).padStart(2, "0")}</span>
          <span class="bl-title">${b.title}</span>
          <span class="bl-topic">${b.topicLabel}</span>
        </a></li>`).join("")}</ul>
      </div>`;
    }).join("")}
  </aside>` : "";

  const navCardsHtml = (prev || next) ? `<nav class="prev-next-nav">
    ${prev ? `<a class="pn-card pn-prev" href="${url(`/papers/${prev.slug}/`)}" data-slug="${prev.slug}">
      <span class="pn-dir">← 上一篇 · ${prev.topicLabel}</span>
      <span class="pn-title">${prev.title.split(":")[0]}</span>
      <span class="pn-tldr">${(prev.tldr || "").slice(0, 80)}${(prev.tldr || "").length > 80 ? "…" : ""}</span>
    </a>` : `<div class="pn-card pn-empty"></div>`}
    ${next ? `<a class="pn-card pn-next" href="${url(`/papers/${next.slug}/`)}" data-slug="${next.slug}">
      <span class="pn-dir">下一篇 · ${next.topicLabel} →</span>
      <span class="pn-title">${next.title.split(":")[0]}</span>
      <span class="pn-tldr">${(next.tldr || "").slice(0, 80)}${(next.tldr || "").length > 80 ? "…" : ""}</span>
    </a>` : `<div class="pn-card pn-empty"></div>`}
  </nav>` : "";

  const navItems = PAPERS.map(p => {
    const isCurrent = p.slug === note.slug;
    return `<li${isCurrent ? ' style="color:var(--coral)"' : ""}><a href="${url(`/papers/${p.slug}/`)}" style="text-decoration:none;color:${isCurrent ? "var(--coral)" : "var(--ink-soft)"}">${p.num}. ${p.title}</a></li>`;
  }).join("");

  const outline = extractOutline(note.body);
  const outlineHtml = outline.length >= 4 ? `<aside class="outline">
    <div class="outline-title">On this page</div>
    <ul>${outline.map(o => `<li><a href="#${o.id}">${o.text}</a></li>`).join("")}</ul>
  </aside>` : "";

  const body = `<main class="note-shell ${outlineHtml ? "has-outline" : ""}">
    <div class="note-main">
    <nav class="breadcrumbs" aria-label="breadcrumb">
      <a href="${url("/")}">Home</a>
      <span class="bc-sep">›</span>
      <a href="${url(`/topics/${note.topic}/`)}">${note.topicLabel}</a>
      <span class="bc-sep">›</span>
      <span class="bc-current">№ ${note.num}</span>
    </nav>
    <span class="eyebrow">${note.topicLabel} · Plate Nº ${note.num}</span>
    <h1>${note.title}</h1>
    ${note.dek ? `<p class="dek">${note.dek}</p>` : ""}
    <div class="reading-meta">
      <span>${note.readingTime} min read</span>
      <span class="dot">·</span>
      <span>${note.wordCount} 字</span>
      <span class="dot">·</span>
      <span>${note.difficulty || ""}</span>
      <span class="dot">·</span>
      <span class="status-chip status-${note.status === "deep-read" ? "deep" : note.status === "auto-summary" ? "summary" : "light"}" title="${note.status === "deep-read" ? "精读笔记 · 手写" : note.status === "auto-summary" ? "auto + 校对" : "auto 短摘要"}">${note.status === "deep-read" ? "深度精读" : note.status === "auto-summary" ? "auto 摘要" : "短摘要"}</span>
      <button class="read-btn" data-slug="${note.slug}" type="button" aria-pressed="false">标记已读</button>
      <button class="copy-md-btn" type="button" data-md="[${note.title.split(":")[0]}](${SITE_URL}/papers/${note.slug}/)" title="复制 markdown 链接">⧉ MD</button>
      <button class="share-btn" type="button" data-share-title="${note.title.replace(/"/g, "&quot;")}" data-share-url="${SITE_URL}/papers/${note.slug}/" data-share-text="${(note.tldr || "").replace(/"/g, "&quot;").slice(0, 100)}" title="分享">⤴</button>
    </div>
    ${(note.tags && note.tags.length) ? `<div class="note-tags">${note.tags.map(t => `<a class="note-tag" href="${url(`/tags/${t}/`)}">#${t}</a>`).join("")}</div>` : ""}
    ${issuesMentioning.length ? `<div class="issue-badges">${issuesMentioning.map(i => `<a class="issue-badge" href="${url(`/issues/${i.slug}/`)}" title="${i.title}">Featured in Issue Nº ${i.number}</a>`).join("")}</div>` : ""}

    <div class="note-content" data-pagefind-body>
      ${html}
      <p class="endmark">◼</p>
    </div>

    ${navCardsHtml}

    <details class="cite-block">
      <summary>引用本笔记 / Cite this note</summary>
      <div class="cite-content">
        <div class="cite-tabs">
          <span class="cite-tab-label">BibTeX</span>
        </div>
        <pre class="cite-code">@misc{eai_${note.slug.replace(/-/g, "_")}_${note.year || "2026"},
  title  = {${note.title}},
  author = {Jason},
  year   = {${note.year || 2026}},
  note   = {Embodied AI Reading Station — readable note},
  url    = {https://estelledc.github.io/embodied-ai-reading-station/papers/${note.slug}/}
}</pre>
        <button class="cite-copy" type="button" data-cite-target="cite-${note.slug}">复制 BibTeX</button>
      </div>
    </details>

    ${backlinksHtml}

    <hr class="ornament" style="margin-top:4rem"/>
    <details style="margin-top:1rem;font-family:var(--font-mono);font-size:0.85rem;color:var(--ink-mute)">
      <summary style="cursor:pointer">All 13 papers</summary>
      <ol style="margin-top:1rem;font-family:var(--font-sans);font-size:0.95rem">${navItems}</ol>
    </details>
    </div>
    ${outlineHtml}
  </main>`;
  // 优先 inline scene 图，其次 paper card 图，最后默认 hero
  const sceneImg = path.join(SITE, "src", "images", "inline", `${note.slug}-scene.webp`);
  const cardImg = path.join(SITE, "src", "images", "cards", `${note.slug}.webp`);
  const ogImage = fs.existsSync(sceneImg)
    ? `${SITE_URL}/images/inline/${note.slug}-scene.webp`
    : fs.existsSync(cardImg)
      ? `${SITE_URL}/images/cards/${note.slug}.webp`
      : `${SITE_URL}/images/hero.webp`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "headline": note.title,
        "description": note.tldr || "",
        "author": { "@type": "Person", "name": "Jason" },
        "publisher": { "@type": "Organization", "name": "Embodied AI Reading Station" },
        "datePublished": (note.year || 2026) + "-01-01",
        "image": ogImage,
        "url": `${SITE_URL}/papers/${note.slug}/`,
        "wordCount": note.wordCount || 0,
        "keywords": [note.topicLabel, note.era, note.venue, "embodied AI"].filter(Boolean).join(", "),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL + "/" },
          { "@type": "ListItem", "position": 2, "name": note.topicLabel, "item": `${SITE_URL}/topics/${note.topic}/` },
          { "@type": "ListItem", "position": 3, "name": note.title, "item": `${SITE_URL}/papers/${note.slug}/` },
        ],
      },
    ],
  };
  const linkRel = `${prev ? `<link rel="prev" href="${SITE_URL}/papers/${prev.slug}/">` : ""}
${next ? `<link rel="next" href="${SITE_URL}/papers/${next.slug}/">` : ""}`;
  return page({
    title: `${note.title} — Embodied AI Reading`,
    body,
    active: "papers",
    ogTitle: `№ ${note.num} · ${note.title.split(":")[0]}`,
    ogDescription: note.tldr || `${note.topicLabel} · ${note.year || ""} ${note.venue || ""} · ${note.readingTime} min read`,
    ogImage,
    ogUrl: `${SITE_URL}/papers/${note.slug}/`,
    jsonLd,
    extraHead: linkRel,
  });
}

// --- main -------------------------------------------------------------------
function loadNotes() {
  const notes = [];
  for (const p of PAPERS) {
    const notePath = path.join(NOTES_DIR, `${p.slug}.md`);
    const raw = read(notePath);
    if (!raw) {
      notes.push({ ...p, status: "missing", body: "# 笔记尚未生成\n\n请稍后回来看。" });
      continue;
    }
    const { data, content } = matter(raw);
    const stripped = stripFirstH1(rewriteImagePaths(content, p.slug));
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

function extractTLDR(md) {
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

function countWords(md) {
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

function readingTime(wc) {
  // 中文 350 字/分钟，英文已折算同一单位
  return Math.max(1, Math.round(wc / 350));
}

function makeDifficultyBadge(stars) {
  // 1-2 星 → easy, 3 星 → medium, 4-5 星 → hard
  const n = (stars || "").length;
  if (n <= 2) return { class: "diff-easy", label: "入门" };
  if (n === 3) return { class: "diff-medium", label: "进阶" };
  return { class: "diff-hard", label: "硬核" };
}

function extractOutline(md) {
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

function rewriteImagePaths(md, slug) {
  // normalize relative paths so build copies them under /assets/<slug>/
  return md.replace(/!\[([^\]]*)\]\((?:\.\.\/)?papers\/[^/]+\/images\/([^)]+)\)/g,
    (_, alt, file) => `![${alt}](${url(`/assets/${slug}/${file}`)})`);
}

function stripFirstH1(md) {
  // remove the first H1 heading anywhere near the top (titled page already shows the H1 in note-shell)
  return md.replace(/^\s*#\s+[^\n]+\n+/, "");
}

function copyAssets(notes) {
  for (const p of PAPERS) {
    const imgSrc = path.join(PAPERS_DIR, p.slug, "images");
    const imgDst = path.join(DIST, "assets", p.slug);
    if (fs.existsSync(imgSrc)) copyDir(imgSrc, imgDst);
  }
}

function build() {
  const startTime = Date.now();
  console.log("→ build start");
  // wipe dist
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  ensure(DIST);

  // theme + JS
  copy(path.join(SITE, "src", "theme.css"), path.join(DIST, "styles.css"));
  copy(path.join(SITE, "src", "search.js"), path.join(DIST, "search.js"));
  copy(path.join(SITE, "src", "outline.js"), path.join(DIST, "outline.js"));
  copy(path.join(SITE, "src", "reading-progress.js"), path.join(DIST, "reading-progress.js"));
  copy(path.join(SITE, "src", "quick-filter.js"), path.join(DIST, "quick-filter.js"));
  copy(path.join(SITE, "src", "graph.js"), path.join(DIST, "graph.js"));
  copy(path.join(SITE, "src", "keyboard.js"), path.join(DIST, "keyboard.js"));
  copy(path.join(SITE, "src", "theme-toggle.js"), path.join(DIST, "theme-toggle.js"));
  copy(path.join(SITE, "src", "favicon.svg"), path.join(DIST, "favicon.svg"));
  copy(path.join(SITE, "src", "link-preview.js"), path.join(DIST, "link-preview.js"));
  copy(path.join(SITE, "src", "svg-export.js"), path.join(DIST, "svg-export.js"));
  copy(path.join(SITE, "src", "site.webmanifest"), path.join(DIST, "site.webmanifest"));
  // sw.js: 注入 build timestamp 作版本号
  {
    const swSrc = fs.readFileSync(path.join(SITE, "src", "sw.js"), "utf8");
    const buildId = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const swOut = swSrc.replace(/const VERSION = "[^"]*";/, `const VERSION = "${buildId}";`);
    fs.writeFileSync(path.join(DIST, "sw.js"), swOut);
  }
  copy(path.join(SITE, "src", "sw-register.js"), path.join(DIST, "sw-register.js"));

  // images（codex 生成 + cwebp 转换）
  const IMG_SRC = path.join(SITE, "src", "images");
  if (fs.existsSync(IMG_SRC)) {
    copyDir(IMG_SRC, path.join(DIST, "images"));
  }

  // Jason DS (jx tokens + components)
  copyDir(path.join(SITE, "src", "jx"), path.join(DIST, "jx"));

  // load notes
  const notes = loadNotes();
  console.log(`  loaded ${notes.length} notes`);

  // tags：自动推断（必须在所有 build 之前）
  for (const n of notes) {
    n.tags = inferTags(n);
  }
  const tagSet = new Set();
  for (const n of notes) (n.tags || []).forEach(t => tagSet.add(t));
  console.log(`  inferred ${tagSet.size} tags across ${notes.length} notes`);

  // index — 先用 null（最新 issue 还没加载），稍后加载完 issue 再覆盖
  write(path.join(DIST, "index.html"), buildIndex(notes));

  // topics
  write(path.join(DIST, "topics", "index.html"), buildTopics(notes));
  for (const t of TOPIC_ORDER) {
    write(path.join(DIST, "topics", t.id, "index.html"), buildTopicLanding(t, notes));
  }

  // timeline
  write(path.join(DIST, "timeline", "index.html"), buildTimeline(notes));

  // compare
  write(path.join(DIST, "compare", "index.html"), buildCompare(notes));

  // glossary
  const glossaryHtml = buildGlossary(notes);
  if (glossaryHtml) write(path.join(DIST, "glossary", "index.html"), glossaryHtml);

  // graph
  write(path.join(DIST, "graph", "index.html"), buildGraph(notes));

  // tag co-occurrence heatmap
  write(path.join(DIST, "heatmap", "index.html"), buildHeatmap(notes));

  // venues
  write(path.join(DIST, "venues", "index.html"), buildVenueStats(notes));

  // stats
  // stats 在最初先出一份（无 backlinks），稍后会被覆盖
  write(path.join(DIST, "stats", "index.html"), buildStats(notes));

  // quality (作者用，不在导航)
  write(path.join(DIST, "quality", "index.html"), buildQuality(notes));

  // changelog
  const cl = buildChangelog();
  if (cl) write(path.join(DIST, "changelog", "index.html"), cl);

  // contributors
  write(path.join(DIST, "contributors", "index.html"), buildContributors(notes));

  // random paper redirect
  write(path.join(DIST, "random", "index.html"), buildRandom(notes));

  // smart next paper
  write(path.join(DIST, "next", "index.html"), buildNext(notes));

  // discover page
  write(path.join(DIST, "discover", "index.html"), buildDiscover(notes));

  // cheatsheet (single page all-tldr printable)
  write(path.join(DIST, "cheatsheet", "index.html"), buildCheatsheet(notes));

  // syllabus (checkable 30-day plan)
  write(path.join(DIST, "syllabus", "index.html"), buildSyllabus(notes));

  // eras
  for (const era of ["founder", "classic", "frontier"]) {
    const html = buildEraPage(era, notes);
    if (html) write(path.join(DIST, "eras", era, "index.html"), html);
  }

  // reading lists
  write(path.join(DIST, "lists", "index.html"), buildReadingLists(notes));

  // data endpoints (public JSON for research / external use)
  const SITE_URL_DATA = "https://estelledc.github.io/embodied-ai-reading-station";
  const papersJson = notes.map(n => ({
    slug: n.slug,
    num: n.num,
    title: n.title,
    topic: n.topic,
    topicLabel: n.topicLabel,
    era: n.era || "classic",
    year: n.year || null,
    venue: n.venue || "",
    difficulty: (n.difficulty || "").length || 2,
    tldr: n.tldr || "",
    wordCount: n.wordCount || 0,
    readingMinutes: n.readingTime || 0,
    tags: n.tags || [],
    url: `${SITE_URL_DATA}/papers/${n.slug}/`,
    sourcePath: n.sourcePath || "",
    status: n.status || "auto-summary",
  }));
  write(path.join(DIST, "data", "papers.json"), JSON.stringify(papersJson, null, 2));

  // CSV (R/Pandas 友好)
  const csvCols = ["slug", "num", "title", "topic", "topicLabel", "era", "year", "venue", "difficulty", "tldr", "wordCount", "readingMinutes", "tags", "url"];
  function csvEscape(v) {
    if (v == null) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  const csvRows = [csvCols.join(",")];
  for (const p of papersJson) {
    csvRows.push(csvCols.map(c => csvEscape(c === "tags" ? (p[c] || []).join("|") : p[c])).join(","));
  }
  write(path.join(DIST, "data", "papers.csv"), csvRows.join("\n"));

  // tag co-occurrence
  const coMatrix = {};
  const tagFreq = {};
  for (const n of notes) {
    for (const t of (n.tags || [])) tagFreq[t] = (tagFreq[t] || 0) + 1;
    const ts = n.tags || [];
    for (let i = 0; i < ts.length; i++) {
      coMatrix[ts[i]] = coMatrix[ts[i]] || {};
      for (let j = 0; j < ts.length; j++) {
        if (i === j) continue;
        coMatrix[ts[i]][ts[j]] = (coMatrix[ts[i]][ts[j]] || 0) + 1;
      }
    }
  }
  write(path.join(DIST, "data", "tags.json"), JSON.stringify({ frequency: tagFreq, cooccurrence: coMatrix }, null, 2));

  // topics summary
  const topicsJson = TOPIC_ORDER.map(t => ({
    id: t.id,
    roman: t.roman,
    label: t.label,
    subtitle: t.subtitle,
    count: notes.filter(n => n.topic === t.id).length,
    primer: t.primer || [],
    url: `${SITE_URL_DATA}/topics/${t.id}/`,
  }));
  write(path.join(DIST, "data", "topics.json"), JSON.stringify(topicsJson, null, 2));

  // index manifest
  const manifest = {
    site: SITE_URL_DATA,
    generated: new Date().toISOString(),
    counts: {
      papers: notes.length,
      topics: TOPIC_ORDER.length,
      tags: Object.keys(tagFreq).length,
      total_words: notes.reduce((s, n) => s + (n.wordCount || 0), 0),
    },
    endpoints: {
      papers: `${SITE_URL_DATA}/data/papers.json`,
      papers_csv: `${SITE_URL_DATA}/data/papers.csv`,
      tags: `${SITE_URL_DATA}/data/tags.json`,
      topics: `${SITE_URL_DATA}/data/topics.json`,
    },
    license: "CC BY 4.0 — Attribution required",
  };
  write(path.join(DIST, "data", "index.json"), JSON.stringify(manifest, null, 2));

  // tags
  write(path.join(DIST, "tags", "index.html"), buildTagsIndex(notes));
  const allTags = new Set();
  for (const n of notes) (n.tags || []).forEach(t => allTags.add(t));
  for (const tag of allTags) {
    const nsForTag = notes.filter(n => (n.tags || []).includes(tag));
    write(path.join(DIST, "tags", tag, "index.html"), buildTagPage(tag, nsForTag));
  }

  // about
  write(path.join(DIST, "about", "index.html"), buildAbout(notes));

  // backlinks: 提名匹配 — 先取每篇 title 的 keyword（冒号前 + 已知 abbrev），扫所有正文里出现
  // keywordOf("RT-1: Robotics Transformer") -> ["RT-1"]
  // keywordOf("CLIP: ...") -> ["CLIP"]
  function keywordsOf(note) {
    const t = note.title || "";
    const head = t.split(":")[0].trim();
    const kws = new Set();
    if (head) kws.add(head);
    // 同时把 slug 大写化（CLIP / RT-1 等）
    if (note.slug && note.slug.length >= 3) kws.add(note.slug.toUpperCase().replace(/-/g, "-"));
    return [...kws].filter(k => k.length >= 3);
  }
  const kwIndex = notes.map(n => ({ n, kws: keywordsOf(n) }));
  const backlinkMap = new Map();
  for (const src of notes) {
    const body = src.body || "";
    const seen = new Set();
    for (const { n: target, kws } of kwIndex) {
      if (target.slug === src.slug) continue;
      for (const kw of kws) {
        // word-boundary，区分大小写
        const re = new RegExp(`(?:^|[\\s>(\\[\\*"'，。、])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s)\\].,!?:;，。、'\"]|$)`);
        if (re.test(body)) { seen.add(target.slug); break; }
      }
    }
    for (const ref of seen) {
      if (!backlinkMap.has(ref)) backlinkMap.set(ref, []);
      backlinkMap.get(ref).push({ slug: src.slug, num: src.num, title: src.title, topicLabel: src.topicLabel, era: src.era || "classic" });
    }
  }

  // prev/next: 同主题内按 era + year 排序，跨主题就用 PAPERS 全局序
  const eraRank2 = { founder: 0, classic: 1, frontier: 2 };
  const sortedByTopic = new Map();
  for (const t of TOPIC_ORDER) {
    const inT = notes.filter(n => n.topic === t.id).sort((a, b) => {
      const ea = eraRank2[a.era] - eraRank2[b.era];
      if (ea !== 0) return ea;
      return (Number(a.year) || 9999) - (Number(b.year) || 9999);
    });
    sortedByTopic.set(t.id, inT);
  }

  console.log(`  built index/topics/timeline/compare/eras/lists/glossary/tags/heatmap/venues/stats/contributors/changelog/random/next/quality/about/graph/404/sitemap.xml/robots.txt/feed.xml/opensearch.xml/data/*`);
  // each note
  // Load content (issues + learn) BEFORE paper pages so we can compute issue mentions
  const CONTENT_DIR = path.join(SITE, "content");
  const learnPages = [];
  const issuePages = [];
  if (fs.existsSync(CONTENT_DIR)) {
    for (const file of fs.readdirSync(CONTENT_DIR)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      const raw = read(path.join(CONTENT_DIR, file));
      const { data, content } = matter(raw);
      const entry = {
        slug,
        title: data.title || slug,
        order: data.order ?? 99,
        intro: data.intro || "",
        body: stripFirstH1(content),
        issueNumber: data.issue_number || null,
        issueDate: data.issue_date || "",
      };
      if (entry.issueNumber) issuePages.push(entry);
      else learnPages.push(entry);
    }
    learnPages.sort((a, b) => a.order - b.order);
    issuePages.sort((a, b) => a.order - b.order);
  }

  // 计算 issue → 提到的 slugs；反向给每个 paper 一份 issue 列表
  const paperIssues = new Map(); // slug → [{number, slug, title}]
  for (const issue of issuePages) {
    const body = issue.body || "";
    for (const n of notes) {
      // 匹配 (/papers/<slug>/) 形式或显式 slug
      const re = new RegExp(`papers/${n.slug.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}/|\\b${n.slug}\\b`, "i");
      if (re.test(body)) {
        if (!paperIssues.has(n.slug)) paperIssues.set(n.slug, []);
        paperIssues.get(n.slug).push({
          number: issue.issueNumber,
          slug: issue.slug.replace("issue-", ""),
          title: issue.title.replace(/^Issue Nº \d+ — /, ""),
        });
      }
    }
  }

  for (const n of notes) {
    const bl = (backlinkMap.get(n.slug) || []).sort((a, b) => a.num - b.num);
    const tList = sortedByTopic.get(n.topic) || [];
    const idx = tList.findIndex(x => x.slug === n.slug);
    const prev = idx > 0 ? tList[idx - 1] : null;
    const next = idx >= 0 && idx < tList.length - 1 ? tList[idx + 1] : null;
    const issuesMentioning = paperIssues.get(n.slug) || [];
    write(path.join(DIST, "papers", n.slug, "index.html"), buildNotePage(n, bl, prev, next, issuesMentioning));
  }
  console.log(`  built ${notes.length} paper pages with backlinks/prev-next/issue badges`);

  // 重新生成 stats，这次带 backlinks 数据
  write(path.join(DIST, "stats", "index.html"), buildStats(notes, backlinkMap));

  if (fs.existsSync(CONTENT_DIR)) {
    write(path.join(DIST, "learn", "index.html"), buildLearnIndex(learnPages));
    for (const p of learnPages) {
      write(path.join(DIST, "learn", p.slug, "index.html"), buildLearnPage(p, learnPages));
    }
    if (issuePages.length > 0) {
      write(path.join(DIST, "issues", "index.html"), buildIssueIndex(issuePages));
      for (const p of issuePages) {
        write(path.join(DIST, "issues", p.slug.replace("issue-", ""), "index.html"), buildIssuePage(p, notes));
      }
      // 用最新一期重写 index 的 What's new 模块
      const sortedIssues = [...issuePages].sort((a, b) => b.order - a.order);
      const latestIssue = sortedIssues[0];
      write(path.join(DIST, "index.html"), buildIndex(notes, latestIssue));
    }

    // human-readable site map（needs issue + learn loaded first）
    write(path.join(DIST, "site-map", "index.html"), buildSiteMap(notes, issuePages, learnPages));

    // RSS / Atom feed
    write(path.join(DIST, "feed.xml"), buildFeed(issuePages, notes));

    // 404
    write(path.join(DIST, "404.html"), build404(notes));

    // sitemap
    const SITE_URL = "https://estelledc.github.io/embodied-ai-reading-station";
    const today = new Date().toISOString().slice(0, 10);
    const urls = [
      "/", "/topics/", "/timeline/", "/compare/", "/glossary/", "/graph/", "/issues/", "/about/", "/learn/", "/deck/",
      ...TOPIC_ORDER.map(t => `/topics/${t.id}/`),
      ...notes.map(n => `/papers/${n.slug}/`),
      ...issuePages.map(p => `/issues/${p.slug.replace("issue-", "")}/`),
      ...learnPages.map(p => `/learn/${p.slug}/`),
    ];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE_URL}${u}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`;
    write(path.join(DIST, "sitemap.xml"), sitemap);

    // robots.txt
    write(path.join(DIST, "robots.txt"), `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`);

    // /humans.txt — 谁做的（humanstxt.org spec）
    write(path.join(DIST, "humans.txt"), `/* TEAM */
Author: Jason
Site: ${SITE_URL}
GitHub: github.com/estelledc/embodied-ai-reading-station
Twitter / X: not yet

/* THANKS */
原作者 (papers): all original authors of the ~156 cited papers
Design system: open-design / atelier-zero
AI tools: Claude Code, Codex CLI, MinerU, lr (LightRead)
Static stack: Node.js, marked, gray-matter, Pagefind, KaTeX, D3.js v7

/* SITE */
Last update: ${new Date().toISOString().slice(0, 10)}
Language: zh-CN (Chinese, simplified)
Doctype: HTML5
Components: pure HTML + CSS, no framework
Build: ~2 seconds
Deployed: GitHub Pages via Actions
`);

    // /.well-known/security.txt — RFC 9116
    const expiryISO = new Date(Date.now() + 365*24*3600*1000).toISOString();
    write(path.join(DIST, ".well-known", "security.txt"), `Contact: https://github.com/estelledc/embodied-ai-reading-station/issues
Expires: ${expiryISO}
Preferred-Languages: zh-CN, en
Canonical: ${SITE_URL}/.well-known/security.txt
`);

    // /llms.txt — AI scraper 友好（仿 llmstxt.org spec）
    write(path.join(DIST, "llms.txt"), `# Embodied AI Reading Station

> 156 篇具身智能顶会论文，用零基础也能读懂的中文重写。

This is a static reading site for embodied AI papers. All content is hand-curated Chinese notes (CC BY 4.0).

## Best entry points for AI agents

- [Site index](${SITE_URL}/) — Hero + 156 paper cards grouped by topic
- [Cheatsheet](${SITE_URL}/cheatsheet/) — Single page with all 156 tldrs (best for quick scan)
- [/data/papers.json](${SITE_URL}/data/papers.json) — Structured metadata for all 156 papers (slug/title/topic/era/year/venue/tldr/wordCount/tags/url)
- [/data/papers.csv](${SITE_URL}/data/papers.csv) — Same data as CSV
- [/data/tags.json](${SITE_URL}/data/tags.json) — 21 tag frequency + co-occurrence matrix
- [/data/topics.json](${SITE_URL}/data/topics.json) — 11 topic metadata + primer slugs
- [/sitemap.xml](${SITE_URL}/sitemap.xml) — Full URL list
- [/feed.xml](${SITE_URL}/feed.xml) — Atom feed

## Content structure

- 156 papers in /papers/{slug}/
- 11 topic landings in /topics/{id}/
- 7 issues (editorial recaps) in /issues/{N}/
- 5 reading lists in /lists/
- 30-day learning path in /learn/path/
- FAQ in /learn/faq/

## License

- Notes content: CC BY 4.0 (attribution required)
- Site code: MIT
- Original paper PDFs: copyright original authors (this site only summarizes)

## Cite

@misc{embodied_ai_reading_station,
  title  = {Embodied AI Reading Station},
  author = {Jason},
  year   = {2026},
  url    = {${SITE_URL}/},
  note   = {156 readable Chinese notes on embodied AI papers}
}
`);

    // opensearch.xml (浏览器地址栏当搜索引擎)
    write(path.join(DIST, "opensearch.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>EAI Reading</ShortName>
  <LongName>Embodied AI Reading Station</LongName>
  <Description>156 篇具身智能论文搜索</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image type="image/svg+xml">${SITE_URL}/favicon.svg</Image>
  <Url type="text/html" template="${SITE_URL}/?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml" rel="self" template="${SITE_URL}/opensearch.xml"/>
</OpenSearchDescription>
`);
  }

  // assets
  copyAssets(notes);

  // deck (LLaVA presentation)
  const DECK_SRC = path.resolve(ROOT, "deck");
  if (fs.existsSync(DECK_SRC)) {
    const deckDst = path.join(DIST, "deck");
    copyDir(DECK_SRC, deckDst);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000 * 10) / 10;
  console.log(`✓ Built ${notes.length} note pages in ${elapsed}s → ${DIST}`);
  console.log(`  Open: http://localhost:8080/   (run \`npm run serve\`)`);
}

build();
