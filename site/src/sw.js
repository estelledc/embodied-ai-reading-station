// Embodied AI: Zero to One — Service Worker
// 核心壳失败关闭；页面 SWR；版本化 data network-first；图片与 vendor cache-first。

const BUILD_ID = "__EAI_BUILD_ID__";
const DATA_SCHEMA_VERSION = "__EAI_DATA_SCHEMA_VERSION__";
const CONTENT_COMMIT = "__EAI_CONTENT_COMMIT__";

const DATA_SCHEMA_MAJOR = DATA_SCHEMA_VERSION.split(".")[0];
const SCOPE_URL = new URL(self.registration.scope);
const SCOPE_PATH = SCOPE_URL.pathname.endsWith("/")
  ? SCOPE_URL.pathname
  : `${SCOPE_URL.pathname}/`;
const CACHE_PREFIX = `eai-${encodeURIComponent(SCOPE_PATH)}-`;
const SHELL_CACHE = `${CACHE_PREFIX}shell-${BUILD_ID}`;
const PAGES_CACHE = `${CACHE_PREFIX}pages-${BUILD_ID}`;
const IMAGES_CACHE = `${CACHE_PREFIX}images-${BUILD_ID}`;
const DATA_CACHE = `${CACHE_PREFIX}data-${BUILD_ID}-v${DATA_SCHEMA_MAJOR}-${CONTENT_COMMIT}`;
const CURRENT_CACHES = new Set([SHELL_CACHE, PAGES_CACHE, IMAGES_CACHE, DATA_CACHE]);
const LEGACY_CACHE_PREFIXES = ["eai-shell-", "eai-pages-", "eai-images-", "eai-data-"];
const CACHE_LIMITS = Object.freeze({ pages: 48, images: 96, data: 2 });

// 这些资源是站点可用的最小集合。任一项缺失都必须让新 worker 安装失败。
const SHELL_URLS = [
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
  "./page-behaviors.js",
  "./math-render.js",
  "./deck/deck.css",
  "./deck/deck.js",
  "./link-preview.js",
  "./sw-register.js",
  "./svg-export.js",
  "./favicon.svg",
  "./site.webmanifest",
];

const SHELL_PATHS = new Set(SHELL_URLS.map(relative => new URL(relative, SCOPE_URL).pathname));
const DATA_PATHS = new Set([
  new URL("./data/v2/index.json", SCOPE_URL).pathname,
  new URL("./data/v2/papers.json", SCOPE_URL).pathname,
]);

function isWithinScope(url) {
  if (url.origin !== SCOPE_URL.origin) return false;
  if (SCOPE_PATH === "/") return url.pathname.startsWith("/");
  return url.pathname === SCOPE_PATH.slice(0, -1) || url.pathname.startsWith(SCOPE_PATH);
}

function relativeScopePath(pathname) {
  if (SCOPE_PATH === "/") return pathname.slice(1);
  return pathname.startsWith(SCOPE_PATH) ? pathname.slice(SCOPE_PATH.length) : "";
}

async function trimCache(cache, limit) {
  const keys = await cache.keys();
  while (keys.length > limit) {
    await cache.delete(keys.shift());
  }
}

async function putAndTrim(cache, key, response, limit) {
  // Clone before the first await. The browser may start consuming the response
  // body as soon as respondWith resolves while this cache task continues.
  const cachedResponse = response.clone();
  await cache.delete(key);
  // Trim before the write as well as after it: a full cache should not need a
  // temporary limit+1 entry that can fail under storage pressure.
  await trimCache(cache, Math.max(0, limit - 1));
  await cache.put(key, cachedResponse);
  await trimCache(cache, limit);
}

async function touch(cache, key, response, limit) {
  const rollbackResponse = response.clone();
  try {
    await putAndTrim(cache, key, response, limit);
  } catch (error) {
    // A touch is only an ordering optimization. If rewriting the entry fails
    // after deletion, restore the known-good offline copy when storage allows.
    await cacheSafely(cache.put(key, rollbackResponse));
    throw error;
  }
}

async function openRuntimeCache(name) {
  try {
    return await caches.open(name);
  } catch {
    // Runtime caches are an optimization. Online responses must remain usable
    // when Cache Storage is unavailable or full.
    return null;
  }
}

async function cacheSafely(task) {
  try {
    await task;
  } catch {
    // Quota, eviction, and transient Cache Storage failures are non-fatal for
    // runtime requests. Install uses a separate fail-closed path below.
  }
}

function dataCacheKey(url) {
  // query 参数不能制造额外 data cache 条目；v2 目前只有两个固定 endpoint。
  return `${url.origin}${url.pathname}`;
}

async function isCurrentDataResponse(response) {
  if (!response || !response.ok) return false;
  try {
    const document = await response.clone().json();
    return document !== null
      && typeof document === "object"
      && !Array.isArray(document)
      && document.schema_version === DATA_SCHEMA_VERSION
      && document.content_commit === CONTENT_COMMIT;
  } catch {
    return false;
  }
}

