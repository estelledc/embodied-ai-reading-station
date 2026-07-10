import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const css = fs.readFileSync(path.join(SITE, "src", "theme.css"), "utf8");

function declarationsFor(selector, start = 0) {
  const selectorStart = css.indexOf(selector, start);
  assert.notEqual(selectorStart, -1, `missing selector: ${selector}`);
  const blockStart = css.indexOf("{", selectorStart);
  const blockEnd = css.indexOf("}", blockStart);
  assert.notEqual(blockStart, -1, `missing declaration block: ${selector}`);
  assert.notEqual(blockEnd, -1, `unterminated declaration block: ${selector}`);
  return css.slice(blockStart + 1, blockEnd);
}

test("closed More panel is removed from layout and scrollable overflow", () => {
  const base = declarationsFor(".more-nav-panel", css.indexOf("more-nav dropdown"));
  const open = declarationsFor(".more-nav:hover .more-nav-panel", css.indexOf("more-nav dropdown"));

  assert.match(base, /\bdisplay\s*:\s*none\s*;/);
  assert.match(open, /\bdisplay\s*:\s*flex\s*;/);
});

test("mobile masthead nav is width-constrained and may wrap", () => {
  const mobileStart = css.indexOf("@media (max-width: 600px)");
  const nav = declarationsFor(".masthead nav", mobileStart);

  assert.match(nav, /\bwidth\s*:\s*100%\s*;/);
  assert.match(nav, /\bmax-width\s*:\s*100%\s*;/);
  assert.match(nav, /\bflex-wrap\s*:\s*wrap\s*;/);
});
