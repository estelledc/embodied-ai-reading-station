import assert from "node:assert/strict";
import test from "node:test";

import { buildHomeJsonLd, buildIndex, buildPapersIndex, renderRecentCommits } from "./papers.mjs";

test("recent commits render stable commit dates instead of wall-clock-relative ages", () => {
  const input = [
    "abc1234|2026-07-10|fix: deterministic build",
    "def5678|2026-07-09|docs: keep A | B & <safe>",
  ].join("\n");

  const html = renderRecentCommits(input);

  assert.match(html, /<time class="lc-ago" datetime="2026-07-10">2026-07-10<\/time>/);
  assert.match(html, /keep A \| B &amp; &lt;safe&gt;/);
  assert.doesNotMatch(html, /seconds ago|minutes ago|hours ago/);
});

test("recent commits skip malformed rows", () => {
  assert.equal(renderRecentCommits("abc|not-a-date|subject\nmissing fields"), "");
});

test("home JSON-LD identifies the maker and exposes only verifiable project counts", () => {
  const data = buildHomeJsonLd({ paperCount: 156, topicCount: 11, guideChapterCount: 22 });
  const [person, website, resource] = data["@graph"];

  assert.equal(person["@type"], "Person");
  assert.equal(person.name, "Jason Xun");
  assert.equal(person["@id"], "https://estelledc.github.io/#person");
  assert.equal(website.author["@id"], person["@id"]);
  assert.equal(resource.creator["@id"], person["@id"]);
  assert.deepEqual(resource.additionalProperty.map(item => item.value), [22, 156, 11]);
});

test("home presents a three-step learning journey without the full paper wall", () => {
  const html = buildIndex([]);

  assert.match(html, /An owner-led, independently maintained learning product/);
  assert.match(html, /<ol class="eai-journey__steps">/);
  assert.match(html, /选路径/);
  assert.match(html, /做对比/);
  assert.match(html, /形成简报/);
  assert.equal((html.match(/jx-proof-rail__label/g) || []).length, 3);
  assert.match(html, /href="\/papers\/"/);
  assert.doesNotMatch(html, /<article class="paper-card"/);
  assert.match(html, /结构门禁不等于逐页人工复核/);
  assert.match(html, /<div class="hero-text">[\s\S]*?<div class="hero-actions">[\s\S]*?<\/div>\s*<\/div>\s*<figure class="hero-figure">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/estelledc\.github\.io\/embodied-ai-reading-station\/">/);
});

test("paper library remains a separate, progressively enhanced browse page", () => {
  const html = buildPapersIndex([]);
  const cardHtml = buildPapersIndex([{
    slug: "llava",
    topic: "vlm-foundation",
    difficulty: "★★",
    era: "founder",
    status: "deep-read",
    num: 1,
    title: "LLaVA",
    readingTime: 12,
    wordCount: 3200,
    tldr: "视觉指令微调。",
  }]);

  assert.match(html, /id="paper-library"/);
  assert.match(html, /id="eai-quick-filter"/);
  assert.match(html, /按主题、难度、era 与内容状态筛选/);
  assert.match(cardHtml, /class="thumb"><img[^>]+loading="lazy"[^>]+decoding="async"/);
  assert.doesNotMatch(cardHtml, /class="thumb" style="background-image/);
  assert.match(html, /<link rel="canonical" href="https:\/\/estelledc\.github\.io\/embodied-ai-reading-station\/papers\/">/);
});