function dataUnavailableResponse() {
  return new Response(JSON.stringify({
    error: "offline_data_unavailable",
    message: "当前版本的数据尚未缓存，请恢复网络后重试。",
  }), {
    status: 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function offlinePageResponse() {
  return new Response(`<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>当前离线 · Embodied AI</title>
<main><h1>当前离线</h1><p>这个页面还没有在本设备上访问过。请恢复网络后重试。</p>
<p><a href="${SCOPE_PATH}">返回首页</a></p></main>`, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function currentCachedData(cache, key) {
  if (!cache) return null;
  let hit;
  try {
    hit = await cache.match(key);
  } catch {
    return null;
  }
  if (!hit) return null;
  if (!(await isCurrentDataResponse(hit))) {
    await cacheSafely(cache.delete(key));
    return null;
  }
  await cacheSafely(touch(cache, key, hit, CACHE_LIMITS.data));
  return hit;
}

async function networkFirstData(request, url) {
  const cache = await openRuntimeCache(DATA_CACHE);
  const key = dataCacheKey(url);
  try {
    // Query variants are not separate API resources. Fetch the canonical URL
    // so a future edge layer cannot let query semantics overwrite its cache key.
    const response = await fetch(url.search ? key : request);
    if (!response.ok) {
      return await currentCachedData(cache, key) || response;
    }
    if (cache && await isCurrentDataResponse(response)) {
      await cacheSafely(putAndTrim(cache, key, response, CACHE_LIMITS.data));
    }
    return response;
  } catch {
    return await currentCachedData(cache, key) || dataUnavailableResponse();
  }
}

async function staleWhileRevalidatePage(schedule, request) {
  const cache = await openRuntimeCache(PAGES_CACHE);
  const hit = cache ? await cache.match(request).catch(() => undefined) : undefined;
  if (hit) {
    const refresh = (async () => {
      await cacheSafely(touch(cache, request, hit, CACHE_LIMITS.pages));
      try {
        const response = await fetch(request);
        if (response.ok) {
          await cacheSafely(putAndTrim(cache, request, response, CACHE_LIMITS.pages));
        }
      } catch {
        // 已访问页面继续使用 stale 副本；本次后台刷新失败不影响响应。
      }
    })();
    schedule(refresh);
    return hit;
  }

  try {
    const response = await fetch(request);
    if (cache && response.ok) {
      schedule(cacheSafely(putAndTrim(cache, request, response, CACHE_LIMITS.pages)));
    }
    return response;
  } catch {
    return offlinePageResponse();
  }
}

async function cacheFirst(schedule, request, cacheName, limit = null) {
  const cache = await openRuntimeCache(cacheName);
  const hit = cache ? await cache.match(request).catch(() => undefined) : undefined;
  if (hit) {
    if (limit !== null) {
      schedule(cacheSafely(touch(cache, request, hit, limit)));
    }
    return hit;
  }

  const response = await fetch(request);
  if (cache && response.ok) {
    if (limit === null) {
      schedule(cacheSafely(cache.put(request, response.clone())));
    } else {
      schedule(cacheSafely(putAndTrim(cache, request, response, limit)));
    }
  }
  return response;
}

function respondWithLifetime(event, handler) {
  const backgroundTasks = [];
  const schedule = task => backgroundTasks.push(Promise.resolve(task));
  const responsePromise = Promise.resolve().then(() => handler(schedule));
  event.respondWith(responsePromise);
  // waitUntil 必须在 fetch 回调内同步注册；response 完成时所有后台任务已经入队。
  event.waitUntil(responsePromise.then(
    () => Promise.all(backgroundTasks),
    () => Promise.allSettled(backgroundTasks).then(() => undefined),
  ));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(SHELL_CACHE);
      const requests = SHELL_URLS.map(relative => new Request(
        new URL(relative, SCOPE_URL),
        { cache: "reload" },
      ));
      await cache.addAll(requests);
    } catch (error) {
      // addAll 可能已经写入部分资源，只移除本次构建的新 shell cache。
      await caches.delete(SHELL_CACHE);
      throw error;
    }
  })());
});

self.addEventListener("message", (event) => {
  const type = typeof event.data === "string" ? event.data : event.data?.type;
  if (type === "SKIP_WAITING") {
    event.waitUntil(Promise.resolve(self.skipWaiting()));
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => (
        key.startsWith(CACHE_PREFIX)
        || LEGACY_CACHE_PREFIXES.some(prefix => key.startsWith(prefix))
      ) && !CURRENT_CACHES.has(key))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isWithinScope(url)) return;

  if (DATA_PATHS.has(url.pathname)) {
    respondWithLifetime(event, () => networkFirstData(request, url));
    return;
  }

  const relativePath = relativeScopePath(url.pathname);
  if (relativePath.startsWith("images/") || relativePath.startsWith("assets/")) {
    respondWithLifetime(event, schedule => cacheFirst(schedule, request, IMAGES_CACHE, CACHE_LIMITS.images));
    return;
  }

  // Shell/vendor URLs are generated without query strings. Do not let arbitrary
  // cache-busting queries grow the unbounded core cache.
  if (relativePath.startsWith("vendor/") && !url.search) {
    respondWithLifetime(event, schedule => cacheFirst(schedule, request, SHELL_CACHE));
    return;
  }

  if (SHELL_PATHS.has(url.pathname) && !url.search) {
    respondWithLifetime(event, schedule => cacheFirst(schedule, request, SHELL_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    respondWithLifetime(event, schedule => staleWhileRevalidatePage(schedule, request));
  }
});
