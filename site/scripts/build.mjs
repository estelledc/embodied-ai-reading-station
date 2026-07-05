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
import {
  buildNext, buildRandom, buildSiteMap, buildContributors,
  buildChangelog, build404, buildAbout,
} from "./lib/views/meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
