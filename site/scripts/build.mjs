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

// --- topic order & metadata (mirrors README.md) -----------------------------
const PAPERS = [
  { slug: "llava", num: 1, title: "LLaVA: Visual Instruction Tuning", topic: "vlm-foundation", topicLabel: "VLM Foundation", topicRoman: "I" },
  { slug: "3dshape2vecset", num: 2, title: "3DShape2VecSet", topic: "vlm-foundation", topicLabel: "VLM Foundation", topicRoman: "I" },
  { slug: "saycan", num: 3, title: "SayCan", topic: "planning", topicLabel: "High-Level Planning", topicRoman: "II" },
  { slug: "openvla", num: 4, title: "OpenVLA", topic: "vla", topicLabel: "End-to-End VLA", topicRoman: "III" },
  { slug: "vlas", num: 5, title: "VLAS — VLA with Speech", topic: "multimodal", topicLabel: "Multimodal Ecology", topicRoman: "IV" },
  { slug: "mla", num: 6, title: "MLA — Multisensory Language-Action", topic: "multimodal", topicLabel: "Multimodal Ecology", topicRoman: "IV" },
  { slug: "cosmos-policy", num: 7, title: "Cosmos Policy", topic: "world-model", topicLabel: "Video World Model Policy", topicRoman: "V" },
  { slug: "rf-slam", num: 8, title: "RF-Based 3D SLAM", topic: "rf", topicLabel: "RF Perception & Mapping", topicRoman: "VI" },
  { slug: "mmclip", num: 9, title: "mmCLIP", topic: "rf", topicLabel: "RF Perception & Mapping", topicRoman: "VI" },
  { slug: "nlos-mmwave", num: 10, title: "NLOS mmWave Reconstruction", topic: "rf", topicLabel: "RF Perception & Mapping", topicRoman: "VI" },
  { slug: "proactive-hearing", num: 11, title: "Proactive Hearing Assistants", topic: "auditory", topicLabel: "Auditory & Acoustic", topicRoman: "VII" },
  { slug: "neuralaids", num: 12, title: "NeuralAids", topic: "auditory", topicLabel: "Auditory & Acoustic", topicRoman: "VII" },
  { slug: "acoustic-swarms", num: 13, title: "Acoustic Swarms / Speech Zones", topic: "auditory", topicLabel: "Auditory & Acoustic", topicRoman: "VII" },
];

const TOPIC_ORDER = [
  { id: "vlm-foundation", roman: "I", label: "VLM Foundation", subtitle: "视觉-语言基座" },
  { id: "planning", roman: "II", label: "High-Level Planning", subtitle: "高层任务规划" },
  { id: "vla", roman: "III", label: "End-to-End VLA", subtitle: "端到端视觉-语言-动作" },
  { id: "multimodal", roman: "IV", label: "Multimodal Ecology", subtitle: "多模态交互与数据生态" },
  { id: "world-model", roman: "V", label: "Video World Model Policy", subtitle: "视频生成与世界模型策略" },
  { id: "rf", roman: "VI", label: "RF Perception & Mapping", subtitle: "射频感知与空间建图" },
  { id: "auditory", roman: "VII", label: "Auditory & Acoustic", subtitle: "听觉智能与声学空间交互" },
];

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

marked.use({ renderer, gfm: true, breaks: false });

// --- layout templates -------------------------------------------------------
function masthead(active) {
  const items = [
    { href: url("/"), label: "Index", id: "index" },
    { href: url("/learn/"), label: "Learn", id: "learn" },
    { href: url("/topics/"), label: "Topics", id: "topics" },
    { href: url("/deck/"), label: "Deck", id: "deck" },
    { href: url("/about/"), label: "About", id: "about" },
  ];
  return `<header class="masthead">
    <div><a class="return-to-hub" href="https://estelledc.github.io/" rel="home">← estelledc.github.io</a><span class="mast-divider">·</span><span class="star">★</span><a href="${url("/")}">Embodied AI Reading Station</a></div>
    <nav>${items.map(i => `<a href="${i.href}"${i.id === active ? ' style="color:var(--coral)"' : ""}>${i.label}</a>`).join("")}</nav>
  </header>`;
}

function footerHtml() {
  return `<footer>
    <div>Embodied AI Reading Station — undergraduate research log</div>
    <div>Generated ${new Date().toISOString().slice(0,10)} · <span class="fin">fin.</span></div>
  </footer>`;
}

function page({ title, body, active, extraHead = "" }) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="${url("/styles.css")}">
  ${extraHead}
</head>
<body>
  ${masthead(active)}
  ${body}
  ${footerHtml()}
