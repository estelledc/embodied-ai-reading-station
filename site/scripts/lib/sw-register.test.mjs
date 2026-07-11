import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.resolve(HERE, "..", "..", "src", "sw-register.js");
const SOURCE = fs.readFileSync(SOURCE_PATH, "utf8");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

class FakeTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  dispatch(type) {
    for (const listener of this.listeners.get(type) || []) listener({ type, target: this });
  }
}

class FakeElement extends FakeTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.attributes = new Map();
    this.disabled = false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  append(...children) {
    this.children.push(...children);
  }

  click() {
    this.dispatch("click");
  }
}

class FakeWorker extends FakeTarget {
  constructor(state = "installing") {
    super();
    this.state = state;
    this.messages = [];
  }

  postMessage(message) {
    this.messages.push(message);
  }

  transition(state) {
    this.state = state;
    this.dispatch("statechange");
  }
}

class FakeRegistration extends FakeTarget {
  constructor({ waiting = null, installing = null } = {}) {
    super();
    this.waiting = waiting;
    this.installing = installing;
  }
}

function makeLocation(url) {
  const parsed = new URL(url);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    origin: parsed.origin,
    href: parsed.href,
    reloadCount: 0,
    reload() { this.reloadCount += 1; },
  };
}

function boot({
  pageUrl = "https://example.test/index.html",
  scriptSrc = "https://example.test/sw-register.js",
  stylesHref = "https://example.test/styles.css",
  controller = null,
  registration = new FakeRegistration(),
  registerError = null,
  includeCurrentScript = true,
  includeServiceWorker = true,
} = {}) {
  const window = new FakeTarget();
  const serviceWorker = new FakeTarget();
  serviceWorker.controller = controller;
  serviceWorker.registerCalls = [];
  serviceWorker.register = (url, options) => {
    serviceWorker.registerCalls.push({ url, options });
    return registerError ? Promise.reject(registerError) : Promise.resolve(registration);
  };

  const appended = [];
  const currentScript = includeCurrentScript ? {
    src: scriptSrc,
    getAttribute(name) { return name === "src" ? scriptSrc : null; },
  } : null;
  const styles = stylesHref ? {
    href: stylesHref,
    getAttribute(name) { return name === "href" ? stylesHref : null; },
  } : null;
  const document = {
    currentScript,
    body: {
      appendChild(element) { appended.push(element); return element; },
    },
    querySelector(selector) {
      return selector === 'link[href*="styles.css"]' ? styles : null;
    },
    createElement(tagName) { return new FakeElement(tagName); },
  };
  const location = makeLocation(pageUrl);
  const warnings = [];
  const navigator = includeServiceWorker ? { serviceWorker } : {};

  vm.runInNewContext(SOURCE, {
    window,
    document,
    navigator,
    location,
    URL,
    Set,
    console: { warn(...args) { warnings.push(args); } },
  }, { filename: SOURCE_PATH });

  return {
    window,
    document,
    serviceWorker,
    registration,
    location,
    warnings,
    appended,
    async load() {
      window.dispatch("load");
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

function updateToast(app) {
  return app.appended.find(element => element.className === "auto-mark-toast show");
}

function toastButton(toast) {
  return toast.children.find(element => element.tagName === "BUTTON");
}

test("registers root and repository scopes from currentScript before load", async () => {
  for (const [scriptSrc, expectedUrl, expectedScope] of [
    ["https://example.test/sw-register.js", "/sw.js", "/"],
    ["https://example.test/embodied-ai-reading-station/sw-register.js", "/embodied-ai-reading-station/sw.js", "/embodied-ai-reading-station/"],
  ]) {
    const app = boot({ scriptSrc, stylesHref: "https://example.test/wrong/styles.css" });
    // currentScript may disappear before load in a real browser; the frozen value still wins.
    app.document.currentScript = null;
    await app.load();
    assert.deepEqual(plain(app.serviceWorker.registerCalls), [
      { url: expectedUrl, options: { scope: expectedScope } },
    ]);
  }
});

test("falls back to the stylesheet path when currentScript is unavailable", async () => {
  const app = boot({
    includeCurrentScript: false,
    stylesHref: "https://example.test/embodied-ai-reading-station/styles.css",
  });
  await app.load();
  assert.deepEqual(plain(app.serviceWorker.registerCalls), [{
    url: "/embodied-ai-reading-station/sw.js",
    options: { scope: "/embodied-ai-reading-station/" },
  }]);
});

test("allows https and loopback origins but rejects an insecure remote origin", async () => {
  for (const pageUrl of [
    "https://example.test/",
    "http://localhost:8080/",
    "http://127.0.0.1:8080/",
    "http://[::1]:8080/",
  ]) {
    const origin = new URL(pageUrl).origin;
    const app = boot({ pageUrl, scriptSrc: `${origin}/sw-register.js`, stylesHref: `${origin}/styles.css` });
    await app.load();
    assert.equal(app.serviceWorker.registerCalls.length, 1, pageUrl);
  }

  const rejected = boot({
    pageUrl: "http://example.test/",
    scriptSrc: "http://example.test/sw-register.js",
    stylesHref: "http://example.test/styles.css",
  });
  await rejected.load();
  assert.equal(rejected.serviceWorker.registerCalls.length, 0);
});

test("first install never shows an update prompt", async () => {
  const waiting = new FakeWorker("installed");
  const installing = new FakeWorker();
  const registration = new FakeRegistration({ waiting, installing });
  const app = boot({ registration, controller: null });
  await app.load();
  installing.transition("installed");
  registration.dispatch("updatefound");
  assert.equal(app.appended.length, 0);
});

test("an existing waiting worker prompts once and updates only after a click", async () => {
  const waiting = new FakeWorker("installed");
  const registration = new FakeRegistration({ waiting });
  const app = boot({ registration, controller: {} });
  await app.load();

  const toast = updateToast(app);
  assert.ok(toast);
  assert.equal(toast.getAttribute("role"), "status");
  assert.equal(toast.getAttribute("aria-live"), "polite");
  assert.match(toast.children[0].textContent, /发现新版本/);
  const button = toastButton(toast);
  assert.equal(button.textContent, "立即更新");
  assert.deepEqual(waiting.messages, []);

  app.serviceWorker.dispatch("controllerchange");
  assert.equal(app.location.reloadCount, 0, "activation outside an accepted update must not reload");

  button.click();
  button.click();
  assert.deepEqual(plain(waiting.messages), [{ type: "SKIP_WAITING" }]);
  assert.equal(button.disabled, true);

  app.serviceWorker.dispatch("controllerchange");
  app.serviceWorker.dispatch("controllerchange");
  assert.equal(app.location.reloadCount, 1);
});

test("updatefound and repeated state events are deduplicated", async () => {
  const installing = new FakeWorker();
  const registration = new FakeRegistration({ installing });
  const app = boot({ registration, controller: {} });
  await app.load();

  registration.dispatch("updatefound");
  registration.dispatch("updatefound");
  registration.waiting = installing;
  installing.transition("installed");
  installing.dispatch("statechange");

  assert.equal(app.appended.length, 1);
  const button = toastButton(updateToast(app));
  button.click();
  button.click();
  assert.deepEqual(plain(installing.messages), [{ type: "SKIP_WAITING" }]);
});

test("registration failures stay diagnostic and do not escape the load handler", async () => {
  const failure = new Error("registration rejected");
  const app = boot({ registerError: failure });
  await app.load();
  assert.equal(app.warnings.length, 1);
  assert.equal(app.warnings[0][0], "SW register failed:");
  assert.equal(app.warnings[0][1], failure);
});
