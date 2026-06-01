// Embodied AI Reading Station — Service Worker
// 策略：核心壳 cache-first；论文页 stale-while-revalidate；图片 cache-first

const VERSION = "v1";
const SHELL_CACHE = `eai-shell-${VERSION}`;
const PAGES_CACHE = `eai-pages-${VERSION}`;
const IMAGES_CACHE = `eai-images-${VERSION}`;

// 安装时预缓存核心壳
const SHELL_URLS = [
  "./",
  "./styles.css",
  "./pagefind/pagefind-ui.css",
  "./pagefind/pagefind-ui.js",
  "./search.js",
  "./outline.js",
  "./reading-progress.js",
  "./quick-filter.js",
  "./keyboard.js",
  "./theme-toggle.js",
  "./link-preview.js",
  "./favicon.svg",
  "./site.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS).catch(() => {})) // 单个失败不阻塞 install
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 不缓存第三方

  // 图片：cache-first
  if (/\/images\/.+\.(webp|jpg|png|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGES_CACHE).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // 论文 / topic / issue / learn 页：stale-while-revalidate
  if (/\/(papers|topics|issues|learn|eras|tags|lists)\/[^/]+\/?$/.test(url.pathname)) {
    event.respondWith(
      caches.open(PAGES_CACHE).then(cache =>
        cache.match(req).then(hit => {
          const networkPromise = fetch(req).then(res => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => hit);
          return hit || networkPromise;
        })
      )
    );
    return;
  }

  // 核心壳：cache-first
  if (SHELL_URLS.some(u => url.pathname.endsWith(u.replace(/^\.\//, "/")))) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) caches.open(SHELL_CACHE).then(c => c.put(req, res.clone()));
        return res;
      }))
    );
    return;
  }
  // 其他请求走网络
});
