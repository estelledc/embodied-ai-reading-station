import assert from "node:assert/strict";
import test from "node:test";

import { buildHomeJsonLd, buildIndex, renderRecentCommits } from "./papers.mjs";

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
  assert.equal(person.name, "Jason Zhou");
  assert.equal(website.author["@id"], person["@id"]);
  assert.equal(resource.creator["@id"], person["@id"]);
  assert.deepEqual(resource.additionalProperty.map(item => item.value), [22, 156, 11]);
});

test("home presents project proof, an English summary and honest limits", () => {
  const html = buildIndex([]);

  assert.match(html, /Project proof \/ 项目证明/);
  assert.match(html, /个人角色 \/ Role/);
  assert.match(html, /系统 \/ System/);
  assert.match(html, /证据 \/ Evidence/);
  assert.match(html, /局限 \/ Limitations/);
  assert.match(html, /An editorial learning system/);
  assert.match(html, /结构门禁不等于逐页人工复核/);
  assert.match(html, /<div class="hero-text">[\s\S]*?<div class="hero-actions">[\s\S]*?<\/div>\s*<\/div>\s*<figure class="hero-figure">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/estelledc\.github\.io\/embodied-ai-reading-station\/">/);
});