</body>
</html>`;
}

// --- index page -------------------------------------------------------------
function buildIndex(notes) {
  const total = PAPERS.length;
  const done = notes.filter(n => n.status === "auto-summary" || n.status === "deep-read").length;

  let body = `<main class="shell">
    <span class="eyebrow">Filed under · embodied AI · 2026</span>
    <h1><em>13 篇</em>讲机器人怎么学会<em>看、想、做事</em>的论文 — 用<em>能读懂</em>的版本。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:42ch">这站把 13 篇顶会论文（CoRL、NeurIPS、MobiCom、SIGCOMM）翻译成入门读者也能跟下来的语言——任何术语第一次出现都给一句话定义和一个生活类比，方法分步骤拆解，关键数字配生活语境。</p>

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
    for (const n of inTopic) {
      body += `<article class="paper-card">
        <span class="num">№ ${String(n.num).padStart(2,"0")}</span>
        <span class="status ${n.status === "stub" ? "stub" : ""}">${n.status === "stub" ? "stub" : n.status === "deep-read" ? "deep" : "auto"}</span>
        <span class="topic">${t.label}</span>
        <h3><a href="${url(`/papers/${n.slug}/`)}">${n.title}</a></h3>
        <span class="difficulty">${n.difficulty || ""}</span>
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
  let body = `<main class="shell">
    <span class="eyebrow">Index by · topic</span>
    <h1>Seven <em>chapters</em> · thirteen papers.</h1>`;
  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id);
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

// --- single note page -------------------------------------------------------
function buildNotePage(note) {
  figureCounter = 0; // reset for each note
  const html = marked.parse(note.body);

  const navItems = PAPERS.map(p => {
    const isCurrent = p.slug === note.slug;
    return `<li${isCurrent ? ' style="color:var(--coral)"' : ""}><a href="/papers/${p.slug}/" style="text-decoration:none;color:${isCurrent ? "var(--coral)" : "var(--ink-soft)"}">${p.num}. ${p.title}</a></li>`;
  }).join("");

  const body = `<main class="note-shell">
    <span class="eyebrow">${note.topicLabel} · Plate Nº ${note.num}</span>
    <h1>${note.title}</h1>
    <div class="note-meta">
      <span><span class="label">Slug</span>${note.slug}</span>
      <span><span class="label">Difficulty</span><span class="difficulty">${note.difficulty || ""}</span></span>
      <span><span class="label">Status</span>${note.status}</span>
      <span><span class="label">Source</span>${note.sourcePath || "—"}</span>
    </div>

    <div class="note-content">
      ${html}
    </div>

    <hr style="margin-top:4rem"/>
    <details style="margin-top:1rem;font-family:var(--font-mono);font-size:0.85rem;color:var(--ink-mute)">
      <summary style="cursor:pointer">All 13 papers</summary>
      <ol style="margin-top:1rem;font-family:var(--font-sans);font-size:0.95rem">${navItems}</ol>
    </details>
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
    notes.push({
      ...p,
      title: data.title || p.title,
      difficulty: data.difficulty || "",
      status: data.status || "auto-summary",
      sourcePath: data["来源"] || data.source || "",
      tldr: extractTLDR(content),
      body: stripFirstH1(rewriteImagePaths(content, p.slug)),
    });
  }
  return notes;
}

function extractTLDR(md) {
  const m = md.match(/##\s*一句话讲什么[^\n]*\n+([^\n]+)/);
  if (m) return m[1].replace(/^[（(].+?[）)]\s*/, "").trim().slice(0, 140);
  // fallback: first paragraph after first heading
  const lines = md.split("\n").filter(l => l.trim() && !l.startsWith("#") && !l.startsWith(">") && !l.startsWith("```"));
  return (lines[0] || "").slice(0, 140);
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

  // theme
  copy(path.join(SITE, "src", "theme.css"), path.join(DIST, "styles.css"));

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
  if (fs.existsSync(CONTENT_DIR)) {
    for (const file of fs.readdirSync(CONTENT_DIR)) {
      if (!file.endsWith(".md")) continue;
      const slug = file.replace(/\.md$/, "");
      const raw = read(path.join(CONTENT_DIR, file));
      const { data, content } = matter(raw);
      learnPages.push({
        slug,
        title: data.title || slug,
        order: data.order ?? 99,
        intro: data.intro || "",
        body: stripFirstH1(content),
      });
    }
    learnPages.sort((a, b) => a.order - b.order);
    write(path.join(DIST, "learn", "index.html"), buildLearnIndex(learnPages));
    for (const p of learnPages) {
      write(path.join(DIST, "learn", p.slug, "index.html"), buildLearnPage(p, learnPages));
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
