// 长文笔记右栏 sticky outline — IntersectionObserver 高亮当前章节
(() => {
  const outline = document.querySelector(".outline");
  if (!outline) return;

  const links = outline.querySelectorAll("a[href^='#']");
  if (links.length === 0) return;

  const idToLink = new Map();
  for (const a of links) idToLink.set(a.getAttribute("href").slice(1), a);

  const headings = [];
  for (const id of idToLink.keys()) {
    const el = document.getElementById(id);
    if (el) headings.push(el);
  }
  if (headings.length === 0) return;

  let active = null;
  function setActive(id) {
    if (active === id) return;
    if (active && idToLink.has(active)) idToLink.get(active).classList.remove("active");
    active = id;
    if (id && idToLink.has(id)) idToLink.get(id).classList.add("active");
  }

  const obs = new IntersectionObserver((entries) => {
    // 找最靠上的那个 intersecting heading
    const visible = entries
      .filter((e) => e.isIntersecting)
      .map((e) => ({ id: e.target.id, top: e.boundingClientRect.top }))
      .sort((a, b) => a.top - b.top);
    if (visible.length > 0) setActive(visible[0].id);
  }, {
    rootMargin: "-15% 0px -70% 0px",
    threshold: 0,
  });

  for (const h of headings) obs.observe(h);
})();

// === heading anchor copy: hover h2/h3 显示 #，点击复制 deep link ===
(() => {
  const content = document.querySelector(".note-content");
  if (!content) return;
  const headings = content.querySelectorAll("h2[id], h3[id]");
  for (const h of headings) {
    const link = document.createElement("a");
    link.className = "heading-anchor";
    link.href = "#" + h.id;
    link.setAttribute("aria-label", "复制链接");
    link.textContent = "#";
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const deepLink = location.origin + location.pathname + "#" + h.id;
      try {
        await navigator.clipboard.writeText(deepLink);
        link.classList.add("copied");
        link.textContent = "✓";
        history.replaceState(null, "", "#" + h.id);
        setTimeout(() => {
          link.classList.remove("copied");
          link.textContent = "#";
        }, 1200);
      } catch {
        // fallback: 直接跳转
        location.hash = h.id;
      }
    });
    h.appendChild(link);
  }
})();

// === scroll progress bar：仅在论文页 ===
(() => {
  if (!document.querySelector(".note-content")) return;
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  let raf = null;
  function update() {
    raf = null;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (max <= 0) { bar.style.transform = "scaleX(0)"; return; }
    const pct = Math.min(1, Math.max(0, h.scrollTop / max));
    bar.style.transform = `scaleX(${pct})`;
  }
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

// === cite copy button ===
(() => {
  document.querySelectorAll(".cite-copy").forEach(btn => {
    const block = btn.closest(".cite-block");
    if (!block) return;
    const code = block.querySelector(".cite-code");
    if (!code) return;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(code.textContent.trim());
        btn.classList.add("copied");
        const orig = btn.textContent;
        btn.textContent = "✓ 已复制";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = orig;
        }, 1400);
      } catch {
        // fallback: 选中文本
        const r = document.createRange();
        r.selectNodeContents(code);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
      }
    });
  });
})();

