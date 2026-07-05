// Guide 教程页面：目录页与章节页。

import { marked } from "marked";
import { TASK_SLUGS } from "../../constants.mjs";
import { url, SITE_URL } from "../config.mjs";
import { resetPageState } from "../markdown.mjs";
import { PAPERS, PAPER_COUNT, TOPIC_COUNT, GUIDE_CHAPTER_COUNT } from "../content.mjs";
import { page } from "../layout.mjs";

// --- guide pages (22-chapter reading guide) ---------------------------------
export function buildGuideIndex(guideData) {
  const { chapters, readmeRaw } = guideData;

  // 13 task-required paper slugs (Task 1 精读论文，来源 constants.mjs)
  const taskSlugSet = new Set(TASK_SLUGS);

  // Pre-compute task-required paper count per chapter
  const chTaskCount = new Map();
  for (const ch of chapters) {
    const m = ch.raw.match(/<!--\s*papers:\s*(.+?)\s*-->/);
    if (!m) continue;
    const slugs = m[1].split(",").map(s => s.trim()).filter(Boolean);
    const count = slugs.filter(s => taskSlugSet.has(s)).length;
    if (count > 0) chTaskCount.set(ch.num, count);
  }

  // Group chapters by part
  const parts = [
    { label: "Part 1: 导读总纲", range: [1, 3], desc: "这本导读是什么？怎么读？需要什么前置知识？" },
    { label: "Part 2: 全景概念", range: [4, 7], desc: `具身 AI 到底在解决什么问题？${TOPIC_COUNT} 个主题怎么串起来？` },
    { label: "Part 3: 核心主线精读", range: [8, 14], desc: "VLM → VLA → 扩散策略 → 模仿学习，一步步造出机器人的大脑和手" },
    { label: "Part 4: 训练与部署基建", range: [15, 17], desc: "世界模型、强化学习、仿真与 Sim-to-Real——从训练到落地" },
    { label: "Part 5: 感知模态扩展", range: [18, 20], desc: "多模态生态、射频感知、听觉智能——给机器人装上更多感官" },
    { label: "Part 6: 横切主题与实战", range: [21, 22], desc: "数据集全景、Task 1/2 实战指南" },
  ];

  let partsHtml = "";
  for (const p of parts) {
    const chs = chapters.filter(c => c.num >= p.range[0] && c.num <= p.range[1]);
    partsHtml += `<section class="guide-part" style="margin-top:2.5rem">
      <h2 style="font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:0.5rem">${p.label}</h2>
      <p style="color:var(--ink-soft);font-size:0.95rem;margin-bottom:1rem">${p.desc}</p>
      <div class="papers-grid">
        ${chs.map(c => {
          const tc = chTaskCount.get(c.num) || 0;
          const taskBadge = tc > 0
            ? `<span style="display:inline-block;font-size:0.7rem;padding:0.15em 0.5em;background:var(--coral);color:#fff;border-radius:4px;margin-top:0.4rem" title="本章涉及 ${tc} 篇 Task 精读论文">Task ×${tc}</span>`
            : "";
          return `<article class="paper-card" style="background:var(--paper-warm)">
          <span class="num">Ch${String(c.num).padStart(2, "0")}</span>
          <span class="topic">${p.label.split(":")[0]}</span>
          <h3><a href="${url(`/guide/${c.slug}/`)}">${c.title.replace(/^Ch\d+:\s*/, "")}</a></h3>
          ${taskBadge}
        </article>`;
        }).join("")}
      </div>
    </section>`;
  }

  const body = `<main class="shell">
    <span class="eyebrow">Guide · 具身智能系统教程</span>
    <h1>${GUIDE_CHAPTER_COUNT} 章<em>系统教程</em>，从零基础到实战。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:52ch;margin-top:1rem">
      面向零基础读者，用日常类比和代码示例系统讲解具身智能——从 CLIP 到 π0，每章含自测题。基于 ${PAPER_COUNT} 篇论文笔记和 13 篇精读论文。
    </p>
    <hr class="ornament"/>
    ${partsHtml}

    <hr class="ornament" style="margin-top:3rem"/>
    <section style="margin-top:2rem">
      <h2 style="font-family:var(--font-mono);font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:1rem">推荐阅读路径</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
        <div style="padding:1.2rem;border:1px solid var(--paper-dark);border-radius:8px">
          <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">Task 1 路径（2 周）</strong>
          <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">Ch01→Ch03→Ch04→Ch08→Ch09→Ch10→Ch12→Ch22</p>
        </div>
        <div style="padding:1.2rem;border:1px solid var(--paper-dark);border-radius:8px">
          <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">全景学习路径（4 周）</strong>
          <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">顺序通读 Part 1-6</p>
        </div>
        <div style="padding:1.2rem;border:1px solid var(--paper-dark);border-radius:8px">
          <strong style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">按主题跳读路径</strong>
          <p style="font-size:0.9rem;color:var(--ink-soft);margin-top:0.5rem">Ch01→Ch04→跳到感兴趣的主题章节</p>
        </div>
      </div>
    </section>
  </main>`;
  return page({ title: "Guide — 具身智能系统教程", body, active: "guide",
    ogDescription: `${GUIDE_CHAPTER_COUNT} 章零基础具身智能系统教程——从 CLIP 到 VLA 到 Diffusion Policy，每章含代码示例和自测题。` });
}

