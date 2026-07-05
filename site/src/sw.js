// Embodied AI: Zero to One — Service Worker
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
  const KEEP = new Set([SHELL_CACHE, PAGES_CACHE, IMAGES_CACHE]);
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      // 仅删属于本应用 (eai-) 但不在 KEEP 集合的旧版本
      keys.filter(k => k.startsWith("eai-") && !KEEP.has(k)).map(k => caches.delete(k))
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

  // vendor 静态资源（自托管 KaTeX/D3，内容随缓存版本更新）：cache-first
  if (url.pathname.includes("/vendor/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(cache =>
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
          }).catch(() => hit || new Response("", { status: 504 }));
          return hit || networkPromise;
        })
      )
    );
    return;
  }

  // 核心壳：cache-first（精确路径匹配，不再用 endsWith 误吞所有目录页）
  // 解析 SHELL_URLS 成 scope 路径前缀 + 文件名集合
  const scope = new URL(self.registration.scope).pathname; // 形如 "/embodied-ai-reading-station/"
  const isShell = SHELL_URLS.some(u => {
    const file = u.replace(/^\.\//, "");
    if (file === "") return url.pathname === scope || url.pathname === scope.slice(0, -1);
    return url.pathname === scope + file;
  });
  if (isShell) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) caches.open(SHELL_CACHE).then(c => c.put(req, res.clone()));
        return res;
      }).catch(() => hit || new Response("", { status: 504 })))
    );
    return;
  }
  // 其他请求走网络
});
