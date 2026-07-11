import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { build404 } from "./views/meta.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.resolve(HERE, "..", "..", "src", "data-api.js");
const SOURCE = fs.readFileSync(SOURCE_PATH, "utf8");
const VALID_COMMIT = "a".repeat(40);

function boot(fetchImpl) {
  const events = [];
  const errors = [];
  const window = {
    dispatchEvent(event) { events.push(event); },
  };
  const context = vm.createContext({
    window,
    fetch: fetchImpl,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    console: {
      error(...args) { errors.push(args); },
    },
    Error,
    Map,
    Object,
    Promise,
    RegExp,
    String,
  });
  vm.runInContext(SOURCE, context, { filename: SOURCE_PATH });
  return { api: window.EAI_DATA_API, events, errors };
}

function responseFor(envelope, { ok = true, status = 200, jsonError = null } = {}) {
  return {
    ok,
    status,
    async json() {
      if (jsonError) throw jsonError;
      return envelope;
    },
  };
}

function envelope(overrides = {}) {
  return {
    schema_version: "2.0.0",
    content_commit: VALID_COMMIT,
    generated_at: "2026-07-11T00:00:00.000Z",
    data: [{ slug: "clip" }],
    ...overrides,
  };
}

test("browser adapter loads both base paths and deduplicates each endpoint", async () => {
  const requests = [];
  const expected = envelope({ schema_version: "2.19.7" });
  const { api } = boot(async (url) => {
    requests.push(url);
    return responseFor(expected);
  });

  const [papers, cachedPapers] = await Promise.all([
    api.loadPapers({ base: "/embodied-ai-reading-station" }),
    api.loadPapers({ base: "/embodied-ai-reading-station" }),
  ]);
  const rootPapers = await api.loadPapers({ base: "" });

  assert.deepEqual(JSON.parse(JSON.stringify(papers)), expected.data);
  assert.equal(cachedPapers, papers);
  assert.deepEqual(JSON.parse(JSON.stringify(rootPapers)), expected.data);
  assert.deepEqual(requests, [
    "/embodied-ai-reading-station/data/v2/papers.json",
    "/data/v2/papers.json",
  ]);
});

test("browser adapter checks response.ok before parsing JSON", async () => {
  let jsonCalls = 0;
  const { api } = boot(async () => ({
    ok: false,
    status: 503,
    async json() { jsonCalls += 1; return envelope(); },
  }));

  await assert.rejects(
    api.loadPapers({ base: "" }),
    error => error.code === "DATA_API_HTTP" && error.status === 503,
  );
  assert.equal(jsonCalls, 0);
});

test("browser adapter accepts only strict semantic versions with major 2", async () => {
  for (const schemaVersion of [undefined, null, "", "2", "2.0", "v2.0.0", "02.0.0", "1.9.9", "3.0.0"]) {
    const { api } = boot(async () => responseFor(envelope({ schema_version: schemaVersion })));
    await assert.rejects(
      api.loadPapers({ base: `/${String(schemaVersion)}` }),
      error => error.code === "DATA_API_SCHEMA_VERSION",
      `expected ${String(schemaVersion)} to be rejected`,
    );
  }
});

test("browser adapter rejects malformed content commits", async () => {
  for (const contentCommit of [undefined, "A".repeat(40), "a".repeat(39), `${"a".repeat(39)}g`]) {
    const { api } = boot(async () => responseFor(envelope({ content_commit: contentCommit })));
    await assert.rejects(
      api.loadPapers({ base: `/${String(contentCommit)}` }),
      error => error.code === "DATA_API_CONTENT_COMMIT",
    );
  }
});

test("browser adapter rejects missing or non-array data", async () => {
  for (const data of [undefined, null, {}, "papers"]) {
    const { api } = boot(async () => responseFor(envelope({ data })));
    await assert.rejects(
      api.loadPapers({ base: `/${String(data)}` }),
      error => error.code === "DATA_API_DATA",
    );
  }
});

test("browser adapter maps network and JSON failures to stable diagnostic codes", async () => {
  const network = boot(async () => { throw new Error("offline details"); });
  await assert.rejects(
    network.api.loadPapers({ base: "" }),
    error => error.code === "DATA_API_NETWORK",
  );

  const json = boot(async () => responseFor(null, { jsonError: new Error("bad json details") }));
  await assert.rejects(
    json.api.loadPapers({ base: "" }),
    error => error.code === "DATA_API_JSON",
  );
});

test("reportError exposes a stable event and console diagnostic to consumers", () => {
  const { api, events, errors } = boot(async () => responseFor(envelope()));
  const error = Object.assign(new Error("payload invalid"), {
    code: "DATA_API_DATA",
    endpoint: "/data/v2/papers.json",
  });

  const detail = api.reportError(error, { consumer: "link-preview" });

  assert.deepEqual(JSON.parse(JSON.stringify(detail)), {
    consumer: "link-preview",
    code: "DATA_API_DATA",
    message: "payload invalid",
    endpoint: "/data/v2/papers.json",
    status: null,
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "eai:data-error");
  assert.equal(events[0].detail.code, "DATA_API_DATA");
  assert.equal(errors.length, 1);
  assert.match(String(errors[0][0]), /link-preview.*DATA_API_DATA/);
});

test("404 suggestions wait for and reuse the shared v2 adapter", async () => {
  const html = build404([]);

  assert.match(html, /DOMContentLoaded/);
  assert.match(html, /api\.loadPapers\(\{ base: base \}\)/);
  assert.match(html, /reportError\(error, \{ consumer: '404-suggestions' \}\)/);
  assert.doesNotMatch(html, /fetch\([^)]*\/data\/papers\.json/);
  assert.doesNotMatch(html, /list\.innerHTML/);
  assert.match(html, /link\.textContent/);

  const adapter = html.indexOf("data-api.js");
  assert.ok(adapter >= 0);
  assert.ok(adapter < html.indexOf("reading-progress.js"));
  assert.ok(adapter < html.indexOf("link-preview.js"));

  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(match => match[1])
    .find(source => source.includes("init404Suggestions"));
  assert.ok(inline);
  let onReady = null;
  const bases = [];
  const document = {
    readyState: "loading",
    addEventListener(type, handler) {
      if (type === "DOMContentLoaded") onReady = handler;
    },
    querySelector() {
      return { getAttribute: () => "/embodied-ai-reading-station/styles.css" };
    },
  };
  vm.runInNewContext(inline, {
    document,
    location: { pathname: "/embodied-ai-reading-station/missing-paper/" },
    window: {
      EAI_DATA_API: {
        loadPapers({ base }) { bases.push(base); return Promise.resolve([]); },
        reportError() { throw new Error("valid response must not report an error"); },
      },
    },
    console,
    CustomEvent: class {},
    Error,
    Number,
    Object,
    Promise,
  });
  assert.deepEqual(bases, []);
  assert.equal(typeof onReady, "function");
  onReady();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(bases, ["/embodied-ai-reading-station"]);
});
