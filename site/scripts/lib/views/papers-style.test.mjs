import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PAPERS } from "../content.mjs";
import { buildNotePage } from "./papers.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAPERS_SOURCE = fs.readFileSync(path.join(HERE, "papers.mjs"), "utf8");
const THEME_CSS = fs.readFileSync(path.resolve(HERE, "../../../src/theme.css"), "utf8");

test("paper view templates do not reintroduce inline style attributes", () => {
  assert.doesNotMatch(PAPERS_SOURCE, /(?<![-\w])style\s*=/i);
});

test("paper template classes have stylesheet counterparts", () => {
  for (const selector of [
    ".home-intro",
    ".home-cta-row",
    ".state-tools",
    ".learning-path-grid",
    ".guide-part-grid",
    ".paper-library-intro",
    ".paper-card-meta",
    ".guide-badges",
    ".paper-full-index",
    ".paper-index-link",
  ]) {
    assert.ok(THEME_CSS.includes(selector), `missing stylesheet selector ${selector}`);
  }
});

test("full paper index keeps one semantic current item without inline styles", () => {
  const current = PAPERS.find(paper => paper.slug === "clip");
  assert.ok(current, "clip paper fixture must exist");

  const html = buildNotePage({
    ...current,
    body: "## Overview\n\nFixture body.",
    tldr: current.tldr || "Fixture",
    wordCount: current.wordCount || 2,
  });
  const start = html.indexOf('<details class="paper-full-index">');
  const end = html.indexOf("</details>", start);
  assert.notEqual(start, -1, "full paper index must render");
  assert.notEqual(end, -1, "full paper index must close");

  const indexHtml = html.slice(start, end);
  assert.doesNotMatch(indexHtml, /(?<![-\w])style\s*=/i);
  assert.equal(indexHtml.match(/class="paper-index-link"/g)?.length, PAPERS.length);
  assert.equal(indexHtml.match(/aria-current="page"/g)?.length, 1);
  assert.match(indexHtml, /class="paper-index-item is-current"><a class="paper-index-link"[^>]+aria-current="page"/);
});
