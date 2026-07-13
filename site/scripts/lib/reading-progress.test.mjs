import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const READING_PROGRESS = path.resolve(HERE, "..", "..", "src", "reading-progress.js");
const DATA_API = path.resolve(HERE, "..", "..", "src", "data-api.js");
const SOURCE = fs.readFileSync(READING_PROGRESS, "utf8");
const DATA_API_SOURCE = fs.readFileSync(DATA_API, "utf8");
const VALID_COMMIT = "a".repeat(40);

class FakeStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
    this.failSetKeys = new Set();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.failSetKeys.delete(key)) throw new Error(`QuotaExceededError: ${key}`);
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  snapshot() {
    return Object.fromEntries(this.values);
  }

  failNextSet(key) {
    this.failSetKeys.add(key);
  }
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function boot(initial = {}, {
  papers = [],
  base = "",
  envelopeOverrides = {},
  responseOk = true,
  responseStatus = 200,
  includeDataApi = true,
} = {}) {
  const localStorage = new FakeStorage(initial);
  const windowListeners = new Map();
  const documentListeners = new Map();
  const dispatched = [];
  let exportedBlob = null;
  const createdLinks = [];
  const appendedNodes = [];
  const revokedUrls = [];
  const fetchRequests = [];
  const consoleErrors = [];
  let confirmResponse = true;
  const confirmPrompts = [];

  function control(extra = {}) {
    return {
      ...extra,
      listeners: new Map(),
      addEventListener(type, fn) { this.listeners.set(type, fn); },
      click() { this.clicked = (this.clicked || 0) + 1; },
    };
  }
  const exportButton = control();
  const controls = {
    "eai-state-export": control(),
    "eai-state-import": control(),
    "eai-state-import-file": control({ files: [], value: "" }),
    "eai-state-restore-import": control({ hidden: true }),
    "eai-state-reset-path": control(),
    "eai-state-reset-guide": control(),
    "eai-state-reset-all": control(),
  };
  const document = {
    body: {
      appendChild(node) {
        appendedNodes.push(node);
        node.appended = true;
        return node;
      },
    },
    addEventListener(type, fn) { documentListeners.set(type, fn); },
    querySelector(selector) {
      if (selector === 'link[href*="/styles.css"]' && base) {
        return { getAttribute: name => name === "href" ? `${base}/styles.css` : null };
      }
      return null;
    },
    querySelectorAll() { return []; },
    getElementById(id) {
      if (id === "eai-streak-export") return exportButton;
      return controls[id] || null;
    },
    createElement(tag) {
      const element = {
        tagName: tag.toUpperCase(),
        className: "",
        hidden: false,
        classList: { add() {}, remove() {} },
        setAttribute(name, value) { this[name] = String(value); },
        click() { this.clicked = (this.clicked || 0) + 1; },
        remove() { this.removed = true; },
      };
      if (tag === "a") createdLinks.push(element);
      return element;
    },
  };
  const window = {
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    },
    dispatchEvent(event) { dispatched.push(event); },
    confirm(message) {
      confirmPrompts.push(message);
      return confirmResponse;
    },
  };
  const context = vm.createContext({
    window,
    document,
    localStorage,
    console: {
      error(...args) { consoleErrors.push(args); },
    },
    Date,
    JSON,
    Set,
    Map,
    Math,
    Number,
    String,
    Blob,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
    },
    URL: {
      createObjectURL(blob) { exportedBlob = blob; return "blob:test"; },
      revokeObjectURL(value) { revokedUrls.push(value); },
    },
    fetch: async (url) => {
      fetchRequests.push(url);
      return {
        ok: responseOk,
        status: responseStatus,
        json: async () => ({
          schema_version: "2.0.0",
          content_commit: VALID_COMMIT,
          generated_at: "2026-07-11T00:00:00.000Z",
          data: papers,
          ...envelopeOverrides,
        }),
      };
    },
    setTimeout(fn) { fn(); return 0; },
    clearTimeout() {},
  });
  if (includeDataApi) vm.runInContext(DATA_API_SOURCE, context, { filename: DATA_API });
  vm.runInContext(SOURCE, context, { filename: READING_PROGRESS });

  return {
    window,
    localStorage,
    dispatched,
    exportButton,
    controls,
    confirmPrompts,
    setConfirmResponse(value) { confirmResponse = value; },
    runDomReady() { documentListeners.get("DOMContentLoaded")?.(); },
    exportedBlob() { return exportedBlob; },
    createdLinks,
    appendedNodes,
    revokedUrls,
    fetchRequests,
    consoleErrors,
    fireWindowEvent(type, event) {
      for (const fn of windowListeners.get(type) || []) fn(event);
    },
  };
}

