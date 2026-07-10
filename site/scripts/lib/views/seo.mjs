// SEO / 机器可读产物：Atom feed、sitemap、robots、humans、security、llms、opensearch、data JSON/CSV。

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
  DIST, NOTES_DIR, SITE_URL, BUILD_DATE, GENERATED_AT, normalizeContentDate,
} from "../config.mjs";
import { write } from "../assets.mjs";
import { TOPIC_ORDER, PAPER_COUNT, TOPIC_COUNT } from "../content.mjs";
import { READING_LISTS } from "./aggregates.mjs";

const noteDateCache = new Map();

// Note dates are content metadata, not deploy metadata. Existing notes expose
// generated_at in frontmatter; future writers may add an explicit publication or
// modification field without changing the public API again.
export function contentDatesForNote(note) {
  const explicit = {
    published: note.datePublished ?? note.published_at ?? note.generated_at ?? note.generatedAt,
    modified: note.content_modified ?? note.updated_at ?? note.updatedAt ?? note.dateModified,
  };
  if (explicit.published !== undefined || explicit.modified !== undefined) {
    const generatedAt = normalizeContentDate(explicit.published);
    return {
      generatedAt,
      contentModified: normalizeContentDate(explicit.modified) ?? generatedAt,
    };
  }

  if (!note.slug) return { generatedAt: null, contentModified: null };
  if (noteDateCache.has(note.slug)) return noteDateCache.get(note.slug);

  const notePath = path.join(NOTES_DIR, `${note.slug}.md`);
  let dates = { generatedAt: null, contentModified: null };
  if (fs.existsSync(notePath)) {
    const data = matter(fs.readFileSync(notePath, "utf8")).data;
    const generatedAt = normalizeContentDate(
      data.datePublished ?? data.published_at ?? data.generated_at
    );
    dates = {
      generatedAt,
      contentModified: normalizeContentDate(
        data.content_modified ?? data.updated_at ?? data.dateModified
      ) ?? generatedAt,
    };
  }
  noteDateCache.set(note.slug, dates);
  return dates;
}

function atomTimestamp(date, fallback = GENERATED_AT) {
  return date ? `${date}T00:00:00.000Z` : fallback;
}

// --- RSS / Atom feed --------------------------------------------------------
export function buildFeed(issuePages, notes) {
  const updated = GENERATED_AT;
  const xmlEscape = s => String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  const entries = [];
  for (const p of issuePages) {
    const slug = p.slug.replace("issue-", "");
    const link = `${SITE_URL}/issues/${slug}/`;
    const issueDate = normalizeContentDate(p.content_modified ?? p.updated_at ?? p.issueDate);
    const pubDate = issueDate || updated.slice(0, 10);
    entries.push(`  <entry>
    <title>${xmlEscape(p.title)}</title>
    <link href="${link}"/>
    <id>${link}</id>
    <updated>${atomTimestamp(issueDate)}</updated>
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
    const dates = contentDatesForNote(n);
    entries.push(`  <entry>
    <title>${xmlEscape(`№ ${n.num} · ${n.title}`)}</title>
    <link href="${link}"/>
    <id>${link}</id>
    <updated>${atomTimestamp(dates.contentModified ?? dates.generatedAt)}</updated>
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

// --- data endpoints ---------------------------------------------------------
export function writeDataFiles(notes) {
  // data endpoints (public JSON for research / external use)
  const papersJson = notes.map(n => {
    const dates = contentDatesForNote(n);
    return {
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
      generated_at: dates.generatedAt,
      content_modified: dates.contentModified,
    };
  });
  write(path.join(DIST, "data", "papers.json"), JSON.stringify(papersJson, null, 2));

  // CSV (R/Pandas 友好)
  const csvCols = ["slug", "num", "title", "topic", "topicLabel", "era", "year", "venue", "difficulty", "tldr", "wordCount", "readingMinutes", "tags", "url", "sourcePath", "status", "generated_at", "content_modified"];
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
    generated_at: GENERATED_AT,
    // Legacy alias retained for existing API consumers.
    generated: GENERATED_AT,
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
}

// --- 全站级 SEO 产物 --------------------------------------------------------
export function writeSeoFiles(notes, guideData, issuePages, learnPages) {
  // sitemap
  {
    const today = BUILD_DATE.toISOString().slice(0, 10);
    const guideUrls = guideData.chapters.length > 0 ? ["/guide/", ...guideData.chapters.map(c => `/guide/${c.slug}/`)] : [];
    const staticUrls = [
      "/", "/topics/", "/timeline/", "/compare/", "/glossary/", "/graph/",
      ...(issuePages.length ? ["/issues/"] : []),
      "/about/",
      ...(learnPages.length ? ["/learn/"] : []),
      "/deck/",
      ...guideUrls,
      ...TOPIC_ORDER.map(t => `/topics/${t.id}/`),
      ...learnPages.map(p => `/learn/${p.slug}/`),
    ];
    const urls = [
      ...staticUrls.map(url => ({ url, lastmod: today })),
      ...notes.map(note => ({
        url: `/papers/${note.slug}/`,
        lastmod: contentDatesForNote(note).contentModified ?? today,
      })),
      ...issuePages.map(issue => ({
        url: `/issues/${issue.slug.replace("issue-", "")}/`,
        lastmod: normalizeContentDate(
          issue.content_modified ?? issue.updated_at ?? issue.issueDate
        ) ?? today,
      })),
    ];
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ url, lastmod }) => `  <url><loc>${SITE_URL}${url}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}
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
Build generated: ${BUILD_DATE.toISOString().slice(0, 10)}
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
}
