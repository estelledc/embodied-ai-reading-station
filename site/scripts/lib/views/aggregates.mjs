// 聚合视图页面：topics/timeline/compare/graph/heatmap/tags/glossary/eras/lists/
// discover/cheatsheet/syllabus/stats/venues/quality。

import fs from "node:fs";
import path from "node:path";
import { SITE, NOTES_DIR, url } from "../config.mjs";
import { TOPIC_ORDER, PAPER_COUNT, TOPIC_COUNT, eraComparator } from "../content.mjs";
import { page, pageHeroHtml } from "../layout.mjs";

// --- topics page ------------------------------------------------------------
export function buildTopics(notes) {
  const topicCount = TOPIC_ORDER.length;
  const totalPapers = notes.length;
  let body = `<main class="shell">
    <span class="eyebrow">Index by · topic</span>
    <h1><em>${topicCount} chapters</em> · ${totalPapers} papers.</h1>
    ${pageHeroHtml("topics-index", "Topic taxonomy — seven labeled doors")}`;
  const sortInTopic = eraComparator({ pinTask: true, tiebreak: "num" });
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
  return page({ title: "Topics — Embodied AI: Zero to One", body, active: "topics" });
}

// --- glossary page ----------------------------------------------------------
export function buildGlossary(notes) {
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
      看论文最大障碍是术语雪崩。这页把 ${PAPER_COUNT} 篇里反复出现的核心词收齐，一句话说清楚是什么、首次出现在哪篇。
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
  return page({ title: "Glossary — Embodied AI: Zero to One", body, active: "glossary" });
}

// --- per-topic landing ------------------------------------------------------
export function buildTopicLanding(t, notes) {
  const inTopic = notes.filter(n => n.topic === t.id)
    .sort(eraComparator({ pinTask: true, tiebreak: "year" }));

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

  return page({ title: `${t.label} — Embodied AI: Zero to One`, body, active: "topics" });
}

// --- tags -------------------------------------------------------------------
export function buildTagsIndex(notes) {
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
  return page({ title: "Tags — Embodied AI: Zero to One", body, active: "tags" });
}

export function buildTagPage(tag, notes) {
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
  return page({ title: `#${tag} — Embodied AI: Zero to One`, body, active: "tags" });
}

