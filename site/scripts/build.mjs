#!/usr/bin/env node
// Build the embodied-ai reading station: markdown notes → atelier-zero styled HTML.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import matter from "gray-matter";
import { TASK_SLUGS } from "./constants.mjs";
import {
  SITE, ROOT, NOTES_DIR, PAPERS_DIR, GUIDE_DIR, DIST,
  BASE, url, SITE_URL, SITE_ORIGIN, BUILD_DATE,
} from "./lib/config.mjs";
import { ensure, copy, copyDir, read, write, copyStatic, copyAssets } from "./lib/assets.mjs";
import {
  resetFigureCounter, headingIds, slugify, injectInlineFigures,
  extractTLDR, countWords, readingTime, extractOutline,
  rewriteImagePaths, rewriteGuideLinks, stripFirstH1,
} from "./lib/markdown.mjs";
import {
  TOPIC_ORDER, TOPIC_BY_ID, PAPERS,
  PAPER_COUNT, TOPIC_COUNT, GUIDE_CHAPTER_COUNT,
  inferTags, discoverGuide, loadNotes,
} from "./lib/content.mjs";
import { page, masthead, footerHtml, relatedViewsHtml, pageHeroHtml, VIEW_DESC } from "./lib/layout.mjs";
import { buildIndex, buildNotePage } from "./lib/views/papers.mjs";
import { buildGuideIndex, buildGuidePage } from "./lib/views/guide.mjs";
import {
  buildTopics, buildTopicLanding, buildGlossary, buildTagsIndex, buildTagPage,
  READING_LISTS, buildReadingLists, buildEraPage, buildSyllabus, buildCheatsheet,
  buildDiscover, buildQuality, buildStats, buildVenueStats, buildHeatmap,
  buildCompare, buildGraph, buildTimeline,
} from "./lib/views/aggregates.mjs";
import { buildLearnIndex, buildLearnPage, buildIssueIndex, buildIssuePage } from "./lib/views/learn.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  return page({ title: "Next — Embodied AI: Zero to One", body, active: "" });
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
  return page({ title: "Random — Embodied AI: Zero to One", body, active: "" });
}

