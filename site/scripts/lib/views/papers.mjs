// 论文相关页面：首页（论文卡片墙）与单篇笔记页。

import fs from "node:fs";
import path from "node:path";
import { execSync as _execSync } from "node:child_process";
import { marked } from "marked";
import { SITE, ROOT, PAPERS_DIR, url, SITE_URL, SITE_ORIGIN } from "../config.mjs";
import { resetPageState, injectInlineFigures, extractOutline } from "../markdown.mjs";
import { TOPIC_ORDER, PAPERS, PAPER_COUNT, TOPIC_COUNT, GUIDE_CHAPTER_COUNT, eraComparator } from "../content.mjs";
import { page } from "../layout.mjs";
import { contentDatesForNote } from "./seo.mjs";

function makeDifficultyBadge(stars) {
  // 1-2 星 → easy, 3 星 → medium, 4-5 星 → hard
  const n = (stars || "").length;
  if (n <= 2) return { class: "diff-easy", label: "入门" };
  if (n === 3) return { class: "diff-medium", label: "进阶" };
  return { class: "diff-hard", label: "硬核" };
}

export function renderRecentCommits(logOutput) {
  return logOutput.split("\n").filter(Boolean).map(line => {
    const [hash, date, ...subjectParts] = line.split("|");
    const subject = subjectParts.join("|");
    if (!hash || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !subject) return "";
    const cleanSubj = subject
      .replace(/^(feat|fix|docs|chore|ci|perf|refactor)[:(].*?:\s*/, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const shortSubject = `${cleanSubj.slice(0, 60)}${cleanSubj.length > 60 ? "…" : ""}`;
    return `<li><time class="lc-ago" datetime="${date}">${date}</time> <span class="lc-subject">${shortSubject}</span></li>`;
  }).join("");
}

export function buildPaperJsonLd(note, ogImage) {
  const dates = contentDatesForNote(note);
  const personId = `${SITE_ORIGIN}/#person`;
  const article = {
    "@type": "Article",
    "headline": note.title,
    "description": note.tldr || "",
    "author": { "@id": personId },
    "publisher": { "@type": "Organization", "name": "Embodied AI: Zero to One" },
    // Article dates describe this note's content lifecycle. The source paper year
    // remains a separate ScholarlyArticle field below.
    ...(dates.generatedAt ? { "datePublished": dates.generatedAt } : {}),
    ...(dates.contentModified ? { "dateModified": dates.contentModified } : {}),
    "about": note.year ? {
      "@type": "ScholarlyArticle",
      "name": note.title,
      "datePublished": note.year + "-01-01",
    } : undefined,
    "inLanguage": "zh-CN",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${SITE_URL}/papers/${note.slug}/`,
    },
    "image": ogImage,
    "url": `${SITE_URL}/papers/${note.slug}/`,
    "wordCount": note.wordCount || 0,
    "keywords": [note.topicLabel, note.era, note.venue, "embodied AI"].filter(Boolean).join(", "),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      article,
      {
        "@type": "Person",
        "@id": personId,
        "name": "Jason Xun",
        "url": `${SITE_ORIGIN}/`,
        "sameAs": ["https://github.com/estelledc"],
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
}

export function buildHomeJsonLd({ paperCount, topicCount, guideChapterCount }) {
  const personId = `${SITE_ORIGIN}/#person`;
  const websiteId = `${SITE_URL}/#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": personId,
        "name": "Jason Xun",
        "url": `${SITE_ORIGIN}/`,
        "sameAs": ["https://github.com/estelledc"],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        "url": `${SITE_URL}/`,
        "name": "Embodied AI: Zero to One",
        "inLanguage": "zh-CN",
        "author": { "@id": personId },
      },
      {
        "@type": "LearningResource",
        "@id": `${SITE_URL}/#learning-resource`,
        "url": `${SITE_URL}/`,
        "name": "Embodied AI: Zero to One",
        "description": "面向零基础读者的中文具身智能学习系统：系统教程、论文笔记、阅读路径与可验证的公开数据。",
        "inLanguage": "zh-CN",
        "isAccessibleForFree": true,
        "educationalLevel": "Beginner",
        "learningResourceType": "系统教程与论文阅读站",
        "audience": { "@type": "Audience", "audienceType": "具身智能入门学习者" },
        "creator": { "@id": personId },
        "additionalProperty": [
          { "@type": "PropertyValue", "name": "Guide chapters", "value": guideChapterCount },
          { "@type": "PropertyValue", "name": "Paper notes", "value": paperCount },
          { "@type": "PropertyValue", "name": "Topics", "value": topicCount },
        ],
      },
    ],
  };
}

