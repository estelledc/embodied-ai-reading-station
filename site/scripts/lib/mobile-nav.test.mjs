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
  const nativeOpen = declarationsFor(".more-nav[open] .more-nav-panel", css.indexOf("more-nav dropdown"));

  assert.match(base, /\bdisplay\s*:\s*none\s*;/);
  assert.match(open, /\bdisplay\s*:\s*flex\s*;/);
  assert.match(nativeOpen, /\bdisplay\s*:\s*flex\s*;/);
});

test("mobile masthead nav is width-constrained and may wrap", () => {
  const mobileStart = css.indexOf("@media (max-width: 600px)");
  const nav = declarationsFor(".masthead nav", mobileStart);

  assert.match(nav, /\bwidth\s*:\s*100%\s*;/);
  assert.match(nav, /\bmax-width\s*:\s*100%\s*;/);
  assert.match(nav, /\bflex-wrap\s*:\s*wrap\s*;/);
});

test("portfolio navigation collapses to an accessible Works menu", () => {
  const showcaseStart = css.indexOf("Showcase v2");
  const menuStart = css.indexOf("\n.portfolio-menu {", showcaseStart);
  const closed = declarationsFor(".portfolio-menu", menuStart);
  const responsiveStart = css.indexOf("@media (max-width: 1120px)", showcaseStart);
  const opened = declarationsFor(".portfolio-menu", responsiveStart);
  const links = declarationsFor(".portfolio-menu nav a", showcaseStart);

  assert.match(closed, /\bdisplay\s*:\s*none\s*;/);
  assert.match(opened, /\bdisplay\s*:\s*block\s*;/);
  assert.match(links, /\bmin-height\s*:\s*44px\s*;/);
});

test("mobile primary navigation keeps 44px touch targets", () => {
  const showcaseStart = css.indexOf("Showcase v2");
  const mobileStart = css.indexOf("@media (max-width: 700px)", showcaseStart);
  const links = declarationsFor(".masthead .primary-nav > a", mobileStart);

  assert.match(links, /\bmin-height\s*:\s*44px\s*;/);
});

test("theme toggle stays in the masthead control row at desktop and mobile widths", () => {
  const showcaseStart = css.indexOf("Showcase v2");
  const desktop = declarationsFor(".masthead", showcaseStart);
  const toggle = declarationsFor(".masthead .theme-toggle", showcaseStart);
  const mobileStart = css.indexOf("@media (max-width: 700px)", showcaseStart);
  const mobile = declarationsFor(".masthead", mobileStart);
  const mobileToggle = declarationsFor(".masthead .theme-toggle", mobileStart);

  assert.match(desktop, /grid-template-columns:\s*minmax\(250px, 1fr\)\s+auto\s+auto\s+auto\s+auto\s+auto;/);
  assert.match(toggle, /\bmin-width\s*:\s*44px\s*;/);
  assert.match(mobile, /grid-template-columns:\s*minmax\(0, 1fr\)\s+auto\s+auto;/);
  assert.match(mobileToggle, /\bgrid-column\s*:\s*3\s*;/);
});

test("showcase mobile keeps the value proposition before the illustration", () => {
  const showcaseStart = css.indexOf("Showcase v2");
  const responsiveStart = css.indexOf("@media (max-width: 900px)", showcaseStart);
  const figure = declarationsFor(".showcase-home .hero-figure", responsiveStart);

  assert.match(figure, /\border\s*:\s*0\s*;/);
});
