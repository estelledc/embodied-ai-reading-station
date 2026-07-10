import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEARCH_SOURCE = fs.readFileSync(path.join(SITE, "src", "search.js"), "utf8");
const PREVIEW_SOURCE = fs.readFileSync(path.join(SITE, "src", "link-preview.js"), "utf8");

class FakeTarget {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  dispatchEvent(event) {
    for (const handler of this.listeners.get(event.type) || []) handler.call(this, event);
    return true;
  }
}

class FakeElement extends FakeTarget {
  constructor(tagName, document, unsafeWrites) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.unsafeWrites = unsafeWrites;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.hidden = false;
    this.value = "";
    this.textContent = "";
    this.className = "";
    this.classList = {
      add: (...names) => names.forEach(name => this.className = `${this.className} ${name}`.trim()),
      remove: (...names) => {
        const remove = new Set(names);
        this.className = this.className.split(/\s+/).filter(name => name && !remove.has(name)).join(" ");
      },
    };
  }
  set innerHTML(value) { this.unsafeWrites.push({ element: this, value: String(value) }); }
  get innerHTML() { return ""; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  querySelector() { return null; }
  querySelectorAll(selector) {
    const matches = [];
    const visit = element => {
      if (selector === "button[data-q]" && element.tagName === "BUTTON" && "q" in element.dataset) {
        matches.push(element);
      }
      for (const child of element.children || []) visit(child);
    };
    visit(this);
    return matches;
  }
  getBoundingClientRect() { return { width: 240, height: 100 }; }
  getAttribute(name) { return this[name] ?? null; }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

class FakeDocument extends FakeTarget {
  constructor(unsafeWrites) {
    super();
    this.unsafeWrites = unsafeWrites;
    this.body = this.createElement("body");
    this.activeElement = null;
    this.nodes = new Map();
  }
  createElement(tagName) { return new FakeElement(tagName, this, this.unsafeWrites); }
  querySelector(selector) { return this.nodes.get(selector) || null; }
}

function localStorageHarness(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    value: key => values.get(key),
  };
}

function runSearch({ history = [], search = "" } = {}) {
  const unsafeWrites = [];
  const document = new FakeDocument(unsafeWrites);
  const dialog = document.createElement("dialog");
  const trigger = document.createElement("button");
  const container = document.createElement("div");
  const input = document.createElement("input");
  const historyWrap = document.createElement("div");
  container.dataset.base = "/embodied-ai-reading-station";
  container.querySelector = selector => selector === "input" ? input : null;
  document.nodes.set(".search-dialog", dialog);
  document.nodes.set(".search-trigger", trigger);
  document.nodes.set(".search-container", container);
  document.nodes.set(".search-history", historyWrap);

  const storage = localStorageHarness({ "eaireading.searches": JSON.stringify(history) });
  const immediate = callback => { callback(); return 1; };
  vm.runInNewContext(SEARCH_SOURCE, {
    document,
    localStorage: storage,
    location: { search },
    URLSearchParams,
    PagefindUI: class {},
    setTimeout: immediate,
    clearTimeout() {},
    Event: class { constructor(type) { this.type = type; } },
    console,
  });

  return { dialog, trigger, input, historyWrap, storage, unsafeWrites };
}

test("search history renders payload-like values as inert button text", () => {
  const payload = `\"><img src=x onerror=\"globalThis.pwned=1\">`;
  const harness = runSearch({ history: [{ q: payload, t: 1 }] });
  harness.trigger.dispatchEvent({ type: "click" });

  assert.equal(harness.unsafeWrites.length, 0, "user-controlled history must not reach innerHTML");
  const [button] = harness.historyWrap.querySelectorAll("button[data-q]");
  assert.ok(button);
  assert.equal(button.textContent, payload);
  assert.equal(button.dataset.q, payload);
  assert.equal(button.children.length, 0);
});

test("q persistence clamps long queries and rejects control characters", () => {
  const long = "具".repeat(240);
  const longHarness = runSearch({ search: `?q=${encodeURIComponent(long)}` });
  const [storedLong] = JSON.parse(longHarness.storage.value("eaireading.searches"));
  assert.equal([...storedLong.q].length, 200);

  const controlHarness = runSearch({ search: `?q=${encodeURIComponent("safe\u0000bad")}` });
  assert.deepEqual(JSON.parse(controlHarness.storage.value("eaireading.searches")), []);
});

test("normal q still opens search, populates input, and persists", () => {
  const q = "具身智能";
  const harness = runSearch({ search: `?q=${encodeURIComponent(q)}` });

  assert.equal(harness.dialog.open, true);
  assert.equal(harness.input.value, q);
  assert.equal(JSON.parse(harness.storage.value("eaireading.searches"))[0].q, q);
});

test("link preview renders repository metadata without an HTML sink", async () => {
  const unsafeWrites = [];
  const document = new FakeDocument(unsafeWrites);
  const paper = {
    slug: "payload",
    topic: `<img src=x onerror="globalThis.pwned=1">`,
    year: 2026,
    venue: `\"><svg onload="globalThis.pwned=2">`,
    title: `<script>globalThis.pwned=3</script>`,
    tldr: `<b onmouseover="globalThis.pwned=4">summary</b>`,
  };
  const window = { innerWidth: 1280, innerHeight: 800 };
  vm.runInNewContext(PREVIEW_SOURCE, {
    document,
    window,
    fetch: async () => ({ json: async () => [paper] }),
    setTimeout: callback => { callback(); return 1; },
    clearTimeout() {},
    requestAnimationFrame: callback => callback(),
    console,
  });

  const anchor = {
    closest(selector) { return selector === "a[href]" ? this : null; },
    getAttribute(name) { return name === "href" ? "/papers/payload/" : null; },
  };
  document.dispatchEvent({ type: "mouseover", target: anchor, clientX: 20, clientY: 20 });
  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(unsafeWrites.length, 0, "paper metadata must not reach innerHTML");
  const tooltip = document.body.children.find(node => node.className.includes("link-preview"));
  assert.ok(tooltip);
  const byClass = name => tooltip.children.find(node => node.className === name);
  assert.equal(byClass("lp-title").textContent, paper.title);
  assert.equal(byClass("lp-tldr").textContent, `${paper.tldr}…`);
  assert.match(byClass("lp-meta").textContent, /<img src=x/);
});