const PAPER_CARD_IMAGE_SIZES = "(max-width: 600px) calc(100vw - 2.5rem), (max-width: 656px) 92vw, (max-width: 997px) calc(46vw - 0.7rem), (max-width: 1240px) calc(30.667vw - 0.934rem), 360px";

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

export function readJpegIntrinsicWidth(filePath, {
  readFile = fs.readFileSync,
} = {}) {
  let bytes;
  try {
    bytes = readFile(filePath);
  } catch {
    return null;
  }
  if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < bytes.length) {
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) return null;
    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) return null;
      const width = bytes.readUInt16BE(offset + 5);
      return width > 0 ? width : null;
    }
    offset += segmentLength;
  }
  return null;
}

export function renderPaperCardThumbnail(note, topicRoman, {
  fileExists = fs.existsSync,
  readImageWidth = readJpegIntrinsicWidth,
} = {}) {
  const realPath = path.join(PAPERS_DIR, note.slug, "images", "img_000.jpg");
  const cardPath = path.join(SITE, "src", "images", "cards", `${note.slug}.webp`);
  const card800Path = path.join(SITE, "src", "images", "cards", `${note.slug}-800.webp`);

  let src = "";
  let srcset = "";
  let hasWidthDescriptors = false;
  if (fileExists(realPath)) {
    src = url(`/assets/${note.slug}/img_000.jpg`);
    let intrinsicWidth = null;
    try {
      intrinsicWidth = readImageWidth(realPath);
    } catch {}
    if (Number.isSafeInteger(intrinsicWidth) && intrinsicWidth > 0) {
      srcset = `${src} ${intrinsicWidth}w`;
      hasWidthDescriptors = true;
    } else {
      srcset = src;
    }
  } else if (fileExists(cardPath)) {
    const full = url(`/images/cards/${note.slug}.webp`);
    if (fileExists(card800Path)) {
      const compact = url(`/images/cards/${note.slug}-800.webp`);
      src = compact;
      srcset = `${compact} 800w, ${full} 1672w`;
    } else {
      src = full;
      srcset = `${full} 1672w`;
    }
    hasWidthDescriptors = true;
  } else {
    return `<div class="thumb thumb-placeholder" aria-hidden="true"><span>${topicRoman}</span></div>`;
  }

  return `<picture class="thumb" aria-hidden="true">
          <source srcset="${srcset}"${hasWidthDescriptors ? ` sizes="${PAPER_CARD_IMAGE_SIZES}"` : ""}>
          <img src="${src}" alt="" loading="lazy" decoding="async" width="800" height="450">
        </picture>`;
}

