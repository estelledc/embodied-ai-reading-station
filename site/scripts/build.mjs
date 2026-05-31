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
  return `<figure><img src="${href}" alt="${text || ""}"${title ? ` title="${title}"` : ""}/><figcaption><span class="plate">Plate Nº ${roman.toUpperCase()}</span>${text || title || ""}</figcaption></figure>`;
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
  const items = [
    { href: url("/"), label: "Index", id: "index" },
    { href: url("/learn/"), label: "Learn", id: "learn" },
    { href: url("/topics/"), label: "Topics", id: "topics" },
    { href: url("/issues/"), label: "Issues", id: "issues" },
    { href: url("/deck/"), label: "Deck", id: "deck" },
    { href: url("/about/"), label: "About", id: "about" },
  ];
  return `<header class="masthead">
    <div><a class="jx-return-to-hub" href="https://estelledc.github.io/" rel="home">回 Jason 主站</a><span class="mast-divider">·</span><span class="star">★</span><a href="${url("/")}">Embodied AI Reading Station</a></div>
    <nav>${items.map(i => `<a href="${i.href}"${i.id === active ? ' style="color:var(--coral)"' : ""}>${i.label}</a>`).join("")}</nav>
    <button class="search-trigger" type="button" aria-label="搜索 (按 / 唤起)">
      <span class="search-icon">⌕</span><span class="search-hint">/</span>
    </button>
  </header>
  <dialog class="search-dialog" aria-label="站内搜索">
    <form method="dialog" class="search-close-form"><button class="search-close" aria-label="关闭">×</button></form>
    <div class="search-container" data-base="${BASE}"></div>
  </dialog>`;
}

function footerHtml() {
  return `<footer class="jx-footer">
    <div class="jx-footer__colophon">
      <strong>Embodied AI Reading Station</strong>
      <span lang="en">VOL · MMXXVI</span>
    </div>
    <nav class="jx-footer__index">
      <a href="${url("/")}">index</a>
      <a href="${url("/topics/")}">topics</a>
      <a href="https://github.com/estelledc/embodied-ai-reading-station">github</a>
    </nav>
    <time class="jx-footer__stamp" datetime="${new Date().toISOString().slice(0,10)}" lang="en">${new Date().toISOString().slice(0,10).replace(/-/g, "·")}</time>
  </footer>`;
}

function page({ title, body, active, extraHead = "" }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="${url("/jx/tokens.css")}">
  <link rel="stylesheet" href="${url("/jx/components.css")}">
  <link rel="stylesheet" href="${url("/styles.css")}">
  <link rel="stylesheet" href="${url("/pagefind/pagefind-ui.css")}">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  ${extraHead}
</head>
<body>
  ${masthead(active)}
  ${body}
  ${footerHtml()}
  <script src="${url("/pagefind/pagefind-ui.js")}" defer></script>
  <script src="${url("/search.js")}" defer></script>
  <script src="${url("/outline.js")}" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" defer onload="renderMathInElement(document.body, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}] });"></script>
