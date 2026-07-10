import assert from "node:assert/strict";
import test from "node:test";

import { renderRecentCommits } from "./papers.mjs";

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
