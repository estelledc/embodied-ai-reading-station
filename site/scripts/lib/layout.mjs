// 页面骨架模板：page() / masthead() / footerHtml() / relatedViewsHtml() / pageHeroHtml() / VIEW_DESC。

import fs from "node:fs";
import path from "node:path";
import { SITE, url, BASE, SITE_URL, SITE_ORIGIN, BUILD_DATE } from "./config.mjs";
import { PAPER_COUNT, TOPIC_COUNT, TOPIC_ORDER, GUIDE_CHAPTER_COUNT } from "./content.mjs";

// --- page hero helper -------------------------------------------------------
export function pageHeroHtml(slug, alt) {
  const SITE_DIR = SITE;
  const heroPath = path.join(SITE_DIR, "src", "images", "pages", `${slug}.webp`);
  if (!fs.existsSync(heroPath)) return "";
  return `<figure class="page-hero">
    <picture>
      <source type="image/webp" srcset="${url(`/images/pages/${slug}-800.webp`)} 800w, ${url(`/images/pages/${slug}.webp`)} 1672w" sizes="(max-width: 900px) 100vw, 1200px">
      <img src="${url(`/images/pages/${slug}.webp`)}" alt="${alt}" loading="lazy" width="1672" height="941">
    </picture>
  </figure>`;
}