</body>
</html>`;
}

// --- index page -------------------------------------------------------------
function buildIndex(notes) {
  const total = PAPERS.length;
  const done = notes.filter(n => n.status && n.status !== "stub" && n.status !== "missing").length;

  let body = `<main class="shell">
    <span class="eyebrow">Filed under · embodied AI · 2026</span>
    <h1><em>${total} 篇</em>讲机器人怎么学会<em>看、想、做事</em>的论文 — 用<em>能读懂</em>的版本。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:42ch">这站把 ${total} 篇顶会论文（CoRL、NeurIPS、MobiCom、SIGCOMM、ICML、ICLR、CVPR）翻译成入门读者也能跟下来的语言——任何术语第一次出现都给一句话定义和一个生活类比，方法分步骤拆解，关键数字配生活语境。</p>

    <a href="${url("/learn/")}" style="display:inline-flex;align-items:baseline;gap:0.6rem;margin:1.6rem 0 0;padding:0.85rem 1.4rem;background:var(--ink);color:var(--paper);text-decoration:none;font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;border:1px solid var(--ink);transition:background 0.15s">
      <span style="color:var(--coral)">→</span>
      <span>从这里开始 · 学习路径 · 术语字典 · 实战教程</span>
    </a>

    <div style="display:flex;gap:2rem;margin:2.5rem 0 1rem;font-family:var(--font-mono);font-size:0.85rem">
      <div><span style="color:var(--coral);font-size:1.6rem;font-family:var(--font-serif);font-style:italic">${done}</span><span style="color:var(--ink-faint)"> / ${total}</span> papers noted</div>
      <div><span style="color:var(--coral);font-size:1.6rem;font-family:var(--font-serif);font-style:italic">${TOPIC_ORDER.length}</span><span style="color:var(--ink-faint)"> topics</span></div>
    </div>
    <hr/>`;

  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id);
    if (!inTopic.length) continue;
    body += `<section>
      <div class="topic-row">
        <span class="topic-roman">${t.roman}</span>
        <h2>${t.label} <span style="color:var(--ink-faint);font-weight:400;font-size:0.7em;margin-left:0.5rem">${t.subtitle}</span></h2>
        <span class="count">${inTopic.length} paper${inTopic.length > 1 ? "s" : ""}</span>
      </div>
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
      const thumbPath = path.join(PAPERS_DIR, n.slug, "images", "img_000.jpg");
      const hasThumb = fs.existsSync(thumbPath);
      body += `<article class="paper-card">
        ${hasThumb
          ? `<div class="thumb" style="background-image:url('${url(`/assets/${n.slug}/img_000.jpg`)}')"></div>`
          : `<div class="thumb thumb-placeholder"><span>${t.roman}</span></div>`}
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
    <h1><em>${topicCount} chapters</em> · ${totalPapers} papers.</h1>`;
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
        <h2>${t.label}</h2>
        <span class="count">${inTopic.length} paper${inTopic.length > 1 ? "s" : ""}</span>
      </div>
      <p style="margin-left:0.5rem;color:var(--ink-mute);font-size:0.95rem">${t.subtitle}</p>
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

// --- about page -------------------------------------------------------------
function buildAbout() {
  const body = `<main class="note-shell">
    <span class="eyebrow">Colophon · 这站是怎么诞生的</span>
    <h1>About this <em>reading station</em></h1>
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
        <li>Pure HTML + CSS, no framework</li>
        <li>Markdown → HTML via <code>marked</code> + <code>gray-matter</code></li>
        <li>Build script: ~250 lines of Node</li>
        <li>Hosted on GitHub Pages</li>
      </ul>

      <h2>License</h2>
      <p>笔记和站点代码 MIT。论文 PDF 与图片的版权归原作者。</p>
    </div>
  </main>`;
  return page({ title: "About — Embodied AI Reading", body, active: "about" });
}

