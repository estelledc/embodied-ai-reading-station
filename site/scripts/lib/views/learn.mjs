// Learn 入门轨道与 Issues 期刊页面。

import { marked } from "marked";
import { url } from "../config.mjs";
import { resetFigureCounter, headingIds, extractOutline } from "../markdown.mjs";
import { PAPER_COUNT, GUIDE_CHAPTER_COUNT } from "../content.mjs";
import { page, pageHeroHtml } from "../layout.mjs";

// --- learn pages (beginner supplements) -------------------------------------
export function buildLearnIndex(pages) {
  // 优先卡：30-day path / FAQ / Math primer 突出推荐
  const featured = ["path", "faq", "math-primer"];
  const featuredPages = featured.map(s => pages.find(p => p.slug === s)).filter(Boolean);
  const others = pages.filter(p => !featured.includes(p.slug));

  const body = `<main class="shell">
    <span class="eyebrow">Start here · 入门轨道</span>
    <h1>论文是<em>终点</em>，不是起点。</h1>
    <p style="font-size:1.18rem;line-height:1.55;color:var(--ink-soft);max-width:48ch;margin-top:1rem">
      ${PAPER_COUNT} 篇顶会论文堆在那里。不知道从哪开始？先看下面这三张卡，每张回答一个具体问题。
    </p>
    <p style="font-size:0.97rem;line-height:1.6;color:var(--ink-mute);max-width:52ch;margin-top:0.6rem">
      <strong>Learn</strong> 是工具箱——速查公式、常见 FAQ、30 天路径。
      系统学习请走 <a href="${url('/guide/')}" style="color:var(--coral);text-decoration:underline">Guide 教材主线</a>（${GUIDE_CHAPTER_COUNT} 章，从感知到部署）。
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
  return page({ title: "Learn — Embodied AI: Zero to One", body, active: "learn" });
}

export function buildLearnPage(p, allPages) {
  resetFigureCounter();
  headingIds.clear();
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

// --- issue cover pages ------------------------------------------------------
export function buildIssueIndex(issues) {
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
  return page({ title: "Issues — Embodied AI: Zero to One", body, active: "issues" });
}

function toRoman(n) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let s = "", x = n;
  for (const [v, sym] of map) { while (x >= v) { s += sym; x -= v; } }
  return s || String(n);
}

// 抽取 issue body 引用的论文 slugs（papers/<slug>/ 形式）
// 仅用 papers/<slug>/ 形式匹配 — \b<slug>\b 在 issue editorial 散文里太容易误判
export function issuePaperSlugs(body, notes) {
  const refs = new Set();
  for (const n of notes) {
    const esc = n.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`papers/${esc}/`);
    if (re.test(body)) refs.add(n.slug);
  }
  return refs;
}

export function buildIssuePage(issue, notes) {
  resetFigureCounter();
  headingIds.clear();
  const html = marked.parse(issue.body);

  // 仅渲染该 issue 实际引用的论文，不再硬编码 13
  const refs = issuePaperSlugs(issue.body, notes);
  const issuePapers = notes.filter(n => refs.has(n.slug)).sort((a, b) => (a.num || 0) - (b.num || 0));
  const plates = issuePapers.map((n, i) => `<a class="issue-plate" href="${url(`/papers/${n.slug}/`)}">
    <span class="plate-num">${toRoman(i + 1)}</span>
    <span class="plate-topic">${n.topicLabel}</span>
    <span class="plate-title">${n.title}</span>
  </a>`).join("");

  const outline = extractOutline(issue.body);
  const outlineHtml = outline.length >= 4 ? `<aside class="outline">
    <div class="outline-title">On this page</div>
    <ul>${outline.map(o => `<li><a href="#${o.id}">${o.text}</a></li>`).join("")}</ul>
  </aside>` : "";

  const platesSection = issuePapers.length > 0 ? `<hr class="ornament"/>
    <h2 style="font-family:var(--font-mono);font-size:0.9rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--ink-mute);margin:2rem 0 1rem">本期论文 · ${issuePapers.length} plate${issuePapers.length > 1 ? "s" : ""}</h2>
    <div class="issue-toc">${plates}</div>` : "";

  const body = `<main class="issue-cover ${outlineHtml ? "has-outline" : ""}">
    <div class="issue-masthead">
      <span class="issue-title">Embodied AI: Zero to One</span>
      <span>Issue Nº ${issue.issueNumber}</span>
      <span>${issue.issueDate}</span>
    </div>
    <div class="issue-num">${issue.issueNumber}</div>
    <h1 class="issue-headline">${issue.title.replace(/^Issue Nº \w+ — /, "")}</h1>
    <div class="issue-editorial note-content" data-pagefind-body>${html}</div>
    ${outlineHtml}
    ${platesSection}
  </main>`;
  return page({ title: `${issue.title} — Embodied AI: Zero to One`, body, active: "issues" });
}