// --- human-readable site map -----------------------------------------------
function buildSiteMap(notes, issuePages, learnPages) {
  const sections = [
    {
      title: "入口",
      items: [
        { url: "/", label: "Index", desc: `${PAPER_COUNT} 张论文卡 + 主题分组 + 快筛` },
        { url: "/learn/path/", label: "30 天路径", desc: "零基础入门推荐顺序" },
        { url: "/learn/faq/", label: "FAQ", desc: "新人 12 题" },
        { url: "/lists/", label: "Reading lists", desc: "5 套主题精选包" },
      ],
    },
    {
      title: "视图",
      items: [
        { url: "/topics/", label: "Topics", desc: `${TOPIC_COUNT} 个主题概览` },
        { url: "/timeline/", label: "Timeline", desc: "2011→2025 演化时间线" },
        { url: "/compare/", label: "Compare", desc: "同主题 era 并排对比" },
        { url: "/graph/", label: "Graph", desc: "D3 力导论文关系图（3 种布局）" },
        { url: "/heatmap/", label: "Heatmap", desc: "tag 共现矩阵" },
        { url: "/eras/founder/", label: "Eras", desc: "祖师爷 / 经典 / 前沿三档" },
      ],
    },
    {
      title: "分类",
      items: [
        { url: "/tags/", label: "Tags", desc: "跨主题技术标签" },
        { url: "/glossary/", label: "Glossary", desc: "60 术语字典" },
        { url: "/venues/", label: "Venues", desc: "37 会议按类别" },
        { url: "/stats/", label: "Stats", desc: "5 维数据看板 + 你的快照" },
      ],
    },
    {
      title: `${TOPIC_COUNT} 个主题`,
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
        { url: "/data/papers.json", label: "papers.json", desc: `${PAPER_COUNT} 篇全元数据` },
        { url: "/data/tags.json", label: "tags.json", desc: "tag 频次 + 共现矩阵" },
        { url: "/data/topics.json", label: "topics.json", desc: `${TOPIC_COUNT} 主题元数据` },
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
  return page({ title: "Site map — Embodied AI: Zero to One", body, active: "sitemap" });
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
      这站的 ${PAPER_COUNT} 篇笔记不是原创研究——它们是 ${topVenues.length} 个会议/期刊上 ${totalLab} 篇论文的入门转写。
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
  return page({ title: "Contributors — Embodied AI: Zero to One", body, active: "about" });
}

// --- changelog (从 git log 自动生成) ---------------------------------------
import { execSync as _execSync } from "node:child_process";
function buildChangelog() {
  let lines = "";
  try {
    const out = _execSync(
      `git -C "${ROOT}" log --pretty=format:'%h|%ad|%s' --date=short`,
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
  return page({ title: "Changelog — Embodied AI: Zero to One", body, active: "changelog" });
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
              '<a href="' + x.p.url.replace('${SITE_URL}', base) + '" style="text-decoration:none;color:var(--ink);font-family:var(--font-display);font-weight:700">' + x.p.title + '</a>' +
              '<span style="display:block;font-family:var(--font-mono);font-size:0.74rem;color:var(--ink-faint);margin-top:0.2rem">' + x.p.topic + ' · ' + (x.p.year || '') + '</span></li>';
          }).join('');
          aside.hidden = false;
        })
        .catch(function(){});
    })();
    </script>
  </main>`;
  return page({ title: "404 — 这页没找到 — Embodied AI: Zero to One", body, active: "" });
}

// --- about page -------------------------------------------------------------
function buildAbout(notes = []) {
  // Compute dist size by category
  function dirCatSize(dir) {
    let html = 0, image = 0, code = 0, data = 0, other = 0;
    function walk(p) {
      if (!fs.existsSync(p)) return;
      for (const f of fs.readdirSync(p, { withFileTypes: true })) {
        const full = path.join(p, f.name);
        if (f.isDirectory()) walk(full);
        else {
          const sz = fs.statSync(full).size;
          if (/\.html$/.test(f.name)) html += sz;
          else if (/\.(webp|jpg|jpeg|png|gif|svg)$/i.test(f.name)) image += sz;
          else if (/\.(js|css)$/.test(f.name)) code += sz;
          else if (/\.(json|csv|xml|txt)$/.test(f.name)) data += sz;
          else other += sz;
        }
      }
    }
    walk(dir);
    return { html, image, code, data, other };
  }
  const cats = fs.existsSync(DIST) ? dirCatSize(DIST) : null;
  let sizeBars = "";
  if (cats) {
    const total = cats.html + cats.image + cats.code + cats.data + cats.other;
    const items = [
      { k: "Images (webp/jpg)", v: cats.image, c: "var(--coral)" },
      { k: "HTML pages", v: cats.html, c: "var(--olive)" },
      { k: "JS / CSS", v: cats.code, c: "var(--mustard)" },
      { k: "Data (JSON/CSV/XML)", v: cats.data, c: "var(--ink-mute)" },
      { k: "Other", v: cats.other, c: "var(--ink-faint)" },
    ];
    sizeBars = `<h2>dist 体积分布</h2>
      <p style="color:var(--ink-soft);font-size:0.92rem">总 <strong>${(total/1024/1024).toFixed(1)} MB</strong>。</p>
      <div class="size-bars">
        ${items.map(it => `<div class="sb-row">
          <span class="sb-label">${it.k}</span>
          <div class="sb-track"><div class="sb-fill" style="width:${(it.v/total*100).toFixed(1)}%;background:${it.c}"></div></div>
          <span class="sb-num">${(it.v/1024/1024).toFixed(1)} MB</span>
        </div>`).join("")}
      </div>`;
  }
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
        <li><a href="${url("/data/papers.json")}">/data/papers.json</a> — ${PAPER_COUNT} 篇全部元数据 + tldr</li>
        <li><a href="${url("/data/tags.json")}">/data/tags.json</a> — tag 频次 + 共现矩阵</li>
        <li><a href="${url("/data/topics.json")}">/data/topics.json</a> — ${TOPIC_COUNT} 主题 + primer</li>
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
        <li>数学: <a href="https://katex.org">KaTeX</a>（自托管 vendor/）</li>
        <li>可视化: <a href="https://github.com/d3/d3">D3.js v7</a>（force-directed graph，自托管 vendor/）</li>
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

      ${sizeBars}

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
      <pre style="background:var(--bone);border:1px solid var(--paper-dark);padding:0.8rem 1rem;font-family:var(--font-mono);font-size:0.78rem;overflow-x:auto">@online{embodied_ai_reading_station_2026,
  title       = {Embodied AI: Zero to One},
  author      = {Zhou, Jason},
  year        = {2026},
  howpublished = {\\url{${SITE_URL}/}},
  note        = {${PAPER_COUNT} readable Chinese notes on embodied AI papers}
}</pre>
      <p style="color:var(--ink-soft);font-size:0.9rem">单篇引用请用论文页底部的 BibTeX 块。</p>
    </div>
  </main>`;
  return page({ title: "About — Embodied AI: Zero to One", body, active: "about" });
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