// --- learn pages (beginner supplements) -------------------------------------
function buildLearnIndex(pages) {
  const body = `<main class="shell">
    <span class="eyebrow">Start here · 入门轨道</span>
    <h1>论文是<em>终点</em>，不是起点。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:48ch;margin-top:1rem">
      13 篇顶会论文堆在那里，原本是博士看的。要让入门读者也能读懂，先在这里把<strong>路径、术语、全景、动手、社区</strong>这五件事捋顺，再回头读论文，事半功倍。
    </p>
    <hr style="margin-top:2rem"/>
    <div class="papers-grid" style="margin-top:2rem">
      ${pages.map((p, i) => `<article class="paper-card" style="background:var(--paper-warm)">
        <span class="num">№ ${String(i + 1).padStart(2, "0")}</span>
        <span class="topic">Beginner Track</span>
        <h3><a href="${url(`/learn/${p.slug}/`)}">${p.title}</a></h3>
        <p>${p.intro || ""}</p>
      </article>`).join("")}
    </div>
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

// --- issue cover pages ------------------------------------------------------
function buildIssueIndex(issues) {
  const body = `<main class="shell">
    <span class="eyebrow">Issues · 期刊合订本</span>
    <h1>每一期是一个 <em>整体</em>，不只是论文堆。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:42ch;margin-top:1rem">
      把笔记打包成"期"，是为了让你像翻一本杂志一样翻完——有目录、有编辑前言、有完结。
    </p>
    <hr class="ornament"/>
    <div class="papers-grid" style="margin-top:2rem">
      ${issues.map(i => `<a class="paper-card" href="${url(`/issues/${i.slug.replace("issue-", "")}/`)}" style="text-decoration:none;color:inherit">
        <span class="num">Issue Nº ${i.issueNumber}</span>
        <h3>${i.title}</h3>
        <p style="font-family:var(--font-mono);font-size:0.78rem;color:var(--ink-faint);letter-spacing:0.06em;text-transform:uppercase">${i.issueDate}</p>
        <p>${i.intro}</p>
      </a>`).join("")}
    </div>
  </main>`;
  return page({ title: "Issues — Embodied AI Reading", body, active: "issues" });
}

function buildIssuePage(issue, notes) {
  const html = marked.parse(issue.body);
  // 把 13 篇按 num 排序生成 plate 网格
  const plates = notes.map(n => `<a class="issue-plate" href="${url(`/papers/${n.slug}/`)}">
    <span class="plate-num">${["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII"][n.num - 1]}</span>
    <span class="plate-topic">${n.topicLabel}</span>
    <span class="plate-title">${n.title}</span>
  </a>`).join("");

  const body = `<main class="issue-cover">
    <div class="issue-masthead">
      <span class="issue-title">Embodied AI Reading Station</span>
      <span>Issue Nº ${issue.issueNumber}</span>
      <span>${issue.issueDate}</span>
    </div>
    <div class="issue-num">${issue.issueNumber}</div>
    <h1 class="issue-headline">${issue.title.replace(/^Issue Nº \w+ — /, "")}</h1>
    <div class="issue-editorial">${html}</div>
    <hr class="ornament"/>
    <h2 style="font-family:var(--font-mono);font-size:0.9rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-mute);margin:2rem 0 1rem">本期论文 · 13 plates</h2>
    <div class="issue-toc">${plates}</div>
  </main>`;
  return page({ title: `${issue.title} — Embodied AI Reading`, body, active: "issues" });
}

// --- single note page -------------------------------------------------------
function buildNotePage(note) {
  figureCounter = 0; // reset for each note
  headingIds.clear();
  const html = marked.parse(note.body);

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
      <span>${note.status}</span>
    </div>

    <div class="note-content" data-pagefind-body>
      ${html}
      <p class="endmark">◼</p>
    </div>

    <hr class="ornament" style="margin-top:4rem"/>
    <details style="margin-top:1rem;font-family:var(--font-mono);font-size:0.85rem;color:var(--ink-mute)">
      <summary style="cursor:pointer">All 13 papers</summary>
      <ol style="margin-top:1rem;font-family:var(--font-sans);font-size:0.95rem">${navItems}</ol>
    </details>
    </div>
    ${outlineHtml}
  </main>`;
  return page({ title: `${note.title} — Embodied AI Reading`, body, active: "papers" });
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
  // wipe dist
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  ensure(DIST);

  // theme + JS
  copy(path.join(SITE, "src", "theme.css"), path.join(DIST, "styles.css"));
  copy(path.join(SITE, "src", "search.js"), path.join(DIST, "search.js"));
  copy(path.join(SITE, "src", "outline.js"), path.join(DIST, "outline.js"));

  // Jason DS (jx tokens + components)
  copyDir(path.join(SITE, "src", "jx"), path.join(DIST, "jx"));

  // load notes
  const notes = loadNotes();

  // index
  write(path.join(DIST, "index.html"), buildIndex(notes));

  // topics
  write(path.join(DIST, "topics", "index.html"), buildTopics(notes));

  // about
  write(path.join(DIST, "about", "index.html"), buildAbout());

  // each note
  for (const n of notes) {
    write(path.join(DIST, "papers", n.slug, "index.html"), buildNotePage(n));
  }

  // learn pages from site/content/*.md
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
    write(path.join(DIST, "learn", "index.html"), buildLearnIndex(learnPages));
    for (const p of learnPages) {
      write(path.join(DIST, "learn", p.slug, "index.html"), buildLearnPage(p, learnPages));
    }
    issuePages.sort((a, b) => a.order - b.order);
    if (issuePages.length > 0) {
      write(path.join(DIST, "issues", "index.html"), buildIssueIndex(issuePages));
      for (const p of issuePages) {
        write(path.join(DIST, "issues", p.slug.replace("issue-", ""), "index.html"), buildIssuePage(p, notes));
      }
    }
  }

  // assets
  copyAssets(notes);

  // deck (LLaVA presentation)
  const DECK_SRC = path.resolve(ROOT, "deck");
  if (fs.existsSync(DECK_SRC)) {
    const deckDst = path.join(DIST, "deck");
    copyDir(DECK_SRC, deckDst);
  }

  console.log(`✓ Built ${notes.length} note pages → ${DIST}`);
  console.log(`  Open: http://localhost:8080/   (run \`npm run serve\`)`);
}

build();