test("legacy mixed syllabus state is split into path days and stable guide ids", () => {
  const app = boot({
    "eaireading.syllabus": JSON.stringify([
      1, 2, 2, "30", 31, 99,
      "ch01-why-embodied-ai", "ch22-task-guide", "ch22-old-title", "bad",
    ]),
    "eaireading.syllabusTs": JSON.stringify({
      "ch01-why-embodied-ai": 100,
      "ch22-task-guide": 200,
      "ch22-old-title": 300,
      bad: 999,
    }),
  });

  assert.deepEqual(plain(app.window.EAI_PATH.list()), [1, 2, 30]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [1, 22]);
  assert.equal(app.window.EAI_GUIDE.has("ch01-renamed-later"), true);
  assert.deepEqual(
    JSON.parse(app.localStorage.getItem("eaireading.guide.chapterTs.v1")),
    { 1: 100, 22: 300 },
  );
  assert.equal(app.localStorage.getItem("eaireading.progress.split.v1"), "1");
});

test("migration is idempotent and never overwrites existing namespaced state", () => {
  const app = boot({
    "eaireading.syllabus": JSON.stringify([1, "ch01-old-title"]),
    "eaireading.path.days.v1": JSON.stringify([3]),
    "eaireading.guide.chapters.v1": JSON.stringify([2]),
  });

  assert.deepEqual(plain(app.window.EAI_PATH.list()), [3]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [2]);

  const rebooted = boot(app.localStorage.snapshot());
  assert.deepEqual(plain(rebooted.window.EAI_PATH.list()), [3]);
  assert.deepEqual(plain(rebooted.window.EAI_GUIDE.list()), [2]);
});

test("malformed and out-of-range progress values are ignored without throwing", () => {
  const app = boot({
    "eaireading.syllabus": "{not-json",
    "eaireading.path.days.v1": JSON.stringify([0, true, null, {}, [], 30, 31, "2", "bad"]),
    "eaireading.guide.chapters.v1": JSON.stringify([0, 1, 22, 23, "ch02-old", "bad"]),
  });

  assert.deepEqual(plain(app.window.EAI_PATH.list()), [2, 30]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [1, 2, 22]);
});

test("path and guide toggles update independent namespaces and events", () => {
  const app = boot();

  app.window.EAI_PATH.mark(4);
  app.window.EAI_GUIDE.mark("ch04-landscape");
  assert.deepEqual(plain(app.window.EAI_PATH.list()), [4]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [4]);

  app.window.EAI_PATH.unmark(4);
  assert.equal(app.window.EAI_PATH.count(), 0);
  assert.equal(app.window.EAI_GUIDE.count(), 1);
  assert.deepEqual(app.dispatched.map(event => event.type), [
    "eai:path-changed",
    "eai:guide-changed",
    "eai:path-changed",
  ]);
});

test("exported reading list uses the absolute API URL exactly once", async () => {
  const paperUrl = "https://example.test/custom-base/papers/clip/";
  const app = boot({
    "eaireading.read": JSON.stringify(["clip"]),
    "eaireading.readts": JSON.stringify({ clip: 123 }),
  }, {
    papers: [{
      slug: "clip",
      num: 1,
      title: "CLIP: Learning Transferable Visual Models",
      topic: "vlm-foundation",
      tldr: "图文对齐。",
      url: paperUrl,
    }],
  });

  app.runDomReady();
  await app.exportButton.listeners.get("click")();
  const markdown = await app.exportedBlob().text();

  assert.match(markdown, new RegExp(`\\(${paperUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`));
  assert.doesNotMatch(markdown, /reading-stationhttps?:\/\//);
  assert.equal(markdown.split(paperUrl).length - 1, 1);
});

test("paper consumers use the versioned endpoint through the existing base-path rule", async () => {
  const app = boot({}, {
    base: "/embodied-ai-reading-station",
    papers: [{ slug: "clip" }],
  });

  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(app.fetchRequests, [
    "/embodied-ai-reading-station/data/v2/papers.json",
  ]);
  assert.deepEqual(app.dispatched.filter(event => event.type === "eai:data-error"), []);
});

test("invalid v2 paper data emits a diagnostic event and visible fallback", async () => {
  const app = boot({}, {
    envelopeOverrides: { content_commit: "NOT-A-COMMIT" },
  });

  await new Promise(resolve => setImmediate(resolve));
  await new Promise(resolve => setImmediate(resolve));

  const [event] = app.dispatched.filter(item => item.type === "eai:data-error");
  assert.ok(event);
  assert.equal(event.detail.consumer, "reading-progress");
  assert.equal(event.detail.code, "DATA_API_CONTENT_COMMIT");
  assert.equal(app.consoleErrors.length, 1);
  const alert = app.appendedNodes.find(node => node.role === "alert");
  assert.ok(alert);
  assert.match(alert.textContent, /DATA_API_CONTENT_COMMIT/);
});

test("missing browser adapter follows the same observable fallback path", async () => {
  const app = boot({}, { includeDataApi: false });

  await new Promise(resolve => setImmediate(resolve));

  const [event] = app.dispatched.filter(item => item.type === "eai:data-error");
  assert.ok(event);
  assert.equal(event.detail.consumer, "reading-progress");
  assert.equal(event.detail.code, "DATA_API_ADAPTER_MISSING");
  assert.equal(app.consoleErrors.length, 1);
  const alert = app.appendedNodes.find(node => node.role === "alert");
  assert.match(alert.textContent, /DATA_API_ADAPTER_MISSING/);
});

test("state backup downloads a versioned JSON blob through a temporary anchor", async () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  app.runDomReady();
  app.controls["eai-state-export"].listeners.get("click")();

  const link = app.createdLinks.at(-1);
  assert.ok(link);
  assert.match(link.download, /^eai-progress-v1-\d{4}-\d{2}-\d{2}\.json$/);
  assert.equal(link.clicked, 1);
  assert.equal(link.appended, true);
  assert.equal(link.removed, true);
  assert.deepEqual(app.revokedUrls, ["blob:test"]);

  const payload = JSON.parse(await app.exportedBlob().text());
  assert.equal(payload.schema_version, 1);
  assert.deepEqual(payload.state.read, ["clip"]);
});

