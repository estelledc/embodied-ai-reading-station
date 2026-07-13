import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { masthead, page } from "./layout.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.resolve(HERE, "..", "..", "src", "more-nav.js"), "utf8");

class EventTargetMock {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) listener(event);
  }
}

class ClassListMock {
  constructor(initial = []) { this.values = new Set(initial); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
  contains(name) { return this.values.has(name); }
}

class ElementMock extends EventTargetMock {
  constructor({ parent = null, attributes = {}, hidden = false, ownerDocument = null } = {}) {
    super();
    this.parent = parent;
    this.attributes = new Map(Object.entries(attributes));
    this.hidden = hidden;
    this.ownerDocument = ownerDocument;
    this.classList = new ClassListMock();
    this.focusCalls = 0;
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  contains(node) {
    for (let current = node; current; current = current.parent) {
      if (current === this) return true;
    }
    return false;
  }
  focus() {
    this.focusCalls += 1;
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
}

function boot({ missingTrigger = false, missingPanel = false } = {}) {
  const document = new EventTargetMock();
  document.activeElement = null;
  const window = new EventTargetMock();
  const root = new ElementMock();
  root.classList.toggle("is-open", true);
  const trigger = new ElementMock({
    parent: root,
    attributes: { "aria-controls": "more-nav-panel", "aria-expanded": "true" },
    ownerDocument: document,
  });
  const panel = new ElementMock({ parent: root, hidden: false });
  const internal = new ElementMock({ parent: panel });
  const external = new ElementMock();
  root.querySelector = () => missingTrigger ? null : trigger;
  document.querySelectorAll = () => [root];
  document.getElementById = () => missingPanel ? null : panel;

  vm.runInNewContext(SOURCE, { document, window }, { filename: "more-nav.js" });
  return { document, external, internal, panel, root, trigger, window };
}

function click(trigger) { trigger.dispatch("click", { target: trigger }); }

test("masthead emits a native disclosure contract and one external controller", () => {
  const header = masthead("graph");
  assert.match(header, /class="more-nav" data-more-nav/);
  const trigger = header.match(/<button type="button" class="more-nav-trigger is-current"[^>]*>/)?.[0] || "";
  assert.match(trigger, /aria-controls="more-nav-panel"/);
  assert.match(trigger, /aria-expanded="false"/);
  assert.match(trigger, /aria-label="More，更多导航"/);
  assert.doesNotMatch(trigger, /\sstyle=/);
  assert.match(header, /<div class="more-nav-panel" id="more-nav-panel" hidden>/);
  assert.doesNotMatch(header, /more-nav-trigger[^>]*aria-haspopup/);
  assert.match(header, /href="\/graph\/"[^>]*aria-current="page"/);

  const html = page({ title: "fixture", body: "<main>fixture</main>", active: "graph" });
  assert.equal((html.match(/\/more-nav\.js/g) || []).length, 1);
});

test("initialization closes stale state and click keeps hidden, class, and ARIA synchronized", () => {
  const { panel, root, trigger } = boot();
  assert.equal(panel.hidden, true);
  assert.equal(root.classList.contains("is-open"), false);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");

  click(trigger);
  assert.equal(panel.hidden, false);
  assert.equal(root.classList.contains("is-open"), true);
  assert.equal(trigger.getAttribute("aria-expanded"), "true");

  click(trigger);
  assert.equal(panel.hidden, true);
  assert.equal(root.classList.contains("is-open"), false);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
});

test("Escape closes from trigger or panel and restores trigger focus", () => {
  const { panel, root, trigger } = boot();
  click(trigger);
  const event = {
    key: "Escape",
    prevented: 0,
    stopped: 0,
    preventDefault() { this.prevented += 1; },
    stopPropagation() { this.stopped += 1; },
  };
  root.dispatch("keydown", event);
  assert.equal(panel.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(trigger.focusCalls, 1);
  assert.equal(event.prevented, 1);
  assert.equal(event.stopped, 1);
});

test("focus and pointer transitions close only after leaving the disclosure", () => {
  const { document, external, internal, panel, trigger } = boot();
  click(trigger);
  document.activeElement = internal;
  document.dispatch("focusin", { target: internal });
  assert.equal(panel.hidden, false);
  document.dispatch("click", { target: internal });
  assert.equal(panel.hidden, false);

  document.activeElement = external;
  document.dispatch("focusin", { target: external });
  assert.equal(panel.hidden, true);
  assert.equal(trigger.focusCalls, 0);

  click(trigger);
  document.activeElement = internal;
  document.dispatch("click", { target: external });
  assert.equal(panel.hidden, true);
  assert.equal(trigger.focusCalls, 1);
});

test("pageshow repairs stale state without closing on ordinary resize", () => {
  const { document, internal, panel, trigger, window } = boot();
  assert.equal(window.listeners.has("resize"), false);
  click(trigger);
  document.activeElement = internal;
  window.dispatch("pageshow");
  assert.equal(panel.hidden, true);
  assert.equal(trigger.getAttribute("aria-expanded"), "false");
  assert.equal(trigger.focusCalls, 1);
});

test("missing trigger or controlled panel exits without global listeners", () => {
  for (const options of [{ missingTrigger: true }, { missingPanel: true }]) {
    const { document, window } = boot(options);
    assert.equal(document.listeners.size, 0);
    assert.equal(window.listeners.size, 0);
  }
});
