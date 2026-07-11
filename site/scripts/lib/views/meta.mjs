// 元页面：next/random/site-map/contributors/changelog/404/about。

import fs from "node:fs";
import path from "node:path";
import { execSync as _execSync } from "node:child_process";
import { SITE, ROOT, DIST, url, SITE_URL } from "../config.mjs";
import { TOPIC_ORDER, PAPER_COUNT, TOPIC_COUNT } from "../content.mjs";
import { page, pageHeroHtml, safeJsonForScript } from "../layout.mjs";

// --- /next/ smart next paper redirect --------------------------------------
export function buildNext(notes) {
  const papers = notes.map(n => ({ slug: n.slug, topic: n.topicLabel, era: n.era || "classic" }));
  const body = `<main class="shell" style="text-align:center;padding-top:6rem" data-eai-page-behavior="next">
    <span class="eyebrow">Next · 帮你挑下一篇</span>
    <h1>正在<em>选下一篇</em>...</h1>
    <p style="color:var(--ink-soft);font-size:1.05rem;margin-top:1rem">基于你已读的主题分布。</p>
    <p style="margin-top:2rem"><a id="eai-next-fallback" href="${url("/")}" style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">没自动跳转？回首页 →</a></p>
    <script id="eai-next-data" type="application/json">${safeJsonForScript(papers)}</script>
  </main>`;
  return page({
    title: "Next — Embodied AI: Zero to One",
    body,
    active: "",
    canonicalPath: "/next/",
    extraScripts: ["/page-behaviors.js"],
  });
}

// --- random paper redirect --------------------------------------------------
export function buildRandom(notes) {
  const slugs = notes.map(n => n.slug);
  const body = `<main class="shell" style="text-align:center;padding-top:6rem" data-eai-page-behavior="random">
    <span class="eyebrow">Random · 随机一篇</span>
    <h1>正在<em>抽签</em>...</h1>
    <p style="color:var(--ink-soft);font-size:1.05rem;margin-top:1rem">从 ${notes.length} 篇里随机挑一篇给你。</p>
    <p style="margin-top:2rem"><a id="eai-random-fallback" href="${url("/")}" style="font-family:var(--font-mono);font-size:0.85rem;color:var(--coral)">没自动跳转？点这里手动选 →</a></p>
    <script id="eai-random-data" type="application/json">${safeJsonForScript(slugs)}</script>
  </main>`;
  return page({
    title: "Random — Embodied AI: Zero to One",
    body,
    active: "",
    canonicalPath: "/random/",
    extraScripts: ["/page-behaviors.js"],
  });
}

// --- human-readable site map -----------------------------------------------
export function buildSiteMap(notes, issuePages, learnPages) {
  const sections = [
    {
      title: "入口",
      items: [
        { url: "/", label: "Home", desc: "选路径、做对比、形成研究简报" },
        { url: "/papers/", label: "Papers", desc: `${PAPER_COUNT} 篇论文笔记 + 主题分组 + 快筛` },
        { url: "/learn/path/", label: "30+5 学习路径", desc: "30 天核心 + 5 天可选任务扩展" },
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
  return page({ title: "Site map — Embodied AI: Zero to One", body, active: "sitemap", canonicalPath: "/site-map/" });
}

// --- contributors page ------------------------------------------------------
export function buildContributors(notes) {
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
  return page({ title: "Contributors — Embodied AI: Zero to One", body, active: "about", canonicalPath: "/contributors/" });
}

// --- changelog (从 git log 自动生成) ---------------------------------------
export function buildChangelog() {
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
  return page({ title: "Changelog — Embodied AI: Zero to One", body, active: "changelog", canonicalPath: "/changelog/" });
}

// --- 404 page ---------------------------------------------------------------
export function build404(notes) {
  const random6 = [...notes]
    .filter(n => n.status !== "missing" && n.status !== "stub")
    .slice(0, 6); // 用前 6 篇当 fallback 推荐
  const body = `<main class="shell" style="text-align:center;padding-top:5rem;padding-bottom:5rem" data-eai-page-behavior="not-found">
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

  </main>`;
  return page({
    title: "404 — 这页没找到 — Embodied AI: Zero to One",
    body,
    active: "",
    canonicalPath: "/404.html",
    robots: "noindex, nofollow",
    jsonLd: false,
    extraScripts: ["/page-behaviors.js"],
  });
}

// --- about page -------------------------------------------------------------
export function buildAbout(notes = []) {
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
      <p>项目源于一个本科生科研任务：实验室给了 13 篇代表论文，覆盖 7 个主题。笔记用 AI 辅助整理成<strong>能读懂的长篇结构化版本</strong>——用基础类比解释新词，但不把结构门禁等同于逐页人工复核；关键数字和结论仍应回到来源核验。</p>
      <p>原任务的七个主题是这样：</p>
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
        <li><code>lr pdf bundle paper.pdf</code> — 把授权 PDF 转成带图 markdown</li>
        <li><code>notes/&lt;slug&gt;.md</code> — 用统一模板整理长篇结构化笔记</li>
        <li><code>npm run provenance:generate</code> — 固定本地解析文本的 SHA-256</li>
        <li><code>node site/scripts/build.mjs</code> — 期刊风 HTML 渲染</li>
        <li>GitHub Actions → GitHub Pages — 部署</li>
      </ol>

      <h2>Visual reference</h2>
      <p>视觉风格以 <a href="https://github.com/open-design/open-design">open-design</a> 的 <strong>atelier-zero</strong>（暖纸 + 珊瑚红 + 罗马数字章节 + 三族字体混排）和 <strong>warm-editorial</strong>（serif + 长读节奏）为起点；全站身份、导航、状态和项目证明层接入 Jason DS v2，并保留本站的期刊气质。</p>

      <h2>Stack</h2>
      <ul>
        <li>Pure HTML + CSS, no framework — 全站静态页面预渲染</li>
        <li>Markdown → HTML via <code>marked</code> + <code>gray-matter</code></li>
        <li>Build script: <code>site/scripts/build.mjs</code> 编排入口 + <code>scripts/lib/</code> 模块（Node，零框架）</li>
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
        <li><strong>Codex CLI</strong>：${countInlineImages()}+ 张内嵌图片生成（场景图 + 方法图，全部 16:9 webp）</li>
        <li><strong>MinerU + pdftotext</strong>：PDF → markdown 解析</li>
        <li><strong>lr (LightRead)</strong>：arXiv 检索 + PDF bundle 工具</li>
      </ul>
      <p>AI 输出经过自动结构、链接、来源和构建门禁；这不代表 156 篇都已逐页人工复核。重要事实请以原论文为准，发现错误欢迎提交 issue。</p>

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
  author      = {Xun, Jason},
  year        = {2026},
  howpublished = {\\url{${SITE_URL}/}},
  note        = {${PAPER_COUNT} readable Chinese notes on embodied AI papers}
}</pre>
      <p style="color:var(--ink-soft);font-size:0.9rem">单篇引用请用论文页底部的 BibTeX 块。</p>
    </div>
  </main>`;
  return page({ title: "About — Embodied AI: Zero to One", body, active: "about", canonicalPath: "/about/" });
}

// About 页「AI 工具」一节用：实际数 site/src/images/inline 下的内嵌配图
// （webp 原图，不含 -800 缩放版）。目录缺失时如实返回 0，不再用硬编码兜底。
function countInlineImages() {
  const dir = path.join(SITE, "src", "images", "inline");
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter(f => f.endsWith(".webp") && !f.includes("-800")).length;
}
