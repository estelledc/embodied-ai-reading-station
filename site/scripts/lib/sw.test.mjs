import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.resolve(HERE, "..", "..", "src", "sw.js");
const SOURCE = fs.readFileSync(SOURCE_PATH, "utf8");

const BUILD_ID = "20260711093000-0123456789ab";
const SCHEMA_VERSION = "2.1.0";
const CONTENT_COMMIT = "0123456789abcdef0123456789abcdef01234567";

function cacheNames(scope = "https://example.test/") {
  const scopeUrl = new URL(scope);
  const scopePath = scopeUrl.pathname.endsWith("/")
    ? scopeUrl.pathname
    : `${scopeUrl.pathname}/`;
  const prefix = `eai-${encodeURIComponent(scopePath)}-`;
  return {
    prefix,
    shell: `${prefix}shell-${BUILD_ID}`,
    pages: `${prefix}pages-${BUILD_ID}`,
    images: `${prefix}images-${BUILD_ID}`,
    data: `${prefix}data-${BUILD_ID}-v2-${CONTENT_COMMIT}`,
  };
}

const {
  prefix: CACHE_PREFIX,
  shell: SHELL_CACHE,
  pages: PAGES_CACHE,
  images: IMAGES_CACHE,
  data: DATA_CACHE,
} = cacheNames();

const REQUIRED_SHELL_URLS = [
  "./",
  "./styles.css",
  "./jx/tokens.css",
  "./jx/components.css",
  "./pagefind/pagefind-ui.css",
  "./pagefind/pagefind-ui.js",
  "./search.js",
  "./outline.js",
  "./data-api.js",
  "./reading-progress.js",
  "./quick-filter.js",
  "./keyboard.js",
  "./theme-toggle.js",
  "./link-preview.js",
  "./sw-register.js",
  "./svg-export.js",
  "./favicon.svg",
  "./site.webmanifest",
];

function injectSource() {
  return SOURCE
    .replace('const BUILD_ID = "__EAI_BUILD_ID__";', `const BUILD_ID = "${BUILD_ID}";`)
    .replace(
      'const DATA_SCHEMA_VERSION = "__EAI_DATA_SCHEMA_VERSION__";',
      `const DATA_SCHEMA_VERSION = "${SCHEMA_VERSION}";`,
    )
    .replace(
      'const CONTENT_COMMIT = "__EAI_CONTENT_COMMIT__";',
      `const CONTENT_COMMIT = "${CONTENT_COMMIT}";`,
    );
}

function request(url, { method = "GET", mode = "cors" } = {}) {
  return { url, method, mode };
}

