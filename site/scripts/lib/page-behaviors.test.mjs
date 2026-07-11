import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { page, safeJsonForScript } from "./layout.mjs";
import { buildDiscover } from "./views/aggregates.mjs";
import { build404, buildNext, buildRandom } from "./views/meta.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "..", "..", "src");
const BEHAVIORS_SOURCE = fs.readFileSync(path.join(SRC, "page-behaviors.js"), "utf8");
const KEYBOARD_SOURCE = fs.readFileSync(path.join(SRC, "keyboard.js"), "utf8");
const MATH_SOURCE = fs.readFileSync(path.join(SRC, "math-render.js"), "utf8");
const DECK = path.resolve(HERE, "..", "..", "..", "deck");
const DECK_HTML = fs.readFileSync(path.join(DECK, "index.html"), "utf8");
const DECK_CSS = fs.readFileSync(path.join(DECK, "deck.css"), "utf8");

class MockElement {
  constructor(tagName = "div", attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    this.children = [];
    this.hidden = false;
    this.style = { cssText: "" };
    this.textContent = "";
    this.className = "";
    this.href = "";
  }

  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  replaceChildren(...children) { this.children = [...children]; }
}

function fixedDate(iso) {
  return class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [iso])); }
    static now() { return new Date(iso).getTime(); }
  };
}

function bootBehavior({
  mode,
  base = "",
  pathname = `${base}/`,
  data = {},
  readValue = "[]",
  random = 0,
  api = null,
} = {}) {
  const root = new MockElement("main", { "data-eai-page-behavior": mode });
  const baseMarker = new MockElement("div", { "data-base": base });
  const ids = new Map();
  for (const [id, value] of Object.entries(data)) {
    const node = new MockElement("script", { type: "application/json", id });
    node.textContent = JSON.stringify(value);
    ids.set(id, node);
  }
  const discover = new Map(
    ["today", "shuffle", "newera", "newtopic"].map(name => [name, new MockElement("div")]),
  );
  const suggest = new MockElement("aside");
  suggest.hidden = true;
  const suggestList = new MockElement("ol");
  ids.set("eai-404-suggest", suggest);
  ids.set("eai-404-list", suggestList);

  const document = {
    readyState: "complete",
    activeElement: null,
    body: new MockElement("body"),
    querySelector(selector) {
      if (selector === "[data-eai-page-behavior]") return root;
      if (selector === ".search-container[data-base]") return baseMarker;
      const modeMatch = selector.match(/^\[data-discover-mode="([^"]+)"\]$/);
      return modeMatch ? discover.get(modeMatch[1]) ?? null : null;
    },
    getElementById(id) { return ids.get(id) ?? null; },
    createElement(tagName) { return new MockElement(tagName); },
    addEventListener() {},
  };
  const navigations = [];
  const location = {
    pathname,
    replace(value) { navigations.push(value); },
  };
  const events = [];
  const errors = [];
  const math = Object.create(Math);
  math.random = () => random;
  const window = {
    EAI_DATA_API: api,
    dispatchEvent(event) { events.push(event); },
  };
  const context = vm.createContext({
    document,
    window,
    location,
    localStorage: { getItem() { return readValue; } },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    console: { error(...args) { errors.push(args); } },
    Date: fixedDate("2026-07-11T12:00:00Z"),
    Math: math,
  });
  vm.runInContext(BEHAVIORS_SOURCE, context, { filename: "page-behaviors.js" });
  return { discover, errors, events, ids, navigations, suggest, suggestList };
}

function executableInlineScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs]) => !/\bsrc\s*=/i.test(attrs))
    .filter(([, attrs]) => !/\btype\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attrs));
}

