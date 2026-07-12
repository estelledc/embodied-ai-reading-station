import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DECK_HTML = fs.readFileSync(path.join(SITE, "..", "deck", "index.html"), "utf8");

class FakeClassList {
  values = new Set();

  add(name) {
    this.values.add(name);
  }

  remove(name) {
    this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }

  toggle(name, force) {
    const enabled = force === undefined ? !this.contains(name) : force;
    if (enabled) this.add(name);
    else this.remove(name);
    return enabled;
  }
}

class FakeElement {
  attributes = new Map();
  children = [];
  classList = new FakeClassList();
  listeners = new Map();
  style = {};
  offsetWidthReads = 0;

  constructor(tagName = "div") {
    this.tagName = tagName.toLowerCase();
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) ?? [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  appendChild(child) {
    this.children.push(child);
  }

  closest(selector) {
    return selector
      .split(",")
      .some((candidate) => candidate.trim() === this.tagName)
      ? this
      : null;
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) ?? []) handler(event);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  get offsetWidth() {
    this.offsetWidthReads += 1;
    return 1280;
  }
}

function createDeckHarness() {
  const deck = new FakeElement();
  const track = new FakeElement();
  const dots = new FakeElement();
  const slides = [new FakeElement(), new FakeElement(), new FakeElement()];
  track.querySelectorAll = () => slides;

  const documentListeners = new Map();
  const document = {
    addEventListener(type, handler) {
      const handlers = documentListeners.get(type) ?? [];
      handlers.push(handler);
      documentListeners.set(type, handlers);
    },
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    dispatch(type, event) {
      for (const handler of documentListeners.get(type) ?? []) handler(event);
    },
    getElementById(id) {
      return { deck, track, dots }[id] ?? null;
    },
  };

  const frames = [];
  const requestAnimationFrame = (callback) => {
    frames.push(callback);
    return frames.length;
  };
  const flushFrame = () => {
    const callbacks = frames.splice(0);
    for (const callback of callbacks) callback();
  };

  const window = {
    addEventListener() {},
    innerHeight: 720,
    innerWidth: 1280,
  };
  const scripts = [...DECK_HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  vm.runInNewContext(scripts.at(-1)[1], {
    document,
    requestAnimationFrame,
    setTimeout() {},
    window,
  });

  flushFrame();
  flushFrame();
  assert.equal(track.classList.contains("is-instant"), false, "initial state settles");

  return { document, dots, flushFrame, track };
}

test("deck keeps keyboard dot activation instant for two frames and pointer clicks animated", () => {
  assert.match(DECK_HTML, /\.deck-track \{[^}]*transition: transform 0\.25s/s);
  const { dots, flushFrame, track } = createDeckHarness();

  dots.children[1].dispatch("click", { detail: 0 });
  assert.equal(track.style.transform, "translateX(-100%)");
  assert.equal(track.classList.contains("is-instant"), true);
  assert.ok(track.offsetWidthReads > 0, "instant class is flushed before the transform update");

  flushFrame();
  assert.equal(track.classList.contains("is-instant"), true, "one frame cannot re-enable motion");
  flushFrame();
  assert.equal(track.classList.contains("is-instant"), false, "motion returns after two frames");

  dots.children[2].dispatch("click", { detail: 1 });
  assert.equal(track.style.transform, "translateX(-200%)");
  assert.equal(track.classList.contains("is-instant"), false, "pointer click uses the 250ms track");
});

test("deck arrow-key navigation uses the same instant path", () => {
  const { document, flushFrame, track } = createDeckHarness();
  let prevented = false;

  document.dispatch("keydown", {
    key: "ArrowRight",
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(track.style.transform, "translateX(-100%)");
  assert.equal(track.classList.contains("is-instant"), true);
  flushFrame();
  assert.equal(track.classList.contains("is-instant"), true);
  flushFrame();
  assert.equal(track.classList.contains("is-instant"), false);
});

test("focused nav dot owns Space and its native click selects that dot instantly", () => {
  const { document, dots, flushFrame, track } = createDeckHarness();
  const targetDot = dots.children[2];
  let prevented = false;

  document.dispatch("keydown", {
    key: " ",
    target: targetDot,
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, false, "document handler must preserve native button activation");
  assert.equal(track.style.transform, "translateX(-0%)", "global next-page action must not run");
  assert.equal(track.classList.contains("is-instant"), false);

  targetDot.dispatch("click", { detail: 0 });
  assert.equal(track.style.transform, "translateX(-200%)", "native keyboard click selects its dot");
  assert.equal(track.classList.contains("is-instant"), true);
  flushFrame();
  flushFrame();
});

test("Space on a non-interactive target keeps the global instant next-page action", () => {
  const { document, flushFrame, track } = createDeckHarness();
  let prevented = false;

  document.dispatch("keydown", {
    key: " ",
    target: new FakeElement("div"),
    preventDefault() {
      prevented = true;
    },
  });

  assert.equal(prevented, true);
  assert.equal(track.style.transform, "translateX(-100%)");
  assert.equal(track.classList.contains("is-instant"), true);
  flushFrame();
  flushFrame();
});
