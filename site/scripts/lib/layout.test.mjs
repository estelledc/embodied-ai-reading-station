import assert from "node:assert/strict";
import test from "node:test";

import { masthead, page } from "./layout.mjs";

const SITE_URL = "https://estelledc.github.io/embodied-ai-reading-station";

test("page emits route-specific canonical, social metadata and WebPage JSON-LD", () => {
  const html = page({
    title: "Topics — Embodied AI",
    body: "<main>Topics</main>",
    active: "topics",
    canonicalPath: "/topics/vla/",
    ogDescription: "VLA topic map",
    ogImageAlt: "VLA topic map illustration",
  });

  const canonical = `${SITE_URL}/topics/vla/`;
  assert.match(html, new RegExp(`<link rel="canonical" href="${canonical}">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${canonical}">`));
  assert.match(html, /<meta property="og:type" content="website">/);
  assert.match(html, /<meta name="twitter:image:alt" content="VLA topic map illustration">/);
  assert.match(html, new RegExp(`"@id":"${canonical}"`));
  assert.match(html, /"@type":"WebPage"/);
});

test("custom social images do not claim the default hero dimensions", () => {
  const html = page({
    title: "Paper note",
    body: "<main>Note</main>",
    active: "index",
    ogImage: `${SITE_URL}/cards/paper.webp`,
    ogType: "article",
    ogUrl: `${SITE_URL}/papers/example/`,
  });

  assert.match(html, /<meta property="og:type" content="article">/);
  assert.doesNotMatch(html, /<meta property="og:image:width"/);
  assert.doesNotMatch(html, /<meta property="og:image:height"/);
});

test("404 metadata is noindex and may suppress JSON-LD", () => {
  const html = page({
    title: "Not found",
    body: "<main>Missing</main>",
    active: "",
    canonicalPath: "/404.html",
    robots: "noindex, nofollow",
    jsonLd: false,
  });

  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(html, /application\/ld\+json/);
});

test("site chrome exposes the portfolio escape route and public profile links", () => {
  const html = masthead("guide");

  assert.match(html, /Jason \/ Works/);
  assert.match(html, /aria-label="Jason 作品集导航"/);
  assert.match(html, /<details class="more-nav">/);
  assert.match(html, /<summary class="more-nav-trigger"/);
  assert.doesNotMatch(html, /class="more-nav-trigger"[^>]*aria-expanded/);
  assert.match(html, /href="https:\/\/estelledc\.github\.io\/about\/">About<\/a>/);
  assert.match(html, /href="https:\/\/estelledc\.github\.io\/resume\/">Résumé<\/a>/);
  assert.match(html, /href="https:\/\/github\.com\/estelledc\/embodied-ai-reading-station">GitHub<\/a>/);
  assert.match(html, /href="\/guide\/" aria-current="page"/);
});