// --- index page -------------------------------------------------------------
export function buildIndex(notes, latestIssue = null) {
  const total = PAPERS.length;
  const issueHref = latestIssue
    ? url(`/issues/${latestIssue.slug.replace("issue-", "")}/`)
    : url("/issues/01/");
  const issueLabel = latestIssue
    ? `Issue Nº ${latestIssue.issueNumber}`
    : "Issue Nº 01";

  const body = `<main class="shell showcase-home showcase-home--lean">
    <div class="home-status"><span class="jx-chip" data-state="maintained">Maintained · v1.2</span><span class="eyebrow">Embodied AI · editorial learning system</span></div>
    <div class="hero-grid">
      <div class="hero-text">
        <h1>把论文海洋，编成一条<em>从零到研究任务</em>的路。</h1>
        <p class="hero-lede">具身智能 = 让 AI 长出眼睛和手，在真实世界里做事。首页只负责帮你选路、比较和形成输出；${total} 篇论文笔记留在独立浏览页按需检索。</p>
        <p class="hero-summary-en" lang="en">An owner-led, independently maintained learning product that turns embodied-AI literature into guided paths, comparisons, and research briefs.</p>
        <div class="hero-actions">
          <a class="jx-action" href="${url("/guide/ch01-why-embodied-ai/")}"><span aria-hidden="true">→</span><span>开始学习 · 从 Ch01 起步</span></a>
          <a class="jx-action jx-action--secondary" href="${url("/papers/")}"><span>浏览 ${total} 篇论文笔记</span></a>
        </div>
      </div>
      <figure class="hero-figure">
        <picture>
          <source type="image/webp" srcset="${url("/images/hero-1200.webp")} 1200w, ${url("/images/hero.webp")} 1672w" sizes="(max-width: 900px) 100vw, 50vw">
          <img src="${url("/images/hero.webp")}" alt="A robotic hand reaching toward floating eyes, text fragments, and arrows — abstract editorial illustration of embodied AI" loading="eager" fetchpriority="high" decoding="async" width="1672" height="941">
        </picture>
        <figcaption><span class="plate">Plate Nº 0</span>— Vision, language, action, then a research question.</figcaption>
      </figure>
    </div>

    <section class="eai-journey" aria-labelledby="eai-journey-title">
      <div class="jx-case-question">
        <p class="jx-case-question__label">Learning question / 学习问题</p>
        <div>
          <h2 class="jx-case-question__prompt" id="eai-journey-title">零基础读者怎样从“听说过具身 AI”，走到一份能继续研究的简报？</h2>
          <p class="jx-case-question__context">顺序不是先吞完 ${total} 篇笔记，而是先建立主线，再比较同主题方法，最后把判断写成可回查的 research brief。</p>
        </div>
      </div>
      <ol class="eai-journey__steps">
        <li><span>01</span><div><strong>选路径</strong><p>从 ${GUIDE_CHAPTER_COUNT} 章 Guide 或 30+5 路径建立术语与问题主线。</p><a href="${url("/guide/")}">进入 Guide →</a></div></li>
        <li><span>02</span><div><strong>做对比</strong><p>把同主题的祖师爷、现代经典和前沿工作并排，看到方法为何变化。</p><a href="${url("/compare/")}">打开 Compare →</a></div></li>
        <li><span>03</span><div><strong>形成简报</strong><p>用来源、差异、未决问题和下一步实验组织一份可继续讨论的编辑输出。</p><a href="${issueHref}">查看 ${issueLabel} →</a></div></li>
      </ol>
    </section>

    <section class="eai-outcomes" aria-labelledby="eai-outcomes-title">
      <div class="eai-section-heading">
        <span class="eyebrow">Three representative outcomes ↘</span>
        <h2 id="eai-outcomes-title">三件代表成果，对应学习路径的三个阶段。</h2>
      </div>
      <ul class="jx-proof-rail">
        <li><a href="${url("/guide/")}"><span class="jx-proof-rail__label">Guided foundation</span><strong class="jx-proof-rail__value">${GUIDE_CHAPTER_COUNT} 章 Guide</strong><span class="jx-proof-rail__detail">从概念、主线到任务实战；每章带示例与自测。</span><span class="jx-proof-rail__source">Source · guide markdown</span></a></li>
        <li><a href="${url("/compare/")}"><span class="jx-proof-rail__label">Comparative view</span><strong class="jx-proof-rail__value">${TOPIC_COUNT} 主题对比</strong><span class="jx-proof-rail__detail">按时代与主题并排方法，避免把论文读成孤立摘要。</span><span class="jx-proof-rail__source">Source · shared content data</span></a></li>
        <li><a href="${issueHref}"><span class="jx-proof-rail__label">Editorial synthesis</span><strong class="jx-proof-rail__value">${issueLabel}</strong><span class="jx-proof-rail__detail">把多篇材料重组为研究问题、判断与下一步。</span><span class="jx-proof-rail__source">Source · issue markdown</span></a></li>
      </ul>
      <p class="jx-verification-line">构建会验证 Guide、Compare、Issue 与论文浏览页的路由；结构检查不等于逐页人工事实复核。</p>
    </section>

    <section class="eai-library-gateway" aria-labelledby="eai-library-title">
      <div>
        <span class="jx-source-tag" data-source="build">独立论文浏览页</span>
        <h2 id="eai-library-title">需要查证时，再进入 ${total} 篇论文库。</h2>
        <p>论文页保留主题、难度、era 与内容状态筛选；首页不再渲染全量卡片，也不把篇数当成学习成果。</p>
      </div>
      <a class="jx-action" href="${url("/papers/")}">浏览全部论文 →</a>
    </section>

    <details class="eai-method">
      <summary>How this is made / 角色、来源与边界</summary>
      <div class="eai-method__grid">
        <div><span class="jx-source-tag" data-source="build">Owner-led</span><h3>Jason Xun</h3><p>负责产品定义、内容架构、静态站工程、交互设计、发布门禁与最终验收。</p></div>
        <div><span class="jx-source-tag" data-source="external">AI-assisted notes</span><h3>内容生产</h3><p>AI 辅助整理笔记；46 篇保留本地解析文本与 SHA-256 清单，110 篇引用 HTTPS 原文。</p></div>
        <div><span class="jx-source-tag" data-source="history">Review boundary</span><h3>尚未证明</h3><p>结构门禁不等于逐页人工复核，也不证明学习效果；重要事实仍需回到原论文。</p></div>
      </div>
      <div class="eai-state-tools">
        <div><h3>本地进度工具</h3><p>进度只保存在当前浏览器。升级或清缓存前可导出 JSON；导入和重置都需要明确确认。</p></div>
        <div class="eai-state-tools__actions">
          <button class="streak-export" id="eai-state-export" type="button">备份进度</button>
          <button class="streak-export" id="eai-state-import" type="button">导入进度</button>
          <button class="streak-export" id="eai-state-restore-import" type="button" hidden>撤销最近导入</button>
          <button class="streak-export" id="eai-state-reset-path" type="button">重置路径</button>
          <button class="streak-export" id="eai-state-reset-guide" type="button">重置 Guide</button>
          <button class="streak-export" id="eai-state-reset-all" type="button">清空全部</button>
          <input id="eai-state-import-file" type="file" accept="application/json,.json" hidden>
        </div>
      </div>
    </details>
  </main>`;

  const homeDescription = `面向零基础读者的中文具身智能学习系统：选路径、做对比、形成研究简报，并按需浏览 ${total} 篇论文笔记。`;
  return page({
    title: "Embodied AI: Zero to One",
    body,
    active: "index",
    canonicalPath: "/",
    ogType: "website",
    ogTitle: "Embodied AI: Zero to One — 从学习路径到研究简报",
    ogDescription: homeDescription,
    ogImageAlt: "暖纸期刊风插画：机器人手伸向视觉、语言与行动符号",
    jsonLd: buildHomeJsonLd({
      paperCount: total,
      topicCount: TOPIC_COUNT,
      guideChapterCount: GUIDE_CHAPTER_COUNT,
    }),
  });
}