// --- RSS / Atom feed --------------------------------------------------------
function buildFeed(issuePages, notes) {
  const updated = BUILD_DATE.toISOString();
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
  <title>Embodied AI: Zero to One</title>
  <subtitle>${PAPER_COUNT} 篇具身 AI 论文，用能读懂的语言重写</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" type="application/atom+xml"/>
  <link href="${SITE_URL}/" rel="alternate" type="text/html"/>
  <id>${SITE_URL}/</id>
  <updated>${updated}</updated>
  <author><name>Jason</name></author>
${entries.join("\n")}
</feed>
`;
}

// --- main -------------------------------------------------------------------
function build() {
  const startTime = Date.now();
  let stageStart = startTime;
  function stage(name) {
    const now = Date.now();
    const ms = now - stageStart;
    if (name) console.log(`  ${name}: ${ms}ms`);
    stageStart = now;
  }
  console.log("→ build start");
  // wipe dist
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  ensure(DIST);
  stage("wipe dist");

  // 静态资源 + vendor（theme/JS/webmanifest/sw.js/images/jx/katex/d3/fonts）
  copyStatic();

  // load notes
  const notes = loadNotes();
  console.log(`  loaded ${notes.length} notes`);
  stage("load notes");

  // tags：自动推断（必须在所有 build 之前）
  for (const n of notes) {
    n.tags = inferTags(n);
  }
  const tagSet = new Set();
  for (const n of notes) (n.tags || []).forEach(t => tagSet.add(t));
  console.log(`  inferred ${tagSet.size} tags across ${notes.length} notes`);
  stage("infer tags");

  // guide (22-chapter reading guide)
  const guideData = discoverGuide();
  if (guideData && guideData.chapters && guideData.chapters.length > 0) {
    write(path.join(DIST, "guide", "index.html"), buildGuideIndex(guideData));
    for (const ch of guideData.chapters) {
      write(path.join(DIST, "guide", ch.slug, "index.html"), buildGuidePage(ch, guideData.chapters));
    }
    console.log(`  built ${guideData.chapters.length} guide chapter pages`);
    stage("guide pages");
  }

  // Build paper → guide chapters reverse mapping for bidirectional links
  const paperGuideMap = new Map(); // slug → [{num, slug, title}]
  if (guideData && guideData.chapters) {
    for (const ch of guideData.chapters) {
      const m = ch.raw.match(/<!--\s*papers:\s*(.+?)\s*-->/);
      if (!m) continue;
      const slugs = m[1].split(",").map(s => s.trim()).filter(Boolean);
      for (const slug of slugs) {
        if (!paperGuideMap.has(slug)) paperGuideMap.set(slug, []);
        paperGuideMap.get(slug).push({ num: ch.num, slug: ch.slug, title: ch.title });
      }
    }
    console.log(`  mapped ${paperGuideMap.size} papers to guide chapters`);
  }

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
    url: `${SITE_URL}/papers/${n.slug}/`,
    sourcePath: n.sourcePath || "",
    status: n.status || "auto-summary",
  }));
  write(path.join(DIST, "data", "papers.json"), JSON.stringify(papersJson, null, 2));

  // CSV (R/Pandas 友好)
  const csvCols = ["slug", "num", "title", "topic", "topicLabel", "era", "year", "venue", "difficulty", "tldr", "wordCount", "readingMinutes", "tags", "url", "sourcePath", "status"];
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
    url: `${SITE_URL}/topics/${t.id}/`,
  }));
  write(path.join(DIST, "data", "topics.json"), JSON.stringify(topicsJson, null, 2));

  // index manifest
  const manifest = {
    site: SITE_URL,
    generated: BUILD_DATE.toISOString(),
    counts: {
      papers: notes.length,
      topics: TOPIC_ORDER.length,
      tags: Object.keys(tagFreq).length,
      total_words: notes.reduce((s, n) => s + (n.wordCount || 0), 0),
    },
    endpoints: {
      papers: `${SITE_URL}/data/papers.json`,
      papers_csv: `${SITE_URL}/data/papers.csv`,
      tags: `${SITE_URL}/data/tags.json`,
      topics: `${SITE_URL}/data/topics.json`,
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
    // slug 大写形式作 abbreviation（CLIP / RT-1 / DP3）— 让标题没冒号的 paper
    // (e.g. "Implicit Behavior Cloning") 也能通过 slug 匹配被反向链接
    if (note.slug && note.slug.length >= 3) {
      kws.add(note.slug.toUpperCase());
    }
    return [...kws].filter(k => k.length >= 3);
  }
  // 预编译：每个 target 一组 RegExp，避免 O(N²·K) 内编译
  const kwIndex = notes.map(n => ({
    n,
    res: keywordsOf(n).map(kw => new RegExp(
      `(?:^|[\\s>(\\[\\*"'，。、])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[\\s)\\].,!?:;，。、'\"]|$)`
    )),
  }));
  const backlinkMap = new Map();
  for (const src of notes) {
    const body = src.body || "";
    const seen = new Set();
    for (const { n: target, res } of kwIndex) {
      if (target.slug === src.slug) continue;
      for (const re of res) {
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
  const rankEra = e => eraRank2[e] ?? eraRank2.classic;
  const sortedByTopic = new Map();
  for (const t of TOPIC_ORDER) {
    const inT = notes.filter(n => n.topic === t.id).sort((a, b) => {
      const ea = rankEra(a.era) - rankEra(b.era);
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
  // 仅用 papers/<slug>/ 形式匹配 — \b<slug>\b 在 issue editorial 散文里太容易误判
  const paperIssues = new Map(); // slug → [{number, slug, title}]
  for (const issue of issuePages) {
    const body = issue.body || "";
    for (const n of notes) {
      const esc = n.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`papers/${esc}/`);
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
    const bl = [...(backlinkMap.get(n.slug) || [])].sort((a, b) => a.num - b.num);
    const tList = sortedByTopic.get(n.topic) || [];
    const idx = tList.findIndex(x => x.slug === n.slug);
    const prev = idx > 0 ? tList[idx - 1] : null;
    const next = idx >= 0 && idx < tList.length - 1 ? tList[idx + 1] : null;
    const issuesMentioning = paperIssues.get(n.slug) || [];
    const guideChaptersMentioning = paperGuideMap.get(n.slug) || [];
    write(path.join(DIST, "papers", n.slug, "index.html"), buildNotePage(n, bl, prev, next, issuesMentioning, guideChaptersMentioning));
  }
  console.log(`  built ${notes.length} paper pages with backlinks/prev-next/issue/guide badges`);
  stage("paper pages");

  // 重新生成 stats，这次带 backlinks 数据
  write(path.join(DIST, "stats", "index.html"), buildStats(notes, backlinkMap));

  if (fs.existsSync(CONTENT_DIR)) {
    write(path.join(DIST, "learn", "index.html"), buildLearnIndex(learnPages));
    for (const p of learnPages) {
      write(path.join(DIST, "learn", p.slug, "index.html"), buildLearnPage(p, learnPages));
    }
    // /learn/glossary/ 已被 canonical /glossary/ 取代，保留 redirect 给旧链接
    const glossaryRedirect = `<!doctype html>
<html lang="zh-CN"><head>
<meta charset="utf-8">
<title>Redirecting to /glossary/</title>
<link rel="canonical" href="${url("/glossary/")}">
<meta http-equiv="refresh" content="0; url=${url("/glossary/")}">
<script>location.replace(${JSON.stringify(url("/glossary/"))});</script>
</head><body>Redirecting to <a href="${url("/glossary/")}">/glossary/</a>…</body></html>
`;
    write(path.join(DIST, "learn", "glossary", "index.html"), glossaryRedirect);
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
  }

  // --- 全站级产物（不依赖 content/ 是否存在；issues/learn 条目用上面收集的变量）---

  // human-readable site map（issues/learn 为空时对应板块自然为空）
  write(path.join(DIST, "site-map", "index.html"), buildSiteMap(notes, issuePages, learnPages));

  // RSS / Atom feed（无 issues 时只含 notes 条目）
  write(path.join(DIST, "feed.xml"), buildFeed(issuePages, notes));

  // 404
  write(path.join(DIST, "404.html"), build404(notes));

  // sitemap
  {
    const today = BUILD_DATE.toISOString().slice(0, 10);
    const guideUrls = (guideData && guideData.chapters) ? ["/guide/", ...guideData.chapters.map(c => `/guide/${c.slug}/`)] : [];
    const urls = [
      "/", "/topics/", "/timeline/", "/compare/", "/glossary/", "/graph/",
      ...(issuePages.length ? ["/issues/"] : []),
      "/about/",
      ...(learnPages.length ? ["/learn/"] : []),
      "/deck/",
      ...guideUrls,
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
  }

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
Last update: ${BUILD_DATE.toISOString().slice(0, 10)}
Language: zh-CN (Chinese, simplified)
Doctype: HTML5
Components: pure HTML + CSS, no framework
Build: ~2 seconds
Deployed: GitHub Pages via Actions
`);

  // /.well-known/security.txt — RFC 9116
  const expiryISO = new Date(BUILD_DATE.getTime() + 365*24*3600*1000).toISOString();
  write(path.join(DIST, ".well-known", "security.txt"), `Contact: https://github.com/estelledc/embodied-ai-reading-station/issues
Expires: ${expiryISO}
Preferred-Languages: zh-CN, en
Canonical: ${SITE_URL}/.well-known/security.txt
`);

  // /llms.txt — AI scraper 友好（仿 llmstxt.org spec）
  write(path.join(DIST, "llms.txt"), `# Embodied AI: Zero to One

> ${PAPER_COUNT} 篇具身智能顶会论文，用零基础也能读懂的中文重写。

This is a static reading site for embodied AI papers. All content is hand-curated Chinese notes (CC BY 4.0).

## Best entry points for AI agents

- [Site index](${SITE_URL}/) — Hero + ${PAPER_COUNT} paper cards grouped by topic
- [Cheatsheet](${SITE_URL}/cheatsheet/) — Single page with all ${PAPER_COUNT} tldrs (best for quick scan)
- [/data/papers.json](${SITE_URL}/data/papers.json) — Structured metadata for all ${PAPER_COUNT} papers (slug/title/topic/era/year/venue/tldr/wordCount/tags/url)
- [/data/papers.csv](${SITE_URL}/data/papers.csv) — Same data as CSV
- [/data/tags.json](${SITE_URL}/data/tags.json) — tag frequency + co-occurrence matrix
- [/data/topics.json](${SITE_URL}/data/topics.json) — ${TOPIC_COUNT} topic metadata + primer slugs
- [/sitemap.xml](${SITE_URL}/sitemap.xml) — Full URL list
- [/feed.xml](${SITE_URL}/feed.xml) — Atom feed

## Content structure

- ${PAPER_COUNT} papers in /papers/{slug}/
- ${TOPIC_COUNT} topic landings in /topics/{id}/
- ${issuePages.length} issues (editorial recaps) in /issues/{N}/
- ${READING_LISTS.length} reading lists in /lists/
- 30-day learning path in /learn/path/
- FAQ in /learn/faq/

## License

- Notes content: CC BY 4.0 (attribution required)
- Site code: MIT
- Original paper PDFs: copyright original authors (this site only summarizes)

## Cite

@misc{embodied_ai_reading_station,
  title  = {Embodied AI: Zero to One},
  author = {Jason},
  year   = {2026},
  url    = {${SITE_URL}/},
  note   = {${PAPER_COUNT} readable Chinese notes on embodied AI papers}
}
`);

  // opensearch.xml (浏览器地址栏当搜索引擎)
  write(path.join(DIST, "opensearch.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>EAI Zero to One</ShortName>
  <LongName>Embodied AI: Zero to One</LongName>
  <Description>${PAPER_COUNT} 篇具身智能论文搜索</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image type="image/svg+xml">${SITE_URL}/favicon.svg</Image>
  <Url type="text/html" template="${SITE_URL}/?q={searchTerms}"/>
  <Url type="application/opensearchdescription+xml" rel="self" template="${SITE_URL}/opensearch.xml"/>
</OpenSearchDescription>
`);

  // assets
  copyAssets(PAPERS);
  stage("copy assets");

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