export function buildGuidePage(ch, allChapters) {
  resetPageState();
  // Rewrite internal .md links to /guide/<slug>/ HTML links
  // NOTE: Use bare absolute paths (no BASE prefix) because renderer.link
  // automatically prepends BASE to any href starting with "/"
  let body = ch.raw;
  // Rewrite links like [text](chXX-name.md) → [text](/guide/chXX-name/)
  body = body.replace(/\]\(ch(\d+[^)]*?)\.md\)/g, (_, rest) => `](/guide/ch${rest}/)`);
  // Rewrite links to README.md → /guide/
  body = body.replace(/\]\(README\.md\)/g, `](/guide/)`);
  const html = marked.parse(body);

  // Parse <!-- papers: slug1, slug2, ... --> annotation
  const papersMatch = ch.raw.match(/<!--\s*papers:\s*(.+?)\s*-->/);
  const paperSlugs = papersMatch
    ? papersMatch[1].split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const linkedPapers = paperSlugs
    .map(slug => PAPERS.find(p => p.slug === slug))
    .filter(Boolean);

  // Build "本章涉及论文" section
  let papersSection = "";
  if (linkedPapers.length > 0) {
    const eraLabels = { founder: "祖师爷", classic: "经典", frontier: "前沿" };
    papersSection = `<section class="guide-papers" style="margin-top:3rem;padding-top:2rem;border-top:1px solid var(--paper-dark)">
      <h2 style="font-family:var(--font-display);font-size:1.3rem;color:var(--ink);margin-bottom:0.5rem">本章涉及论文 <span style="font-weight:400;font-size:0.85rem;color:var(--ink-mute)">${linkedPapers.length} 篇</span></h2>
      <p style="font-size:0.9rem;color:var(--ink-soft);margin-bottom:1.5rem">点击查看论文笔记全文，标有 <span style="color:var(--coral)">●</span> 的为已读。</p>
      <div class="papers-grid" style="gap:0.75rem">${linkedPapers.map(p => {
        const eraTag = eraLabels[p.era] || p.era;
        return `<article class="paper-card" data-slug="${p.slug}" style="background:var(--paper-warm);padding:0.8rem 1rem">
          <span class="num" style="font-size:0.75rem">№ ${String(p.num).padStart(2, "0")}</span>
          <span class="topic" style="font-size:0.7rem">${p.topicLabel} · ${eraTag}</span>
          <h3 style="font-size:0.95rem;margin:0.3rem 0 0"><a href="${url(`/papers/${p.slug}/`)}" style="text-decoration:none;color:var(--ink)">${p.title.split(":")[0]}</a></h3>
        </article>`;
      }).join("")}</div>
    </section>`;
  }

  // Prev / next navigation
  const idx = allChapters.findIndex(c => c.slug === ch.slug);
  const prev = idx > 0 ? allChapters[idx - 1] : null;
  const next = idx < allChapters.length - 1 ? allChapters[idx + 1] : null;

  // Part label
  const partLabels = {
    1: "Part 1: 导读总纲", 2: "Part 1: 导读总纲", 3: "Part 1: 导读总纲",
    4: "Part 2: 全景概念", 5: "Part 2: 全景概念", 6: "Part 2: 全景概念", 7: "Part 2: 全景概念",
    8: "Part 3: 核心主线精读", 9: "Part 3: 核心主线精读", 10: "Part 3: 核心主线精读",
    11: "Part 3: 核心主线精读", 12: "Part 3: 核心主线精读", 13: "Part 3: 核心主线精读", 14: "Part 3: 核心主线精读",
    15: "Part 4: 训练与部署基建", 16: "Part 4: 训练与部署基建", 17: "Part 4: 训练与部署基建",
    18: "Part 5: 感知模态扩展", 19: "Part 5: 感知模态扩展", 20: "Part 5: 感知模态扩展",
    21: "Part 6: 横切主题与实战", 22: "Part 6: 横切主题与实战",
  };
  const partLabel = partLabels[ch.num] || "Guide";

  const prevTitle = prev ? prev.title.replace(/^Ch\d+:\s*/, "") : "";
  const nextTitle = next ? next.title.replace(/^Ch\d+:\s*/, "") : "";
  const prevNext = `<nav class="guide-nav" style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--paper-dark);font-size:0.9rem;font-family:var(--font-mono);gap:1rem">
    ${prev ? `<a href="${url(`/guide/${prev.slug}/`)}" style="color:var(--ink-soft);text-decoration:none;max-width:40%"><span style="display:block;font-size:0.75rem;color:var(--ink-faint)">← 上一章</span>Ch${String(prev.num).padStart(2, "0")}: ${prevTitle}</a>` : `<span></span>`}
    <a href="${url("/guide/")}" style="color:var(--ink-mute);white-space:nowrap">目录</a>
    ${next ? `<a href="${url(`/guide/${next.slug}/`)}" style="color:var(--ink-soft);text-decoration:none;text-align:right;max-width:40%"><span style="display:block;font-size:0.75rem;color:var(--ink-faint)">下一章 →</span>Ch${String(next.num).padStart(2, "0")}: ${nextTitle}</a>` : `<span></span>`}
  </nav>`;

  // "标记已完成" button for guide progress tracking
  const completeBtn = `<div style="text-align:center;margin-top:2.5rem">
    <button class="guide-done-btn" data-guide-slug="${ch.slug}" type="button" aria-pressed="false" style="font-family:var(--font-mono);font-size:0.95rem;padding:0.7rem 2rem;border:2px solid var(--coral);border-radius:6px;background:transparent;color:var(--coral);cursor:pointer;transition:all 0.2s">标记本章已完成</button>
  </div>`;

  const pageBody = `<main class="note-shell">
    <span class="eyebrow">Guide · ${partLabel}</span>
    <h1>${ch.title}</h1>
    <hr/>
    <div class="note-content">${html}</div>
    ${papersSection}
    ${completeBtn}
    ${prevNext}
  </main>`;
  const shortTitle = ch.title.replace(/^Ch\d+:\s*/, "");
  return page({ title: `${ch.title} — Guide`, body: pageBody, active: "guide",
    ogDescription: shortTitle,
    ogUrl: `${SITE_URL}/guide/${ch.slug}/` });
}