test("corrupt storage is backed up and replaced with a safe value", () => {
  const app = boot({ "eaireading.read": "{broken-json" });
  assert.deepEqual(plain(app.window.EAI_READ.list()), []);
  assert.equal(app.localStorage.getItem("eaireading.read"), "[]");
  const backupKey = Object.keys(app.localStorage.snapshot())
    .find(key => key.startsWith("eaireading.recovery."));
  assert.ok(backupKey);
  assert.equal(app.localStorage.getItem(backupKey), "{broken-json");
});

test("v1 state export/import preserves independent progress namespaces", () => {
  const source = boot({
    "eaireading.read": JSON.stringify(["clip"]),
    "eaireading.readts": JSON.stringify({ clip: 123 }),
    "eaireading.searches": JSON.stringify([{ q: "diffusion policy", t: 456 }]),
  });
  source.window.EAI_PATH.mark(3);
  source.window.EAI_GUIDE.mark("ch04-landscape");
  const payload = source.window.EAI_STATE.exportObject();

  assert.equal(payload.schema_version, 1);
  assert.deepEqual(plain(payload.state.path_days), [3]);
  assert.deepEqual(plain(payload.state.guide_chapters), [4]);

  const target = boot();
  target.window.EAI_STATE.importObject(payload);
  assert.deepEqual(plain(target.window.EAI_READ.list()), ["clip"]);
  assert.deepEqual(plain(target.window.EAI_PATH.list()), [3]);
  assert.deepEqual(plain(target.window.EAI_GUIDE.list()), [4]);
  assert.equal(JSON.parse(target.localStorage.getItem("eaireading.searches"))[0].q, "diffusion policy");
});

test("empty and unknown import payloads are rejected without changing storage", () => {
  for (const payload of [
    {},
    { unknown: true },
    { schema_version: 1, state: {} },
    { schema_version: 1, state: { unknown: [1] } },
  ]) {
    const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
    app.window.EAI_PATH.mark(2);
    const before = app.localStorage.snapshot();

    assert.throws(() => app.window.EAI_STATE.importObject(payload));
    assert.deepEqual(app.localStorage.snapshot(), before);
  }
});

test("a partially valid payload is fully validated before any write", () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  app.window.EAI_PATH.mark(2);
  const before = app.localStorage.snapshot();

  assert.throws(() => app.window.EAI_STATE.importObject({
    schema_version: 1,
    state: { read: ["rt-1"], path_days: { invalid: true } },
  }));
  assert.deepEqual(app.localStorage.snapshot(), before);
});

test("a valid partial state updates only named surfaces and keeps a recoverable backup", () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  app.window.EAI_PATH.mark(2);
  app.window.EAI_GUIDE.mark("ch03-vlm");

  app.window.EAI_STATE.importObject({
    schema_version: 1,
    state: { path_days: [4, "5", 99] },
  });

  assert.deepEqual(plain(app.window.EAI_PATH.list()), [4, 5]);
  assert.deepEqual(plain(app.window.EAI_READ.list()), ["clip"]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [3]);
  assert.equal(app.window.EAI_STATE.hasImportBackup(), true);
  assert.deepEqual(plain(app.window.EAI_STATE.lastImportBackup().state.path_days), [2]);

  app.window.EAI_STATE.restoreLastImport();
  assert.deepEqual(plain(app.window.EAI_PATH.list()), [2]);
  assert.deepEqual(plain(app.window.EAI_READ.list()), ["clip"]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [3]);
  assert.equal(app.window.EAI_STATE.hasImportBackup(), false);
});