export function buildPapersIndex(notes) {
  const legacy = buildLegacyPaperIndex(notes);
  const marker = '<section id="paper-library"';
  const libraryStart = legacy.indexOf(marker);
  const libraryEnd = legacy.indexOf("</main>", libraryStart);
  if (libraryStart < 0 || libraryEnd < 0) {
    throw new Error("paper library marker missing from generated index");
  }

  const body = `<main class="shell paper-library-page">
    <section class="paper-library-intro">
      <span class="eyebrow">Papers · full browse</span>
      <span class="jx-chip" data-state="maintained">${PAPERS.length} notes · ${TOPIC_COUNT} topics</span>
      <h1>把全量论文留在<em>需要查证</em>的时候。</h1>
      <p>按主题、难度、era 与内容状态筛选。想先建立主线，请回首页或 Guide；这里负责检索和逐篇进入。</p>
      <div class="hero-actions"><a class="jx-action" href="${url("/")}">回到学习首页</a><a class="jx-action jx-action--secondary" href="${url("/guide/")}">进入 Guide</a></div>
    </section>
    ${legacy.slice(libraryStart, libraryEnd)}
  </main>`;

  return page({
    title: "Papers — Embodied AI: Zero to One",
    body,
    active: "papers",
    canonicalPath: "/papers/",
    ogType: "website",
    ogTitle: `Embodied AI Papers — ${PAPERS.length} 篇论文笔记`,
    ogDescription: `按主题、难度、era 与内容状态浏览 ${PAPERS.length} 篇具身智能论文笔记。`,
    ogImageAlt: "Embodied AI 论文浏览页",
  });
}