function assertNoInlineBehavior(html) {
  assert.equal(executableInlineScripts(html).length, 0);
  assert.doesNotMatch(html, /\son[a-z][a-z0-9_-]*\s*=/i);
  assert.doesNotMatch(html, /(?:href|src)\s*=\s*["']\s*javascript\s*:/i);
}

const NOTES = [
  { slug: "clip", num: 1, title: "CLIP", topicLabel: "Vision", era: "founder", tldr: "clip", year: 2021 },
  { slug: "vision-next", num: 2, title: "Vision Next", topicLabel: "Vision", era: "classic", tldr: "next", year: 2022 },
  { slug: "robot", num: 3, title: "Robot", topicLabel: "Robotics", era: "frontier", tldr: "robot", year: 2024 },
];

test("layout externalizes theme, navigation, and KaTeX behavior in deterministic order", () => {
  const html = page({ title: "math", body: "<main>$x$</main>", active: "", hasMath: true });

  assertNoInlineBehavior(html);
  assert.match(html, /<head>[\s\S]*<script src="[^"]*\/theme-toggle\.js"><\/script>[\s\S]*<\/head>/);
  assert.equal((html.match(/theme-toggle\.js/g) ?? []).length, 1);
  assert.equal((html.match(/more-nav\.js/g) ?? []).length, 1);
  assert.ok(html.indexOf("/keyboard.js") < html.indexOf("/more-nav.js"));
  const katex = html.indexOf("/vendor/katex/katex.min.js");
  const autoRender = html.indexOf("/vendor/katex/contrib/auto-render.min.js");
  const mathRender = html.indexOf("/math-render.js");
  assert.ok(katex >= 0 && katex < autoRender && autoRender < mathRender);
});

test("builders emit inert escaped JSON and one external route behavior script", () => {
  const hostile = `${NOTES[0].topicLabel}</script><script>globalThis.pwned=1</script>`;
  const notes = [{ ...NOTES[0], topicLabel: hostile, title: hostile }, ...NOTES.slice(1)];
  for (const html of [buildNext(notes), buildRandom(notes), buildDiscover(notes), build404(NOTES)]) {
    assertNoInlineBehavior(html);
    assert.match(html, /data-eai-page-behavior=/);
    assert.match(html, /<script src="[^"]*\/page-behaviors\.js" defer><\/script>/);
    assert.doesNotMatch(html, /<\/script><script>globalThis\.pwned/);
  }
  assert.match(buildNext(notes), /\\u003c\/script>/);
  assert.match(buildDiscover(notes), /\\u003c\/script>/);
  assert.equal(safeJsonForScript({ value: "</script>" }), '{"value":"\\u003c/script>"}');
});

test("next behavior supports root and repository bases", () => {
  const papers = NOTES.map(({ slug, topicLabel: topic, era }) => ({ slug, topic, era }));
  const root = bootBehavior({ mode: "next", data: { "eai-next-data": papers } });
  assert.deepEqual(root.navigations, ["/papers/clip/"]);

  const repo = bootBehavior({
    mode: "next",
    base: "/embodied-ai-reading-station",
    pathname: "/embodied-ai-reading-station/next/",
    data: { "eai-next-data": papers },
    readValue: JSON.stringify(papers.map(p => p.slug)),
  });
  assert.deepEqual(repo.navigations, ["/embodied-ai-reading-station/lists/"]);

  const corrupt = bootBehavior({ mode: "next", data: { "eai-next-data": papers }, readValue: "{" });
  assert.deepEqual(corrupt.navigations, ["/"]);
});

test("random behavior prefers unread papers and preserves repository base", () => {
  const result = bootBehavior({
    mode: "random",
    base: "/embodied-ai-reading-station",
    pathname: "/embodied-ai-reading-station/random/",
    data: { "eai-random-data": ["clip", "vision-next", "robot"] },
    readValue: '["clip"]',
    random: 0,
  });
  assert.deepEqual(result.navigations, ["/embodied-ai-reading-station/papers/vision-next/"]);
});

test("discover behavior builds cards with DOM text instead of HTML sinks", () => {
  const hostile = {
    slug: "clip",
    num: 1,
    title: '<img src=x onerror="globalThis.pwned=1">',
    topic: "Vision",
    era: "founder",
    tldr: "safe",
    url: "/papers/clip/",
    year: 2021,
  };
  const result = bootBehavior({ mode: "discover", data: { "eai-discover-data": [hostile] } });
  const card = result.discover.get("today").children[0];
  const heading = card.children.find(child => child.tagName === "H3");
  assert.equal(heading.textContent, '<img src=x onerror="globalThis.pwned=1">');
  assert.equal(result.discover.get("shuffle").children.length, 1);
  assert.equal(result.discover.get("newera").children.length, 1);
  assert.equal(result.discover.get("newtopic").children.length, 1);
});

test("404 suggestions reuse the shared API and emit repository-local links", async () => {
  const bases = [];
  const api = {
    loadPapers({ base }) {
      bases.push(base);
      return Promise.resolve([{ slug: "missing-paper", title: "Missing Paper", topic: "Vision", year: 2024 }]);
    },
    reportError(error) { throw error; },
  };
  const result = bootBehavior({
    mode: "not-found",
    base: "/embodied-ai-reading-station",
    pathname: "/embodied-ai-reading-station/missing-paper/",
    api,
  });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(bases, ["/embodied-ai-reading-station"]);
  assert.equal(result.suggest.hidden, false);
  assert.equal(result.suggestList.children.length, 1);
  const item = result.suggestList.children[0];
  assert.equal(item.className, "not-found-suggestion-item");
  assert.equal(item.children[0].className, "not-found-suggestion-link");
  assert.equal(item.children[0].href, "/embodied-ai-reading-station/papers/missing-paper/");
  assert.equal(item.children[1].className, "not-found-suggestion-meta");
});

test("keyboard button uses the same external help-dialog behavior as the ? shortcut", () => {
  const triggerListeners = new Map();
  const trigger = { addEventListener(type, handler) { triggerListeners.set(type, handler); } };
  let dialog = null;
  const documentListeners = new Map();
  const document = {
    activeElement: null,
    body: { appendChild() {} },
    querySelector(selector) {
      if (selector.includes("styles.css")) return { getAttribute: () => "/styles.css" };
      if (selector === ".kb-trigger") return trigger;
      return null;
    },
    createElement(tagName) {
      assert.equal(tagName, "dialog");
      const closeButton = { addEventListener() {} };
      dialog = {
        open: false,
        className: "",
        innerHTML: "",
        querySelector() { return closeButton; },
        addEventListener() {},
        showModal() { this.open = true; },
        close() { this.open = false; },
      };
      return dialog;
    },
    addEventListener(type, handler) { documentListeners.set(type, handler); },
  };
  vm.runInNewContext(KEYBOARD_SOURCE, { document, location: { pathname: "/" }, window: {}, setTimeout, clearTimeout });
  assert.equal(typeof triggerListeners.get("click"), "function");
  triggerListeners.get("click")();
  assert.equal(dialog.open, true);
  assert.equal(typeof documentListeners.get("keydown"), "function");
});

test("math renderer invokes KaTeX auto-render with both supported delimiters", () => {
  const calls = [];
  vm.runInNewContext(MATH_SOURCE, {
    document: { body: {} },
    window: { renderMathInElement(...args) { calls.push(args); } },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].delimiters)), [
    { left: "$$", right: "$$", display: true },
    { left: "$", right: "$", display: false },
  ]);
});

test("built deck references only self-hosted fonts, CSS, and behavior", () => {
  assertNoInlineBehavior(DECK_HTML);
  assert.doesNotMatch(DECK_HTML, /<style\b/i);
  assert.doesNotMatch(DECK_HTML, /https?:\/\/(?:rsms\.me|fonts\.googleapis\.com)/i);
  assert.match(DECK_HTML, /href="\.\.\/vendor\/fonts\/fonts\.css"/);
  assert.match(DECK_HTML, /href="\.\/deck\.css"/);
  assert.match(DECK_HTML, /src="\.\/deck\.js" defer/);
  assert.match(DECK_CSS, /data:image\/svg\+xml/);
});