// JSON embedded in a non-executable <script> data block must not be able to
// terminate that element. Escaping `<` also covers `<!--` and `</script>`.
export function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// --- layout templates -------------------------------------------------------
export function masthead(active) {
  // 主导航：5 项关键入口（Guide 首位 = 教学站主轴）
  const primaryItems = [
    { href: url("/guide/"), label: "Guide", id: "guide" },
    { href: url("/papers/"), label: "Papers", id: "papers" },
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
    { href: url("/about/"), label: "本站说明", id: "about" },
  ];
  // 当前 active 是否在折叠区，决定 More 是否高亮
  const moreActive = viewItems.some(v => v.id === active);
  const portfolioLinks = [
    { href: `${SITE_ORIGIN}/`, label: "Hub" },
    { href: `${SITE_ORIGIN}/about/`, label: "About" },
    { href: `${SITE_ORIGIN}/resume/`, label: "Résumé" },
    { href: "https://github.com/estelledc/embodied-ai-reading-station", label: "GitHub" },
  ];
  return `<header class="masthead">
    <div class="masthead-identity">
      <a class="jx-return-to-hub" href="${SITE_ORIGIN}/" rel="home" aria-label="返回 Jason 的作品集">Jason / Works</a>
      <span class="mast-divider" aria-hidden="true">/</span>
      <a class="masthead-brand" href="${url("/")}"><span class="star" aria-hidden="true">★</span><span>Embodied AI</span><small>Zero to One</small></a>
    </div>
    <nav class="primary-nav" aria-label="站内主导航">${primaryItems.map(i => `<a href="${i.href}"${i.id === active ? ' aria-current="page"' : ""}>${i.label}</a>`).join("")}
      <div class="more-nav" data-more-nav>
        <button type="button" class="more-nav-trigger${moreActive ? " is-current" : ""}" aria-controls="more-nav-panel" aria-expanded="false" aria-label="更多站内导航">More <span aria-hidden="true">▾</span></button>
        <div class="more-nav-panel" id="more-nav-panel" hidden>
          ${viewItems.map(i => `<a href="${i.href}"${i.id === active ? ' aria-current="page"' : ""}>${i.label}</a>`).join("")}
        </div>
      </div>
    </nav>
    <nav class="portfolio-nav" aria-label="Jason 作品集导航">
      ${portfolioLinks.slice(1).map(i => `<a href="${i.href}">${i.label}</a>`).join("")}
    </nav>
    <details class="portfolio-menu">
      <summary aria-label="打开 Jason 作品集导航">Works</summary>
      <nav aria-label="Jason 作品集快捷导航">
        ${portfolioLinks.map(i => `<a href="${i.href}">${i.label}</a>`).join("")}
      </nav>
    </details>
    <button class="search-trigger" type="button" aria-label="搜索 (按 / 唤起)">
      <span class="search-icon">⌕</span><span class="search-hint">/</span>
    </button>
    <button class="kb-trigger" type="button" aria-label="键盘快捷键帮助 (按 ? 唤起)" aria-haspopup="dialog">
      <span class="search-hint" aria-hidden="true">?</span>
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
  index: ["guide", "compare", "issues"],
  papers: ["topics", "timeline", "compare"],
  topics: ["compare", "graph", "heatmap"],
  guide: ["learn", "topics", "issues"],
  timeline: ["compare", "stats", "venues"],
  compare: ["topics", "timeline", "tags"],
  graph: ["heatmap", "tags", "topics"],
  heatmap: ["graph", "tags", "stats"],
  tags: ["heatmap", "glossary", "graph"],
  glossary: ["tags", "learn", "venues"],
  venues: ["stats", "compare", "timeline"],
  stats: ["timeline", "venues", "compare"],
  learn: ["guide", "glossary", "issues"],
  issues: ["learn", "stats", "timeline"],
  about: ["learn", "issues", "topics"],
  deck: ["learn", "issues", "topics"],
};
export const VIEW_DESC = {
  index: { label: "Home 学习首页", desc: "选路径、做对比、形成研究简报" },
  papers: { label: "Papers 论文库", desc: `${PAPER_COUNT} 篇论文笔记，按主题与状态筛选` },
  topics: { label: "Topics 主题", desc: `${TOPIC_COUNT} 个主题深度页 + primer 入门 3 篇` },
  guide: { label: "Guide 导读", desc: `${GUIDE_CHAPTER_COUNT} 章零基础具身智能系统导读` },
  timeline: { label: "Timeline", desc: "2011 → 2025 演化时间线" },
  compare: { label: "Compare", desc: "同主题 era 并排对比表" },
  graph: { label: "Graph", desc: "D3 力导论文关系图" },
  heatmap: { label: "Heatmap", desc: "标签共现矩阵" },
  tags: { label: "Tags", desc: "跨主题技术标签" },
  glossary: { label: "Glossary", desc: "核心术语字典" },
  venues: { label: "Venues", desc: "会议/期刊按类别分布" },
  stats: { label: "Stats", desc: "5 维度数据看板" },
  learn: { label: "Learn", desc: "学习路径 + math primer" },
  issues: { label: "Issues", desc: "编辑总结合集" },
  about: { label: "About", desc: "项目说明" },
  deck: { label: "Deck", desc: "LLaVA 演讲" },
};

export function relatedViewsHtml(active) {
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

export function footerHtml(active) {
  return `${relatedViewsHtml(active)}<footer class="jx-footer">
    <div class="footer-cols">
      <div class="footer-col">
        <h4>路径</h4>
        <a href="${url("/guide/")}">${GUIDE_CHAPTER_COUNT} 章导读</a>
        <a href="${url("/learn/path/")}">30 天路径</a>
        <a href="${url("/learn/faq/")}">FAQ</a>
        <a href="${url("/lists/")}">阅读包</a>
      </div>
      <div class="footer-col">
        <h4>视图</h4>
        <a href="${url("/papers/")}">Papers</a>
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
        <a href="${url("/about/")}">本站说明</a>
        <a href="${url("/contributors/")}">Contributors</a>
        <a href="${url("/changelog/")}">Changelog</a>
        <a href="${SITE_ORIGIN}/">Jason 主站</a>
        <a href="${SITE_ORIGIN}/about/">About Jason</a>
        <a href="${SITE_ORIGIN}/resume/">Résumé</a>
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
    <div class="footer-signature">
      <div class="jx-footer__colophon">
        <strong>Embodied AI: Zero to One</strong>
        <span lang="en">A Jason / Works learning system · VOL MMXXVI</span>
      </div>
      <nav class="jx-footer__index" aria-label="页脚作品集导航">
        <a href="${SITE_ORIGIN}/">hub</a>
        <a href="${SITE_ORIGIN}/about/">about</a>
        <a href="${SITE_ORIGIN}/resume/">résumé</a>
        <a href="https://github.com/estelledc/embodied-ai-reading-station">github</a>
        <a href="${url("/feed.xml")}" type="application/atom+xml">rss</a>
      </nav>
      <time class="jx-footer__stamp" datetime="${BUILD_DATE.toISOString()}" lang="en" title="构建时间 (UTC)">${BUILD_DATE.toISOString().slice(0,16).replace("T", " · ")}</time>
    </div>
  </footer>`;
}

export function page({
  title,
  body,
  active,
  extraHead = "",
  extraScripts = [],
  ogTitle = null,
  ogDescription = null,
  ogImage = null,
  ogImageAlt = null,
  ogImageWidth = null,
  ogImageHeight = null,
  ogUrl = null,
  ogType = "website",
  canonicalPath = null,
  jsonLd = null,
  robots = null,
  hasMath = null,
}) {
  // 自动检测：有 $ 或 $$ 的页面才加载 KaTeX
  if (hasMath === null) hasMath = /\$[^$\n]+\$|\$\$[\s\S]+?\$\$/.test(body);
  const _ogTitle = ogTitle || title;
  const _ogDesc = ogDescription || `从零开始学具身智能——${GUIDE_CHAPTER_COUNT} 章系统教程 + ${PAPER_COUNT} 篇论文笔记，零术语假设，日常类比起步。`;
  const _ogImg = ogImage || `${SITE_URL}/images/hero.webp`;
  const defaultPath = active && active !== "index" ? `/${active}/` : "/";
  const canonicalRoute = (canonicalPath || defaultPath).replace(/^\/+/, "");
  const _ogUrl = ogUrl || new URL(canonicalRoute, `${SITE_URL}/`).href;
  const _ogImageAlt = ogImageAlt || _ogTitle;
  const _ogImageWidth = ogImageWidth || (!ogImage ? 1672 : null);
  const _ogImageHeight = ogImageHeight || (!ogImage ? 941 : null);
  const _jsonLd = jsonLd === false ? null : jsonLd || {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": _ogUrl,
    "url": _ogUrl,
    "name": _ogTitle,
    "description": _ogDesc,
    "inLanguage": "zh-CN",
    "isPartOf": { "@id": `${SITE_URL}/#website` },
    "author": { "@id": `${SITE_ORIGIN}/#person` },
  };
  const jsonLdHtml = _jsonLd ? JSON.stringify(_jsonLd).replace(/</g, "\\u003c") : "";
  const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${escAttr(_ogDesc)}">
  ${robots ? `<meta name="robots" content="${escAttr(robots)}">` : ""}
  <meta property="og:type" content="${escAttr(ogType)}">
  <meta property="og:title" content="${escAttr(_ogTitle)}">
  <meta property="og:description" content="${escAttr(_ogDesc)}">
  <meta property="og:image" content="${escAttr(_ogImg)}">
  ${_ogImageWidth ? `<meta property="og:image:width" content="${escAttr(_ogImageWidth)}">` : ""}
  ${_ogImageHeight ? `<meta property="og:image:height" content="${escAttr(_ogImageHeight)}">` : ""}
  <meta property="og:image:type" content="image/webp">
  <meta property="og:image:alt" content="${escAttr(_ogImageAlt)}">
  <meta property="og:url" content="${escAttr(_ogUrl)}">
  <meta property="og:site_name" content="Embodied AI: Zero to One">
  <meta property="og:locale" content="zh_CN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escAttr(_ogTitle)}">
  <meta name="twitter:description" content="${escAttr(_ogDesc)}">
  <meta name="twitter:image" content="${escAttr(_ogImg)}">
  <meta name="twitter:image:alt" content="${escAttr(_ogImageAlt)}">
  <script src="${url("/theme-toggle.js")}"></script>
  <link rel="stylesheet" href="${url("/vendor/fonts/fonts.css")}">
  <link rel="stylesheet" href="${url("/jx/tokens.css")}">
  <link rel="stylesheet" href="${url("/jx/base.css")}">
  <link rel="stylesheet" href="${url("/jx/components.css")}">
  <link rel="stylesheet" href="${url("/styles.css")}">
  <link rel="stylesheet" href="${url("/pagefind/pagefind-ui.css")}">
  ${hasMath ? `<link rel="stylesheet" href="${url("/vendor/katex/katex.min.css")}">` : ""}
  <link rel="alternate" type="application/atom+xml" title="Embodied AI: Zero to One — Atom feed" href="${url("/feed.xml")}">
  <link rel="canonical" href="${escAttr(_ogUrl)}">
  <link rel="alternate" hreflang="zh-CN" href="${escAttr(_ogUrl)}">
  <link rel="alternate" hreflang="x-default" href="${escAttr(_ogUrl)}">
  ${active === "index" ? `<link rel="preload" as="image" href="${url("/images/hero.webp")}" fetchpriority="high">` : ""}
  <link rel="icon" type="image/svg+xml" href="${url("/favicon.svg")}">
  <link rel="manifest" href="${url("/site.webmanifest")}">
  <link rel="search" type="application/opensearchdescription+xml" title="Embodied AI: Zero to One" href="${url("/opensearch.xml")}">
  <meta name="theme-color" content="#ed6f5c">
  ${_jsonLd ? `<script type="application/ld+json">${safeJsonForScript(_jsonLd)}</script>` : ""}
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
  <script src="${url("/data-api.js")}" defer></script>
  <script src="${url("/reading-progress.js")}" defer></script>
  <script src="${url("/quick-filter.js")}" defer></script>
  <script src="${url("/keyboard.js")}" defer></script>
  <script src="${url("/more-nav.js")}" defer></script>
  <script src="${url("/link-preview.js")}" defer></script>
  <script src="${url("/sw-register.js")}" defer></script>
  <script src="${url("/svg-export.js")}" defer></script>
  ${extraScripts.map(src => `<script src="${escAttr(url(src))}" defer></script>`).join("\n  ")}
  ${hasMath ? `<script src="${url("/vendor/katex/katex.min.js")}" defer></script>` : ""}
  ${hasMath ? `<script src="${url("/vendor/katex/contrib/auto-render.min.js")}" defer></script>` : ""}
  ${hasMath ? `<script src="${url("/math-render.js")}" defer></script>` : ""}
</body>
</html>`;
}