// --- reading lists ----------------------------------------------------------
export const READING_LISTS = [
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

export function buildReadingLists(notes) {
  let body = `<main class="shell">
    <span class="eyebrow">Reading lists · 主题精选</span>
    <h1><em>${READING_LISTS.length} 套</em>策划好的<em>读书包</em>。</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch">
      不知道 ${PAPER_COUNT} 篇该从哪开始？挑一个你最感兴趣的方向，按 era 顺序读完一个包。每包 50-90 分钟，读完能在那个细分领域跟人聊起。
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
  return page({ title: "Reading lists — Embodied AI: Zero to One", body, active: "lists" });
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

export function buildEraPage(era, notes) {
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
  return page({ title: `${info.label} — Embodied AI: Zero to One`, body, active: "eras" });
}

// --- /syllabus/ checkable 30-day course plan -------------------------------
export const SYLLABUS_WEEKS = [
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

export function buildSyllabus(notes) {
  const slugMap = new Map(notes.map(n => [n.slug, n]));
  let body = `<main class="shell">
    <span class="eyebrow">Syllabus · 30 天核心课程</span>
    <h1>30 个<em>检查框</em>，完成核心路径。</h1>
    <p style="font-size:1.1rem;color:var(--ink-soft);max-width:48ch;line-height:1.55">
      这是 <a href="${url("/learn/path/")}">30 天核心路径</a> 的可勾选版本：25 个论文日 + 5 个复习/输出日。每天勾完会存到浏览器，第二天回来自动恢复。
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
  body += `<aside style="margin-top:2.5rem;padding:1.2rem;border:1px solid var(--paper-dark);background:var(--paper-warm)">
    <strong>还要完成导师任务清单？</strong>
    <p style="margin:0.45rem 0 0;color:var(--ink-soft)">继续走 <a href="${url("/learn/path/#可选任务扩展-day-3135")}">Day 31–35 可选任务扩展 →</a>。这 5 天不计入 30 天核心进度。</p>
  </aside></main>`;
  return page({ title: "Syllabus — Embodied AI: Zero to One", body, active: "syllabus" });
}

// --- /cheatsheet/ all papers tldr in one page ------------------------------
export function buildCheatsheet(notes) {
  // 按主题分组
  const sortInTopic = eraComparator({ tiebreak: "year" });
  let body = `<main class="shell">
    <span class="eyebrow">Cheatsheet · ${PAPER_COUNT} 篇 tldr 速查</span>
    <h1><em>${PAPER_COUNT} 篇</em>论文一句话<em>速览</em>。</h1>
    <p style="font-size:1.05rem;color:var(--ink-soft);max-width:48ch;line-height:1.55">
      把 ${PAPER_COUNT} 篇全部 tldr 放在一页。Cmd+F 即可全文搜索。打印（Cmd+P）输出 ~10 页 A4 cheatsheet。
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
  return page({ title: "Cheatsheet — Embodied AI: Zero to One", body, active: "cheatsheet" });
}

// --- /discover/ exploration page -------------------------------------------
export function buildDiscover(notes) {
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
  return page({ title: "Discover — Embodied AI: Zero to One", body, active: "discover" });
}

// --- quality dashboard (作者用，不放主导航) ---------------------------------
export function buildQuality(notes) {
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
  return page({ title: "Quality — Embodied AI: Zero to One", body, active: "quality" });
}

// --- stats dashboard --------------------------------------------------------
export function buildStats(notes, backlinkMap = new Map()) {
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
<!-- inline data island moved to /data/papers.json -->
  </main>`;
  return page({ title: "Stats — Embodied AI: Zero to One", body, active: "stats" });
}

// --- venue stats ------------------------------------------------------------
export function buildVenueStats(notes) {
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
  return page({ title: "Venues — Embodied AI: Zero to One", body, active: "venues" });
}

// --- tag co-occurrence heatmap ---------------------------------------------
export function buildHeatmap(notes) {
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
  return page({ title: "Heatmap — Embodied AI: Zero to One", body, active: "heatmap" });
}

// --- compare page (per-topic side-by-side) ----------------------------------
export function buildCompare(notes) {
  let body = `<main class="shell">
    <span class="eyebrow">Compare · 同主题对比</span>
    <h1>同一<em>主题</em>下，<em>哪几篇</em>该先读？</h1>
    <p style="font-size:1.1rem;line-height:1.55;color:var(--ink-soft);max-width:46ch;margin-top:1rem">
      把每个主题里的论文按 era 排一排，每条带年份和一句话定位。一眼看到"祖师爷 → 经典 → 前沿"的关系。
    </p>
    <hr class="ornament"/>`;

  for (const t of TOPIC_ORDER) {
    const inTopic = notes.filter(n => n.topic === t.id)
      .sort(eraComparator({ pinTask: true, tiebreak: "year" }));
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
  return page({ title: "Compare — Embodied AI: Zero to One", body, active: "compare" });
}

// --- graph page (force-directed) --------------------------------------------
export function buildGraph(notes) {
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
  for (const t of TOPIC_ORDER) {
    const inTopic = nodes.filter(n => n.topic === t.id)
      .sort(eraComparator({ tiebreak: "year" }));
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
    <div id="graph-container" style="width:100%;height:80vh;min-height:880px;border:1px solid var(--paper-dark);background:var(--paper-warm);position:relative;overflow:hidden">
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
    title: "Graph — Embodied AI: Zero to One",
    body,
    active: "graph",
    extraHead: `<script src="${url("/vendor/d3.min.js")}" defer></script>
    <script src="${url("/graph.js")}" defer></script>`,
  });
}

// --- timeline page ----------------------------------------------------------
export function buildTimeline(notes) {
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
  const sortInYear = eraComparator({ tiebreak: "num" });
  for (const y of years) {
    const yearNotes = byYear.get(y).sort(sortInYear);
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
  return page({ title: "Timeline — Embodied AI: Zero to One", body, active: "timeline" });
}