test("legacy partial snapshots require a known key and preserve omitted surfaces", () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  app.window.EAI_PATH.mark(2);
  app.window.EAI_GUIDE.mark("ch03-vlm");

  app.window.EAI_STATE.importObject({ "eaireading.read": ["rt-1", 42] });

  assert.deepEqual(plain(app.window.EAI_READ.list()), ["rt-1"]);
  assert.deepEqual(plain(app.window.EAI_PATH.list()), [2]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [3]);
});

test("a mid-import storage failure rolls back every write and its recovery backup", () => {
  const app = boot({
    "eaireading.read": JSON.stringify(["clip"]),
    "eaireading.readts": JSON.stringify({ clip: 100 }),
  });
  app.window.EAI_PATH.mark(2);
  app.window.EAI_GUIDE.mark("ch03-vlm");
  const before = app.localStorage.snapshot();
  app.localStorage.failNextSet("eaireading.path.days.v1");

  assert.throws(() => app.window.EAI_STATE.importObject({
    schema_version: 1,
    state: {
      read: ["rt-1"],
      read_timestamps: { "rt-1": 200 },
      path_days: [4],
      guide_chapters: [5],
    },
  }), /原状态已恢复/);

  assert.deepEqual(app.localStorage.snapshot(), before);
  assert.equal(app.window.EAI_STATE.hasImportBackup(), false);
});

test("import never starts when its automatic recovery backup cannot be saved", () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  app.window.EAI_PATH.mark(2);
  const before = app.localStorage.snapshot();
  app.localStorage.failNextSet("eaireading.recovery.pre-import.v1");

  assert.throws(() => app.window.EAI_STATE.importObject({
    schema_version: 1,
    state: { read: ["rt-1"], path_days: [4] },
  }), /原状态已恢复/);
  assert.deepEqual(app.localStorage.snapshot(), before);
});

test("file import asks for explicit overwrite confirmation before reading the file", async () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  const input = app.controls["eai-state-import-file"];
  let textReads = 0;
  input.files = [{
    async text() {
      textReads += 1;
      return JSON.stringify({ schema_version: 1, state: { read: ["rt-1"] } });
    },
  }];
  app.runDomReady();

  app.setConfirmResponse(false);
  await input.listeners.get("change")();
  assert.equal(textReads, 0);
  assert.deepEqual(plain(app.window.EAI_READ.list()), ["clip"]);
  assert.match(app.confirmPrompts.at(-1), /覆盖当前状态/);

  input.files = [{
    async text() {
      textReads += 1;
      return JSON.stringify({ schema_version: 1, state: { read: ["rt-1"] } });
    },
  }];
  app.setConfirmResponse(true);
  await input.listeners.get("change")();
  assert.equal(textReads, 1);
  assert.deepEqual(plain(app.window.EAI_READ.list()), ["rt-1"]);
  assert.equal(app.controls["eai-state-restore-import"].hidden, false);

  app.controls["eai-state-reset-all"].listeners.get("click")();
  assert.equal(app.controls["eai-state-restore-import"].hidden, true);
});

test("legacy v1.1 storage snapshot imports through deterministic migration", () => {
  const app = boot();
  app.window.EAI_STATE.importObject({
    "eaireading.read": ["clip", 42, "clip"],
    "eaireading.readts": { clip: 100 },
    "eaireading.syllabus": [2, "ch03-vlm", 99, "bad"],
    "eaireading.syllabusTs": { "ch03-vlm": 200 },
  });

  assert.deepEqual(plain(app.window.EAI_READ.list()), ["clip"]);
  assert.deepEqual(plain(app.window.EAI_PATH.list()), [2]);
  assert.deepEqual(plain(app.window.EAI_GUIDE.list()), [3]);
  assert.deepEqual(JSON.parse(app.localStorage.getItem("eaireading.guide.chapterTs.v1")), { 3: 200 });
});

test("surface reset is isolated while full reset clears documented state", () => {
  const app = boot({ "eaireading.read": JSON.stringify(["clip"]) });
  app.window.EAI_PATH.mark(1);
  app.window.EAI_GUIDE.mark("ch02-foundation");

  app.window.EAI_STATE.reset("path");
  assert.equal(app.window.EAI_PATH.count(), 0);
  assert.equal(app.window.EAI_GUIDE.count(), 1);
  assert.equal(app.window.EAI_READ.count(), 1);

  app.window.EAI_STATE.reset("all");
  assert.equal(app.window.EAI_PATH.count(), 0);
  assert.equal(app.window.EAI_GUIDE.count(), 0);
  assert.equal(app.window.EAI_READ.count(), 0);
});
