import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadNotes } from "./content.mjs";
import {
  buildPapersIndex,
  readJpegIntrinsicWidth,
  renderPaperCardThumbnail,
} from "./views/papers.mjs";

const CARD_SIZES = "(max-width: 600px) calc(100vw - 2.5rem), (max-width: 656px) 92vw, (max-width: 997px) calc(46vw - 0.7rem), (max-width: 1240px) calc(30.667vw - 0.934rem), 360px";

function cardMarkup(html, slug) {
  const pattern = new RegExp(
    `<article class="paper-card"[^>]*data-slug="${slug}"[\\s\\S]*?<\\/article>`
  );
  return html.match(pattern)?.[0] ?? "";
}

test("paired card assets use the 800w image by default and expose 800/full candidates", () => {
  const html = renderPaperCardThumbnail({ slug: "demo" }, "IV", {
    fileExists: file => /demo(?:-800)?\.webp$/.test(file),
  });

  assert.match(html, /^<picture class="thumb" aria-hidden="true">/);
  assert.match(
    html,
    /srcset="\/images\/cards\/demo-800\.webp 800w, \/images\/cards\/demo\.webp 1672w"/
  );
  assert.match(html, new RegExp(`sizes="${CARD_SIZES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.match(html, /<img src="\/images\/cards\/demo-800\.webp"/);
  assert.match(html, /alt=""/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /decoding="async"/);
  assert.match(html, /width="800" height="450"/);
  assert.doesNotMatch(html, /background-image/);
});

test("JPEG width reader extracts the intrinsic width from a start-of-frame segment", () => {
  const jpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x07, 0x08, 0x01, 0xc2, 0x02, 0x8f,
  ]);

  assert.equal(readJpegIntrinsicWidth("demo.jpg", { readFile: () => jpeg }), 655);
  assert.equal(readJpegIntrinsicWidth("bad.jpg", { readFile: () => Buffer.from("not-jpeg") }), null);
});

test("real paper thumbnails use their intrinsic width instead of a fabricated descriptor", () => {
  const html = renderPaperCardThumbnail({ slug: "demo" }, "IV", {
    fileExists: file => file.endsWith("papers/demo/images/img_000.jpg"),
    readImageWidth: () => 487,
  });

  assert.match(html, /<picture class="thumb"/);
  assert.match(html, /<source srcset="\/assets\/demo\/img_000\.jpg 487w"/);
  assert.match(html, /src="\/assets\/demo\/img_000\.jpg"/);
  assert.match(html, new RegExp(`sizes="${CARD_SIZES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
  assert.doesNotMatch(html, /img_000\.jpg 800w|\/images\/cards\/demo/);
  assert.match(html, /width="800" height="450"/);
});

test("single full WebP uses its real width descriptor", () => {
  const html = renderPaperCardThumbnail({ slug: "demo" }, "IV", {
    fileExists: file => file.endsWith("demo.webp") && !file.endsWith("demo-800.webp"),
  });

  assert.match(html, /srcset="\/images\/cards\/demo\.webp 1672w"/);
  assert.match(html, new RegExp(`sizes="${CARD_SIZES.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
});

test("unreadable JPEG falls back without an invalid sizes attribute", () => {
  const html = renderPaperCardThumbnail({ slug: "demo" }, "IV", {
    fileExists: file => file.endsWith("papers/demo/images/img_000.jpg"),
    readImageWidth: () => null,
  });

  assert.match(html, /<source srcset="\/assets\/demo\/img_000\.jpg">/);
  assert.doesNotMatch(html, /\bsizes=/);
});

test("missing cards render a zero-request 16:9 placeholder", () => {
  const html = renderPaperCardThumbnail({ slug: "missing" }, "IV", {
    fileExists: () => false,
  });

  assert.equal(
    html,
    '<div class="thumb thumb-placeholder" aria-hidden="true"><span>IV</span></div>'
  );
  assert.doesNotMatch(html, /<(?:picture|img|source)\b|\bsrc(?:set)?=|background-image|url\(/);
});

test("all paper library cards use decorative responsive images and keep title link names", () => {
  const html = buildPapersIndex(loadNotes());
  const cards = [...html.matchAll(/<article class="paper-card"[\s\S]*?<\/article>/g)]
    .map(match => match[0]);

  assert.equal(cards.length, 186);
  for (const card of cards) {
    assert.match(card, /<picture class="thumb" aria-hidden="true">/);
    assert.match(card, /<source srcset="[^"]+ \d+w(?:, [^"]+ \d+w)*" sizes="[^"]+">/);
    assert.match(card, /<img [^>]*alt=""[^>]*loading="lazy"[^>]*decoding="async"[^>]*width="800" height="450">/);
    assert.match(card, /<h3><a href="[^"]+">[^<]+<\/a><\/h3>/);
    assert.doesNotMatch(card, /background-image/);
  }

  const paired = cardMarkup(html, "daydreamer");
  assert.match(paired, /src="\/images\/cards\/daydreamer-800\.webp"/);
  assert.match(paired, /daydreamer-800\.webp 800w, \/images\/cards\/daydreamer\.webp 1672w/);

  const real = cardMarkup(html, "clip");
  assert.match(real, /src="\/assets\/clip\/img_000\.jpg"/);
  assert.match(real, /srcset="\/assets\/clip\/img_000\.jpg 487w"/);
  assert.doesNotMatch(real, /img_000\.jpg 800w|\/images\/cards\/clip/);

  const deepReadCard = cardMarkup(html, "lerobot");
  assert.match(deepReadCard, /src="\/images\/cards\/lerobot-800\.webp"/);
  assert.match(deepReadCard, /lerobot-800\.webp 800w, \/images\/cards\/lerobot\.webp 1672w/);

  assert.equal(cards.filter(card => card.includes("/assets/")).length, 54);
  assert.equal(cards.filter(card => card.includes("/images/cards/")).length, 132);
  assert.equal(cards.filter(card => card.includes("/images/topics/")).length, 0);
});

test("card CSS preserves the media crop and collapses the grid safely on narrow screens", () => {
  const css = fs.readFileSync(new URL("../../src/theme.css", import.meta.url), "utf8");

  assert.match(css, /\.paper-card\s*\{[^}]*\bmin-width:\s*0;/s);
  assert.match(css, /\.paper-card h3\s*\{[^}]*\boverflow-wrap:\s*anywhere;/s);
  assert.match(css, /\.paper-card \.thumb\s*\{[^}]*\baspect-ratio:\s*16\s*\/\s*9;[^}]*\boverflow:\s*hidden;/s);
  assert.match(css, /\.paper-card \.thumb img\s*\{[^}]*\bobject-fit:\s*cover;/s);
  assert.match(
    css,
    /@media \(max-width:\s*600px\)\s*\{\s*\.papers-grid\s*\{\s*grid-template-columns:\s*minmax\(0,\s*1fr\);/s,
  );
  assert.doesNotMatch(css, /\.paper-card\s*\{[^}]*\boverflow:\s*hidden;/s);
});