// === 阅读计时器：可见时累计，达 reading-time 时弹 toast 一次 ===
(() => {
  const meta = document.querySelector(".reading-meta");
  if (!meta) return;
  const txt = meta.textContent || "";
  const m = txt.match(/(\d+)\s*min/);
  if (!m) return;
  const targetSec = parseInt(m[1], 10) * 60;
  if (targetSec <= 30) return;

  const slug = (location.pathname.match(/\/papers\/([^/]+)\//) || [])[1];
  if (!slug) return;
  const KEY = `eaireading.timer.${slug}`;
  const NOTIFIED_KEY = `${KEY}.notified`;

  let elapsed = parseInt(sessionStorage.getItem(KEY) || "0", 10);
  let lastTick = Date.now();
  let visible = !document.hidden;
  let notified = sessionStorage.getItem(NOTIFIED_KEY) === "1";

  function persistReading() {
    try {
      const data = JSON.parse(localStorage.getItem("eaireading.timing") || "{}");
      const wcMatch = txt.match(/(\d+)\s*字/);
      const wc = wcMatch ? parseInt(wcMatch[1], 10) : 0;
      data[slug] = { seconds: Math.floor(elapsed), wordCount: wc };
      localStorage.setItem("eaireading.timing", JSON.stringify(data));
    } catch {}
  }

  // 小角标：右下角显示 "已读 X / Y 分钟"
  const badge = document.createElement("div");
  badge.className = "read-timer-badge";
  badge.hidden = true;
  document.body.appendChild(badge);

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function tick() {
    if (!visible) return;
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;
    elapsed += dt;
    sessionStorage.setItem(KEY, String(Math.floor(elapsed)));
    if (elapsed > 5) {
      badge.hidden = false;
      badge.textContent = `${fmt(elapsed)} / ${fmt(targetSec)}`;
      const pct = Math.min(1, elapsed / targetSec);
      badge.style.setProperty("--p", pct);
    }
    if (Math.floor(elapsed) % 10 < 2) persistReading();
    if (!notified && elapsed >= targetSec) {
      notified = true;
      sessionStorage.setItem(NOTIFIED_KEY, "1");
      const toast = document.createElement("div");
      toast.className = "auto-mark-toast show";
      toast.textContent = `⏱ ${Math.round(targetSec / 60)} 分钟到了。`;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      tick();
      visible = false;
    } else {
      lastTick = Date.now();
      visible = true;
    }
  });
  setInterval(tick, 2000);
})();

// === image lightbox：点击放大 ===
(() => {
  const imgs = document.querySelectorAll(".note-content img, .topic-landing-hero img, .hero-figure img");
  if (imgs.length === 0) return;

  let overlay = null;
  function open(src, alt) {
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.className = "img-lightbox";
    overlay.innerHTML = `
      <img src="${src}" alt="${(alt || "").replace(/"/g, "&quot;")}">
      <button class="lb-close" aria-label="关闭">×</button>
      ${alt ? `<div class="lb-caption">${alt}</div>` : ""}
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    function close() {
      if (!overlay) return;
      overlay.classList.remove("show");
      const o = overlay; overlay = null;
      setTimeout(() => o.remove(), 220);
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay || e.target.classList.contains("lb-close")) close();
    });
    document.addEventListener("keydown", function onKey(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", onKey);
        close();
      }
    });
  }

  for (const img of imgs) {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", () => open(img.currentSrc || img.src, img.alt));
  }
})();

// === copy markdown link button ===
(() => {
  document.querySelectorAll(".copy-md-btn[data-md]").forEach(btn => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.md);
        const orig = btn.textContent;
        btn.textContent = "✓";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = orig;
          btn.classList.remove("copied");
        }, 1100);
      } catch {}
    });
  });
})();

// === share button ===
(() => {
  document.querySelectorAll(".share-btn[data-share-url]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const title = btn.dataset.shareTitle || "";
      const url = btn.dataset.shareUrl || location.href;
      const text = btn.dataset.shareText || "";
      if (navigator.share) {
        try {
          await navigator.share({ title, url, text });
          return;
        } catch (e) {
          // 用户取消，直接 fallback
        }
      }
      // fallback: 复制 URL
      try {
        await navigator.clipboard.writeText(url);
        const orig = btn.textContent;
        btn.textContent = "✓";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1100);
      } catch {}
    });
  });
})();

// === code block copy ===
(() => {
  document.querySelectorAll(".note-content pre, .note-content blockquote pre").forEach(pre => {
    if (pre.closest(".cite-content")) return; // BibTeX 已有自己的复制按钮
    const code = pre.querySelector("code") || pre;
    const wrap = pre.parentElement;
    if (getComputedStyle(pre).position === "static") pre.style.position = "relative";
    const btn = document.createElement("button");
    btn.className = "code-copy-btn";
    btn.type = "button";
    btn.textContent = "⧉";
    btn.setAttribute("aria-label", "复制代码");
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.textContent = "✓";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "⧉"; btn.classList.remove("copied"); }, 1100);
      } catch {}
    });
    pre.appendChild(btn);
  });
})();

// === back to top floating button (only on long pages) ===
(() => {
  // 仅论文/issue/learn 这种长文页
  if (!document.querySelector(".note-content, .issue-editorial")) return;
  const btn = document.createElement("button");
  btn.className = "back-top-btn";
  btn.type = "button";
  btn.setAttribute("aria-label", "回到顶部");
  btn.textContent = "↑";
  btn.hidden = true;
  document.body.appendChild(btn);

  let raf = null;
  function check() {
    raf = null;
    btn.hidden = window.scrollY < window.innerHeight;
  }
  window.addEventListener("scroll", () => {
    if (!raf) raf = requestAnimationFrame(check);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();