function jsonResponse({
  schemaVersion = SCHEMA_VERSION,
  contentCommit = CONTENT_COMMIT,
  data = [],
  status = 200,
} = {}) {
  return new Response(JSON.stringify({
    schema_version: schemaVersion,
    content_commit: contentCommit,
    data,
  }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createHarness({
  scope = "https://example.test/",
  shellFailure = null,
  fetchImpl = async req => new Response(`network:${req.url}`, { status: 200 }),
  cacheOpenFailure = null,
  cachePutFailure = null,
  sharedCacheStore = null,
} = {}) {
  const listeners = new Map();
  const cacheStore = sharedCacheStore ?? new Map();
  const state = {
    addAllRequests: [],
    cacheDeletes: [],
    claimCalls: 0,
    fetchCalls: [],
    fetchImpl,
    skipWaitingCalls: 0,
  };

  function keyOf(value) {
    const raw = typeof value === "string" || value instanceof URL ? String(value) : value.url;
    return new URL(raw, scope).href;
  }

  class FakeCache {
    constructor(name) {
      this.name = name;
      this.entries = new Map();
    }

    async addAll(values) {
      state.addAllRequests.push(...values);
      for (const value of values) {
        const key = keyOf(value);
        if (shellFailure && key === keyOf(shellFailure)) {
          throw new Error(`shell unavailable: ${value}`);
        }
        await this.put(key, new Response(`shell:${value}`));
      }
    }

    async delete(value) {
      return this.entries.delete(keyOf(value));
    }

    async keys() {
      return [...this.entries.keys()].map(url => ({ url }));
    }

    async match(value) {
      const hit = this.entries.get(keyOf(value));
      return hit ? hit.clone() : undefined;
    }

    async put(value, response) {
      const key = keyOf(value);
      if (cachePutFailure?.(this.name, key)) {
        throw new Error(`cache put unavailable: ${this.name} ${key}`);
      }
      this.entries.set(key, response.clone());
    }
  }

  const caches = {
    async delete(name) {
      state.cacheDeletes.push(name);
      return cacheStore.delete(name);
    },
    async keys() {
      return [...cacheStore.keys()];
    },
    async open(name) {
      if (cacheOpenFailure?.(name)) {
        throw new Error(`cache open unavailable: ${name}`);
      }
      if (!cacheStore.has(name)) cacheStore.set(name, new FakeCache(name));
      return cacheStore.get(name);
    },
  };

  const self = {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    clients: {
      async claim() {
        state.claimCalls += 1;
      },
    },
    registration: { scope },
    async skipWaiting() {
      state.skipWaitingCalls += 1;
    },
  };

  const context = vm.createContext({
    URL,
    Request,
    Response,
    caches,
    console,
    fetch: async req => {
      state.fetchCalls.push(req.url ?? String(req));
      return state.fetchImpl(req);
    },
    self,
  });
  vm.runInContext(injectSource(), context, { filename: SOURCE_PATH });

  function dispatch(type, properties = {}) {
    const waits = [];
    let responsePromise = null;
    const event = {
      ...properties,
      respondWith(value) {
        assert.equal(responsePromise, null, "respondWith may only be called once");
        responsePromise = Promise.resolve(value);
      },
      waitUntil(value) {
        waits.push(Promise.resolve(value));
      },
    };
    for (const listener of listeners.get(type) ?? []) listener(event);

    async function settleWaits() {
      for (let index = 0; index < waits.length; index += 1) {
        await waits[index];
      }
    }

    return {
      get intercepted() { return responsePromise !== null; },
      get waitCount() { return waits.length; },
      async done() {
        if (responsePromise) await responsePromise;
        await settleWaits();
      },
      async response() {
        assert.ok(responsePromise, `${type} event was not intercepted`);
        const response = await responsePromise;
        await settleWaits();
        return response;
      },
      async responseBeforeWaits() {
        assert.ok(responsePromise, `${type} event was not intercepted`);
        return responsePromise;
      },
    };
  }

  return {
    caches,
    cacheStore,
    dispatch,
    fetch(url, options) {
      return dispatch("fetch", { request: request(url, options) });
    },
    state,
  };
}

test("source freezes build/schema/commit placeholders, cache limits, and the complete core shell", () => {
  assert.match(SOURCE, /const BUILD_ID = "__EAI_BUILD_ID__";/);
  assert.match(SOURCE, /const DATA_SCHEMA_VERSION = "__EAI_DATA_SCHEMA_VERSION__";/);
  assert.match(SOURCE, /const CONTENT_COMMIT = "__EAI_CONTENT_COMMIT__";/);
  assert.match(SOURCE, /const CACHE_PREFIX = `eai-\$\{encodeURIComponent\(SCOPE_PATH\)\}-`;/);
  assert.match(SOURCE, /pages:\s*48/);
  assert.match(SOURCE, /images:\s*96/);
  assert.match(SOURCE, /data:\s*2/);
  for (const relativeUrl of REQUIRED_SHELL_URLS) {
    assert.ok(SOURCE.includes(JSON.stringify(relativeUrl)), `missing core shell URL: ${relativeUrl}`);
  }
});

test("install atomically keeps a complete shell and never skips waiting automatically", async () => {
  const scope = "https://example.test/repo/";
  const harness = createHarness({ scope });
  const install = harness.dispatch("install");
  await install.done();

  const cache = await harness.caches.open(cacheNames(scope).shell);
  const keys = await cache.keys();
  assert.equal(keys.length, REQUIRED_SHELL_URLS.length);
  assert.ok(keys.some(key => key.url === "https://example.test/repo/styles.css"));
  assert.ok(keys.some(key => key.url === "https://example.test/repo/"));
  assert.equal(harness.state.addAllRequests.length, REQUIRED_SHELL_URLS.length);
  assert.ok(harness.state.addAllRequests.every(value => value instanceof Request));
  assert.ok(harness.state.addAllRequests.every(value => value.cache === "reload"));
  assert.equal(harness.state.skipWaitingCalls, 0);
});

test("failed install deletes only the new partial shell and preserves old worker caches", async () => {
  const scope = "https://example.test/repo/";
  const names = cacheNames(scope);
  const harness = createHarness({
    scope,
    shellFailure: "./jx/components.css",
  });
  await (await harness.caches.open(`${names.prefix}shell-old`)).put("./styles.css", new Response("old"));
  await (await harness.caches.open(`${names.prefix}pages-old`)).put("./papers/old/", new Response("old page"));
  await (await harness.caches.open("unrelated-cache")).put("./x", new Response("unrelated"));

  await assert.rejects(harness.dispatch("install").done(), /shell unavailable/);
  assert.equal(harness.cacheStore.has(names.shell), false);
  assert.equal(harness.cacheStore.has(`${names.prefix}shell-old`), true);
  assert.equal(harness.cacheStore.has(`${names.prefix}pages-old`), true);
  assert.equal(harness.cacheStore.has("unrelated-cache"), true);
  assert.deepEqual(harness.state.cacheDeletes, [names.shell]);
  assert.equal(harness.state.skipWaitingCalls, 0);
});

test("v2 data is network-first, cached only on exact schema/commit, and used on network or HTTP failure", async () => {
  const scope = "https://example.test/repo/";
  const endpoint = `${scope}data/v2/papers.json`;
  const harness = createHarness({
    scope,
    fetchImpl: async () => jsonResponse({ data: [{ slug: "clip" }] }),
  });

  const online = await harness.fetch(`${endpoint}?fresh=1`).response();
  assert.equal(online.status, 200);
  assert.deepEqual((await online.json()).data, [{ slug: "clip" }]);
  const dataCache = await harness.caches.open(cacheNames(scope).data);
  assert.equal((await dataCache.keys()).length, 1, "query variants share one canonical cache key");
  assert.ok(await dataCache.match(endpoint));
  assert.equal(harness.state.fetchCalls[0], endpoint, "query variants fetch the canonical endpoint");

  harness.state.fetchImpl = async () => { throw new Error("offline"); };
  const offline = await harness.fetch(endpoint).response();
  assert.equal(offline.status, 200);
  assert.deepEqual((await offline.json()).data, [{ slug: "clip" }]);

  harness.state.fetchImpl = async () => new Response("upstream unavailable", { status: 502 });
  const httpFailure = await harness.fetch(endpoint).response();
  assert.equal(httpFailure.status, 200, "a valid exact cache wins over HTTP non-ok");
  assert.deepEqual((await httpFailure.json()).data, [{ slug: "clip" }]);
});

test("200 data with a wrong major, minor, or commit is returned for diagnostics but never cached", async t => {
  const cases = [
    ["wrong major", { schemaVersion: "3.0.0" }],
    ["wrong minor", { schemaVersion: "2.2.0" }],
    ["wrong commit", { contentCommit: "f".repeat(40) }],
  ];

  for (const [name, document] of cases) {
    await t.test(name, async () => {
      const harness = createHarness({ fetchImpl: async () => jsonResponse(document) });
      const response = await harness.fetch("https://example.test/data/v2/index.json").response();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).schema_version, document.schemaVersion ?? SCHEMA_VERSION);
      assert.equal((await (await harness.caches.open(DATA_CACHE)).keys()).length, 0);
    });
  }
});

test("data fallback rejects corrupt current entries and never reads an old namespace", async () => {
  const endpoint = "https://example.test/data/v2/papers.json";
  const harness = createHarness({ fetchImpl: async () => { throw new Error("offline"); } });
  const oldCacheName = `eai-data-old-v2-${"a".repeat(40)}`;
  await (await harness.caches.open(oldCacheName)).put(endpoint, jsonResponse());
  const current = await harness.caches.open(DATA_CACHE);
  await current.put(endpoint, jsonResponse({ contentCommit: "b".repeat(40) }));

  const response = await harness.fetch(endpoint).response();
  assert.equal(response.status, 503);
  assert.match(await response.text(), /offline_data_unavailable/);
  assert.equal((await current.keys()).length, 0, "invalid current entry is evicted");
  assert.ok(await (await harness.caches.open(oldCacheName)).match(endpoint), "old namespace remains unread");
});

test("data cache trims to two canonical endpoints and moves updated entries to the newest position", async () => {
  const scope = "https://example.test/repo/";
  const harness = createHarness({ scope, fetchImpl: async () => jsonResponse() });
  const cache = await harness.caches.open(cacheNames(scope).data);
  await cache.put(`${scope}data/v2/obsolete.json`, jsonResponse());
  await cache.put(`${scope}data/v2/papers.json`, jsonResponse());

  await harness.fetch(`${scope}data/v2/index.json`).response();
  const keys = (await cache.keys()).map(key => key.url);
  assert.deepEqual(keys, [
    `${scope}data/v2/papers.json`,
    `${scope}data/v2/index.json`,
  ]);
});

test("page and image LRU limits retain a touched entry and evict the oldest untouched entry", async () => {
  const harness = createHarness();

  for (let index = 0; index < 48; index += 1) {
    await harness.fetch(`https://example.test/papers/p-${index}/`, { mode: "navigate" }).response();
  }
  const touchedPage = harness.fetch("https://example.test/papers/p-0/", { mode: "navigate" });
  const touchedPageResponse = await touchedPage.responseBeforeWaits();
  await touchedPageResponse.text();
  await touchedPage.done();
  assert.ok(touchedPage.waitCount > 0, "page refresh is attached to waitUntil");
  await harness.fetch("https://example.test/papers/p-48/", { mode: "navigate" }).response();

  const pages = await harness.caches.open(PAGES_CACHE);
  assert.equal((await pages.keys()).length, 48);
  assert.ok(await pages.match("https://example.test/papers/p-0/"));
  assert.equal(await pages.match("https://example.test/papers/p-1/"), undefined);

  for (let index = 0; index < 96; index += 1) {
    await harness.fetch(`https://example.test/images/card-${index}.webp`).response();
  }
  const touchedImage = harness.fetch("https://example.test/images/card-0.webp");
  const touchedImageResponse = await touchedImage.responseBeforeWaits();
  await touchedImageResponse.text();
  await touchedImage.done();
  assert.ok(touchedImage.waitCount > 0, "image touch is attached to waitUntil");
  await harness.fetch("https://example.test/assets/paper/new.png").response();

  const images = await harness.caches.open(IMAGES_CACHE);
  assert.equal((await images.keys()).length, 96);
  assert.ok(await images.match("https://example.test/images/card-0.webp"));
  assert.equal(await images.match("https://example.test/images/card-1.webp"), undefined);
  assert.ok(await images.match("https://example.test/assets/paper/new.png"));
});

test("runtime cache failures never replace successful network responses", async t => {
  await t.test("cache open failure", async () => {
    const harness = createHarness({
      cacheOpenFailure: name => name === DATA_CACHE || name === PAGES_CACHE || name === IMAGES_CACHE,
      fetchImpl: async req => req.url.includes("/data/v2/")
        ? jsonResponse({ data: [{ slug: "clip" }] })
        : new Response(`network:${req.url}`, { status: 200 }),
    });

    const data = await harness.fetch("https://example.test/data/v2/papers.json").response();
    assert.equal(data.status, 200);
    assert.deepEqual((await data.json()).data, [{ slug: "clip" }]);

    const page = await harness.fetch("https://example.test/papers/clip/", { mode: "navigate" }).response();
    assert.equal(page.status, 200);
    assert.equal(await page.text(), "network:https://example.test/papers/clip/");

    const image = await harness.fetch("https://example.test/images/clip.webp").response();
    assert.equal(image.status, 200);
    assert.equal(await image.text(), "network:https://example.test/images/clip.webp");
  });

  await t.test("cache put failure", async () => {
    const runtimeCaches = new Set([DATA_CACHE, PAGES_CACHE, IMAGES_CACHE]);
    const harness = createHarness({
      cachePutFailure: name => runtimeCaches.has(name),
      fetchImpl: async req => req.url.includes("/data/v2/")
        ? jsonResponse({ data: [{ slug: "clip" }] })
        : new Response(`network:${req.url}`, { status: 200 }),
    });

    assert.equal((await harness.fetch("https://example.test/data/v2/papers.json").response()).status, 200);
    assert.equal((await harness.fetch("https://example.test/papers/clip/", { mode: "navigate" }).response()).status, 200);
    assert.equal((await harness.fetch("https://example.test/images/clip.webp").response()).status, 200);
  });
});

test("a failed LRU touch restores the known-good offline entry when storage recovers", async () => {
  const target = "https://example.test/images/keep.webp";
  let failNextTouch = false;
  let touchFailed = false;
  const harness = createHarness({
    cachePutFailure(name, key) {
      if (failNextTouch && !touchFailed && name === IMAGES_CACHE && key === target) {
        touchFailed = true;
        return true;
      }
      return false;
    },
  });
  const images = await harness.caches.open(IMAGES_CACHE);
  await images.put(target, new Response("known-good"));
  failNextTouch = true;

  const event = harness.fetch(target);
  const response = await event.responseBeforeWaits();
  assert.equal(await response.text(), "known-good");
  await event.done();

  assert.equal(touchFailed, true);
  assert.equal(await (await images.match(target)).text(), "known-good");
});

test("root and repo scopes intercept only in-scope GET data, assets, images, vendor, shell, and navigation routes", async () => {
  for (const scope of ["https://example.test/", "https://example.test/embodied-ai-reading-station/"]) {
    const base = new URL(scope).pathname;
    const prefix = base === "/" ? "" : base.slice(0, -1);
    const harness = createHarness({
      scope,
      fetchImpl: async req => req.url.includes("/data/v2/")
        ? jsonResponse()
        : new Response(`network:${req.url}`),
    });

    for (const relative of [
      "/data/v2/index.json",
      "/images/card.webp",
      "/assets/paper/figure.png",
      "/vendor/d3.min.js",
      "/styles.css",
    ]) {
      const event = harness.fetch(`https://example.test${prefix}${relative}`);
      assert.equal(event.intercepted, true, `${scope} should intercept ${relative}`);
      assert.equal((await event.response()).status, 200);
    }
    const navigation = harness.fetch(`https://example.test${prefix}/papers/clip/`, { mode: "navigate" });
    assert.equal(navigation.intercepted, true);
    assert.equal((await navigation.response()).status, 200);

    assert.equal(harness.fetch(`https://example.test${prefix}/api`, { method: "POST" }).intercepted, false);
    assert.equal(harness.fetch(`https://other.test${prefix}/images/card.webp`).intercepted, false);
    assert.equal(harness.fetch(`https://example.test${prefix}/styles.css?bust=1`).intercepted, false);
    assert.equal(harness.fetch(`https://example.test${prefix}/vendor/d3.min.js?bust=1`).intercepted, false);
    if (prefix) {
      assert.equal(harness.fetch("https://example.test/images/outside.webp").intercepted, false);
      assert.equal(harness.fetch("https://example.test/embodied-ai-reading-station-other/images/x.webp").intercepted, false);
    }
  }
});

test("visited navigation reloads stale offline while an unvisited route gets scoped HTML 503", async () => {
  for (const [scope, homePath] of [
    ["https://example.test/", "/"],
    ["https://example.test/repo/", "/repo/"],
  ]) {
    const harness = createHarness({
      scope,
      fetchImpl: async () => { throw new Error("offline"); },
    });
    const visitedUrl = new URL("./papers/visited/", scope).href;
    await (await harness.caches.open(cacheNames(scope).pages)).put(visitedUrl, new Response("cached paper"));

    const visited = await harness.fetch(visitedUrl, { mode: "navigate" }).response();
    assert.equal(visited.status, 200);
    assert.equal(await visited.text(), "cached paper");

    const unvisitedUrl = new URL("./papers/unvisited/", scope).href;
    const unvisited = await harness.fetch(unvisitedUrl, { mode: "navigate" }).response();
    assert.equal(unvisited.status, 503);
    assert.match(unvisited.headers.get("content-type"), /^text\/html/);
    const html = await unvisited.text();
    assert.match(html, /当前离线/);
    assert.ok(html.includes(`<a href="${homePath}">返回首页</a>`));
  }
});

test("SKIP_WAITING is message-controlled and activate deletes old eai caches only before claiming", async () => {
  const harness = createHarness();
  await harness.dispatch("message", { data: { type: "IGNORED" } }).done();
  assert.equal(harness.state.skipWaitingCalls, 0);

  await harness.dispatch("message", { data: { type: "SKIP_WAITING" } }).done();
  assert.equal(harness.state.skipWaitingCalls, 1);

  for (const name of [
    SHELL_CACHE,
    PAGES_CACHE,
    IMAGES_CACHE,
    DATA_CACHE,
    `${CACHE_PREFIX}shell-old`,
    `${CACHE_PREFIX}data-old-v1-deadbeef`,
    "eai-shell-legacy-build",
    "eai-data-legacy-v1-deadbeef",
    `${cacheNames("https://example.test/repo/").prefix}shell-other-scope`,
    "unrelated-cache",
  ]) {
    await harness.caches.open(name);
  }
  await harness.dispatch("activate").done();

  const remaining = new Set(await harness.caches.keys());
  assert.ok(remaining.has(SHELL_CACHE));
  assert.ok(remaining.has(PAGES_CACHE));
  assert.ok(remaining.has(IMAGES_CACHE));
  assert.ok(remaining.has(DATA_CACHE));
  assert.ok(remaining.has("unrelated-cache"));
  assert.equal(remaining.has(`${CACHE_PREFIX}shell-old`), false);
  assert.equal(remaining.has(`${CACHE_PREFIX}data-old-v1-deadbeef`), false);
  assert.equal(remaining.has("eai-shell-legacy-build"), false);
  assert.equal(remaining.has("eai-data-legacy-v1-deadbeef"), false);
  assert.ok(remaining.has(`${cacheNames("https://example.test/repo/").prefix}shell-other-scope`));
  assert.equal(harness.state.claimCalls, 1);
});

test("root and repository workers keep independent cache namespaces on one origin", async () => {
  const sharedCacheStore = new Map();
  const rootScope = "https://example.test/";
  const repoScope = "https://example.test/repo/";
  const rootNames = cacheNames(rootScope);
  const repoNames = cacheNames(repoScope);
  const root = createHarness({ scope: rootScope, sharedCacheStore });
  const repo = createHarness({ scope: repoScope, sharedCacheStore });

  await root.dispatch("install").done();
  await repo.dispatch("install").done();
  await root.caches.open(`${rootNames.prefix}shell-old`);
  await repo.caches.open(`${repoNames.prefix}shell-old`);

  await repo.dispatch("activate").done();
  let remaining = new Set(await repo.caches.keys());
  assert.ok(remaining.has(rootNames.shell));
  assert.ok(remaining.has(`${rootNames.prefix}shell-old`));
  assert.ok(remaining.has(repoNames.shell));
  assert.equal(remaining.has(`${repoNames.prefix}shell-old`), false);

  await root.dispatch("activate").done();
  remaining = new Set(await root.caches.keys());
  assert.ok(remaining.has(rootNames.shell));
  assert.ok(remaining.has(repoNames.shell));
  assert.equal(remaining.has(`${rootNames.prefix}shell-old`), false);
});