function buildLegacyPaperIndex(notes, latestIssue = null) {
  const total = PAPERS.length;
  const done = notes.filter(n => n.status && n.status !== "stub" && n.status !== "missing").length;

  // 最新 3 commit
  let lastCommits = "";
  try {
    const logOutput = _execSync(`git -C "${ROOT}" log -3 --pretty=format:'%h|%cs|%s'`, { encoding: "utf8" });
    lastCommits = renderRecentCommits(logOutput);
  } catch {}

  let body = `<main class="shell showcase-home">
    <div class="home-status"><span class="jx-chip" data-state="maintained">Maintained · v1.2</span><span class="eyebrow">Embodied AI · editorial learning system</span></div>
    <div class="hero-grid">
      <div class="hero-text">
        <h1>把论文海洋，编成一条<em>从零到研究任务</em>的路。</h1>
        <p class="hero-lede">具身智能 = 让 AI 长出眼睛和手，在真实世界里做事。这套中文学习系统用 ${GUIDE_CHAPTER_COUNT} 章教程建立主线、${total} 篇论文笔记补足证据，再用路径、主题和关系视图帮零基础读者从 CLIP 走到 π0。</p>
        <p class="hero-summary-en" lang="en">An editorial learning system that turns embodied-AI papers into a navigable path from first concepts to a real research brief.</p>
        <div class="hero-actions">
          <a class="jx-action" href="${url("/guide/ch01-why-embodied-ai/")}">
            <span aria-hidden="true">→</span>
            <span>开始学习 · 从 Ch01 起步</span>
          </a>
          <a class="jx-action jx-action--secondary" href="${url("/learn/")}">
            <span>30+5 路径 · FAQ · 公式速查</span>
          </a>
        </div>
      </div>
      <figure class="hero-figure">
        <picture>
          <source type="image/webp" srcset="${url("/images/hero-1200.webp")} 1200w, ${url("/images/hero.webp")} 1672w" sizes="(max-width: 900px) 100vw, 50vw">
          <img src="${url("/images/hero.webp")}" alt="A robotic hand reaching toward floating eyes, text fragments, and arrows — abstract editorial illustration of embodied AI" loading="eager" fetchpriority="high" decoding="async" width="1672" height="941">
        </picture>
        <figcaption><span class="plate">Plate Nº 0</span>— A robotic hand reaching for vision, language, and action.</figcaption>
      </figure>
    </div>

    <section class="jx-proof eai-proof" aria-labelledby="project-proof-title">
      <div class="eai-proof-story">
        <div class="eai-proof-kicker"><span class="jx-chip" data-state="maintained">Maintained</span><span>Project proof / 项目证明</span></div>
        <h2 id="project-proof-title">不是论文仓库，而是一套把阅读变成路径的学习产品。</h2>
        <p class="jx-proof__summary">新手面对的不是“少一篇摘要”，而是论文、术语、工具和研究任务彼此断开。本站把教程主线、论文证据、学习路径、关系视图与本地进度放进同一套静态系统。</p>
        <p class="jx-proof__summary-en" lang="en">A solo-built, evidence-aware learning product that connects tutorials, paper notes, research views and browser-local progress.</p>
        <div class="jx-proof__metrics" aria-label="项目规模">
          <div class="jx-proof__metric"><strong>${GUIDE_CHAPTER_COUNT}</strong><span>章零基础系统教程</span></div>
          <div class="jx-proof__metric"><strong>${total}</strong><span>篇长篇结构化论文笔记</span></div>
          <div class="jx-proof__metric"><strong>${TOPIC_COUNT}</strong><span>个跨模态研究主题</span></div>
        </div>
        <div class="jx-proof__links" aria-label="公开证据">
          <a class="eai-proof-route" href="${url("/guide/")}">进入系统教程 <span aria-hidden="true">→</span></a>
          <a class="jx-pill" href="${url("/quality/")}">公开质量页</a>
          <a class="jx-pill" href="${url("/data/index.json")}">数据接口</a>
          <a class="jx-pill" href="https://github.com/estelledc/embodied-ai-reading-station/actions">构建与检查</a>
        </div>
      </div>
      <dl class="jx-proof__meta">
        <div><dt>问题 / Problem</dt><dd>碎片化论文无法回答“零基础下一步读什么、如何连到研究任务”。</dd></div>
        <div><dt>个人角色 / Role</dt><dd>独立完成产品定义、内容架构、静态站工程、交互设计与发布门禁。</dd></div>
        <div><dt>系统 / System</dt><dd>Node 静态生成 + Pagefind + D3 + KaTeX；路径、主题、时间线、关系图和本地进度共享同一份内容数据。</dd></div>
        <div><dt>证据 / Evidence</dt><dd>构建时检查来源路径、内容结构、图像覆盖、内部链接、公开数据和 PWA 资产。</dd></div>
        <div><dt>局限 / Limitations</dt><dd class="jx-proof__limitation">笔记由 AI 辅助整理；46 篇保留本地解析文本与 SHA-256 清单，110 篇引用 HTTPS 原文。结构门禁不等于逐页人工复核，也不被包装成学习效果证明。</dd></div>
      </dl>
    </section>

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
<div class="stat-cell"><span class="stat-num" data-eai-guide-count>0</span><span class="stat-denom"> / 22</span><span class="stat-label">Guide 进度</span></div>
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

    <details class="state-tools" style="margin:1rem 0 2rem;padding:0.9rem 1rem;border:1px solid var(--paper-dark);background:var(--paper-warm)">
      <summary style="cursor:pointer;font-family:var(--font-mono);font-size:0.82rem;color:var(--ink-soft)">本地进度备份 / 导入 / 重置</summary>
      <p style="margin:0.7rem 0;font-size:0.88rem;color:var(--ink-mute)">进度只保存在当前浏览器。升级或清缓存前先导出 JSON 备份；可导入 v1.1 旧状态并自动迁移。</p>
      <div style="display:flex;flex-wrap:wrap;gap:0.55rem">
        <button class="streak-export" id="eai-state-export" type="button">↓ 备份进度</button>
        <button class="streak-export" id="eai-state-import" type="button">↑ 导入进度</button>
        <button class="streak-export" id="eai-state-restore-import" type="button" hidden>撤销最近导入</button>
        <button class="streak-export" id="eai-state-reset-path" type="button">重置路径</button>
        <button class="streak-export" id="eai-state-reset-guide" type="button">重置 Guide</button>
        <button class="streak-export" id="eai-state-reset-all" type="button">清空全部</button>
        <input id="eai-state-import-file" type="file" accept="application/json,.json" hidden>
      </div>
    </details>

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
<!-- inline data island moved to /data/papers.json (fetched lazily by reading-progress.js) -->
    <hr/>`;

  // --- 路径分流（"你是谁 → 走哪条路"）---
  body += `<section class="learning-paths" style="margin:2.5rem 0">
    <h2 style="font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:1rem">选一条路径开始 ↘</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem">
      <a href="${url("/guide/")}" style="padding:1.2rem;border:1px solid var(--paper-dark);border-radius:8px;text-decoration:none;color:inherit;transition:border-color 0.15s">
        <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">系统学习（推荐）</strong>
        <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">${GUIDE_CHAPTER_COUNT} 章 Guide 从 Ch01 顺序读，4 周完成。每章含代码示例 + 自测题。</p>
      </a>
      <a href="${url("/learn/path/")}" style="padding:1.2rem;border:1px solid var(--paper-dark);border-radius:8px;text-decoration:none;color:inherit;transition:border-color 0.15s">
        <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">30+5 学习路径</strong>
        <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">30 天核心含 25 篇论文 + 5 个复习/输出日；任务驱动读者再选做 Day 31–35。</p>
      </a>
      <a href="${url("/topics/")}" style="padding:1.2rem;border:1px solid var(--paper-dark);border-radius:8px;text-decoration:none;color:inherit;transition:border-color 0.15s">
        <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">按主题跳读</strong>
        <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">对特定方向感兴趣？${TOPIC_COUNT} 个主题各有 3 篇 primer 带你入门。</p>
      </a>
    </div>
  </section>`;

  // --- Guide 6 Part 预览 ---
  const guideParts = [
    { label: "Part 1: 导读总纲", range: "Ch01–03", desc: "这本教程是什么？怎么读？需要什么前置知识？" },
    { label: "Part 2: 全景概念", range: "Ch04–07", desc: `具身 AI 到底在解决什么问题？${TOPIC_COUNT} 个主题怎么串起来？` },
    { label: "Part 3: 核心主线精读", range: "Ch08–14", desc: "VLM → VLA → 扩散策略 → 模仿学习" },
    { label: "Part 4: 训练与部署", range: "Ch15–17", desc: "世界模型、强化学习、Sim-to-Real" },
    { label: "Part 5: 感知扩展", range: "Ch18–20", desc: "多模态、射频感知、听觉智能" },
    { label: "Part 6: 实战", range: "Ch21–22", desc: "数据集全景 + Task 实战指南" },
  ];
  body += `<section style="margin:2rem 0 2.5rem">
    <h2 style="font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:1rem">${GUIDE_CHAPTER_COUNT} 章教程总览 ↘</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.8rem">
      ${guideParts.map(p => `<a href="${url("/guide/")}" style="padding:1rem;border:1px solid var(--paper-dark);border-radius:8px;text-decoration:none;color:inherit;transition:border-color 0.15s">
        <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--ink-faint)">${p.range}</span>
        <strong style="display:block;font-size:0.85rem;margin-top:0.3rem">${p.label}</strong>
        <span style="font-size:0.82rem;color:var(--ink-soft)">${p.desc}</span>
      </a>`).join("")}
    </div>
    <a href="${url("/guide/")}" style="display:inline-block;margin-top:1rem;font-family:var(--font-mono);font-size:0.85rem;color:var(--coral);text-decoration:none">查看完整目录 →</a>
  </section>
  <hr/>`;

  // --- 论文库分隔 ---
  body += `<section id="paper-library" style="margin:1.5rem 0 0.5rem">
    <h2 style="font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-mute)">论文笔记库 · ${total} papers ↘</h2>
    <p style="font-size:0.95rem;color:var(--ink-soft);max-width:52ch">教程之外，这里是 ${total} 篇论文的详细笔记——每篇含架构图、实验数据、踩坑提醒。可按主题、难度、era 筛选。</p>
  </section>`;

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
    const sorted = [...inTopic].sort(eraComparator({ pinTask: true, tiebreak: "num" }));
    body += `<p class="era-hint">按演进顺序：祖师爷 → 现代经典 → 前沿延伸</p>`;
    for (const n of sorted) {
      const badge = makeDifficultyBadge(n.difficulty);
      const thumbnail = renderPaperCardThumbnail(n, t.roman);
      body += `<article class="paper-card" data-slug="${n.slug}" data-topic="${n.topic}" data-difficulty="${(n.difficulty || "").length || 2}" data-era="${n.era || "classic"}" data-status="${n.status || "auto-summary"}">
        ${thumbnail}
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
  const homeDescription = `面向零基础读者的中文具身智能学习系统：${GUIDE_CHAPTER_COUNT} 章教程、${total} 篇论文笔记、${TOPIC_COUNT} 个主题与可验证的公开数据。`;
  return page({
    title: "Embodied AI: Zero to One",
    body,
    active: "index",
    canonicalPath: "/",
    ogType: "website",
    ogTitle: "Embodied AI: Zero to One — 具身智能零基础学习系统",
    ogDescription: homeDescription,
    ogImageAlt: "暖纸期刊风插画：机器人手伸向视觉、语言与行动符号",
    jsonLd: buildHomeJsonLd({
      paperCount: total,
      topicCount: TOPIC_COUNT,
      guideChapterCount: GUIDE_CHAPTER_COUNT,
    }),
  });
}

// --- single note page -------------------------------------------------------
export function buildNotePage(note, backlinks = [], prev = null, next = null, issuesMentioning = [], guideChaptersMentioning = []) {
  resetPageState(); // reset for each note
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
      <span class="status-chip status-${note.status === "deep-read" ? "deep" : note.status === "auto-summary" ? "summary" : "light"}" title="${note.status === "deep-read" ? "长篇结构化笔记 · AI 辅助整理（非逐页人工复核）" : note.status === "auto-summary" ? "AI 辅助短摘要" : "短摘要"}">${note.status === "deep-read" ? "长篇结构化" : note.status === "auto-summary" ? "auto 摘要" : "短摘要"}</span>
      <button class="read-btn" data-slug="${note.slug}" type="button" aria-pressed="false">标记已读</button>
      <button class="copy-md-btn" type="button" data-md="[${note.title.split(":")[0]}](${SITE_URL}/papers/${note.slug}/)" title="复制 markdown 链接" aria-label="复制 markdown 链接到剪贴板"><span aria-hidden="true">⧉</span> MD</button>
      <button class="share-btn" type="button" data-share-title="${note.title.replace(/"/g, "&quot;")}" data-share-url="${SITE_URL}/papers/${note.slug}/" data-share-text="${(note.tldr || "").replace(/"/g, "&quot;").slice(0, 100)}" title="分享" aria-label="分享这篇笔记"><span aria-hidden="true">⤴</span></button>
    </div>
    ${(note.tags && note.tags.length) ? `<div class="note-tags">${note.tags.map(t => `<a class="note-tag" href="${url(`/tags/${t}/`)}">#${t}</a>`).join("")}</div>` : ""}
    ${issuesMentioning.length ? `<div class="issue-badges">${issuesMentioning.map(i => `<a class="issue-badge" href="${url(`/issues/${i.slug}/`)}" title="${i.title}">Featured in Issue Nº ${i.number}</a>`).join("")}</div>` : ""}
    ${guideChaptersMentioning.length ? `<div class="guide-badges" style="margin-top:0.75rem;display:flex;flex-wrap:wrap;gap:0.5rem">${guideChaptersMentioning.map(ch => `<a class="guide-badge" href="${url(`/guide/${ch.slug}/`)}" style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.3rem 0.75rem;background:var(--paper-warm);border:1px solid var(--paper-dark);border-radius:4px;font-size:0.8rem;font-family:var(--font-mono);color:var(--ink-soft);text-decoration:none;transition:border-color 0.2s" title="${ch.title}"><span style="color:var(--coral);font-weight:600">Guide</span> Ch${String(ch.num).padStart(2, "0")} 中讲解</a>`).join("")}</div>` : ""}

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
        <pre class="cite-code">@online{eai_${note.slug.replace(/-/g, "_")}_2026,
  title       = {(readable note) ${note.title}},
  author      = {Xun, Jason},
  year        = {2026},${note.year ? `
  note        = {Note on a ${note.year} paper},` : ""}
  howpublished = {\\url{${SITE_URL}/papers/${note.slug}/}},
  organization = {Embodied AI: Zero to One}
}</pre>
        <button class="cite-copy" type="button" data-cite-target="cite-${note.slug}">复制 BibTeX</button>
      </div>
    </details>

    ${backlinksHtml}

    <hr class="ornament" style="margin-top:4rem"/>
    <details style="margin-top:1rem;font-family:var(--font-mono);font-size:0.85rem;color:var(--ink-mute)">
      <summary style="cursor:pointer">All ${PAPERS.length} papers (full index)</summary>
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
  const jsonLd = buildPaperJsonLd(note, ogImage);
  const linkRel = `${prev ? `<link rel="prev" href="${SITE_URL}/papers/${prev.slug}/">` : ""}
${next ? `<link rel="next" href="${SITE_URL}/papers/${next.slug}/">` : ""}`;
  return page({
    title: `${note.title} — Embodied AI: Zero to One`,
    body,
    active: "papers",
    ogTitle: `№ ${note.num} · ${note.title.split(":")[0]}`,
    ogDescription: note.tldr || `${note.topicLabel} · ${note.year || ""} ${note.venue || ""} · ${note.readingTime} min read`,
    ogImage,
    ogUrl: `${SITE_URL}/papers/${note.slug}/`,
    ogType: "article",
    jsonLd,
    extraHead: linkRel,
  });
}
