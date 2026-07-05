#!/usr/bin/env node
// Build the embodied-ai reading station: markdown notes → atelier-zero styled HTML.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { SITE, ROOT, DIST, url } from "./lib/config.mjs";
import { ensure, copyDir, read, write, copyStatic, copyAssets } from "./lib/assets.mjs";
import { stripFirstH1 } from "./lib/markdown.mjs";
import { TOPIC_ORDER, PAPERS, inferTags, discoverGuide, loadNotes } from "./lib/content.mjs";
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
import { buildFeed, writeDataFiles, writeSeoFiles } from "./lib/views/seo.mjs";

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

  // data endpoints (public JSON/CSV for research / external use)
  writeDataFiles(notes);

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

  // sitemap/robots/humans/security/llms/opensearch（全站级 SEO 产物）
  writeSeoFiles(notes, guideData, issuePages, learnPages);

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
