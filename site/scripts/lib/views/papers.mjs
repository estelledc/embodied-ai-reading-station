// 论文相关页面：首页（论文卡片墙）与单篇笔记页。

import fs from "node:fs";
import path from "node:path";
import { execSync as _execSync } from "node:child_process";
import { marked } from "marked";
import { SITE, ROOT, PAPERS_DIR, url, SITE_URL, BUILD_DATE } from "../config.mjs";
import { resetPageState, injectInlineFigures, extractOutline } from "../markdown.mjs";
import { TOPIC_ORDER, PAPERS, PAPER_COUNT, TOPIC_COUNT, GUIDE_CHAPTER_COUNT, eraComparator } from "../content.mjs";
import { page } from "../layout.mjs";

function makeDifficultyBadge(stars) {
  // 1-2 星 → easy, 3 星 → medium, 4-5 星 → hard
  const n = (stars || "").length;
  if (n <= 2) return { class: "diff-easy", label: "入门" };
  if (n === 3) return { class: "diff-medium", label: "进阶" };
  return { class: "diff-hard", label: "硬核" };
}

// --- index page -------------------------------------------------------------
export function buildIndex(notes, latestIssue = null) {
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
    <span class="eyebrow">Embodied AI: Zero to One · 22 chapters · ${notes.length} papers</span>
    <div class="hero-grid">
      <div class="hero-text">
        <h1><em>从零开始</em>学具身智能 — <em>${GUIDE_CHAPTER_COUNT} 章</em>系统教程 + <em>${total} 篇</em>论文笔记。</h1>
        <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:46ch">具身智能 = 让 AI 长出眼睛和手，在真实世界里做事。这站用零术语假设、日常类比起步的方式，从 CLIP 讲到 π0，${GUIDE_CHAPTER_COUNT} 章教程带你系统入门，${total} 篇论文笔记做你的参考文献库。</p>
      </div>
      <figure class="hero-figure">
        <picture>
          <source type="image/webp" srcset="${url("/images/hero-1200.webp")} 1200w, ${url("/images/hero.webp")} 1672w" sizes="(max-width: 900px) 100vw, 50vw">
          <img src="${url("/images/hero.webp")}" alt="A robotic hand reaching toward floating eyes, text fragments, and arrows — abstract editorial illustration of embodied AI" loading="eager" fetchpriority="high" decoding="async" width="1672" height="941">
        </picture>
        <figcaption><span class="plate">Plate Nº 0</span>— A robotic hand reaching for vision, language, and action.</figcaption>
      </figure>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:0.8rem;margin:1.6rem 0 0">
      <a href="${url("/guide/ch01-why-embodied-ai/")}" style="display:inline-flex;align-items:baseline;gap:0.6rem;padding:0.85rem 1.4rem;background:var(--ink);color:var(--paper);text-decoration:none;font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;border:1px solid var(--ink);transition:background 0.15s">
        <span style="color:var(--coral)">→</span>
        <span>开始学习 · 从 Ch01 起步</span>
      </a>
      <a href="${url("/learn/")}" style="display:inline-flex;align-items:baseline;gap:0.6rem;padding:0.85rem 1.4rem;background:transparent;color:var(--ink);text-decoration:none;font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.06em;text-transform:uppercase;border:1px solid var(--ink);transition:background 0.15s">
        <span>30 天路径 · FAQ · 公式速查</span>
      </a>
    </div>

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
        <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">30 天论文路径</strong>
        <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">每天 1-2 篇论文，30 天后能讲清具身 AI 这一年在干什么。</p>
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
  body += `<section style="margin:1.5rem 0 0.5rem">
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
  return page({ title: "Embodied AI: Zero to One", body, active: "index" });
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
      <span class="status-chip status-${note.status === "deep-read" ? "deep" : note.status === "auto-summary" ? "summary" : "light"}" title="${note.status === "deep-read" ? "精读笔记 · 手写" : note.status === "auto-summary" ? "auto + 校对" : "auto 短摘要"}">${note.status === "deep-read" ? "深度精读" : note.status === "auto-summary" ? "auto 摘要" : "短摘要"}</span>
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
  author      = {Zhou, Jason},
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "headline": note.title,
        "description": note.tldr || "",
        "author": { "@type": "Person", "name": "Jason" },
        "publisher": { "@type": "Organization", "name": "Embodied AI: Zero to One" },
        // 笔记的发布时间用 build 时间戳；论文原始年份用 about 字段单独保留
        "datePublished": BUILD_DATE.toISOString().slice(0, 10),
        "dateModified": BUILD_DATE.toISOString().slice(0, 10),
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
    title: `${note.title} — Embodied AI: Zero to One`,
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
