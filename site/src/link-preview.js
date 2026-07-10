// hover 内部 /papers/<slug>/ 链接 → 显示 tldr 预览卡片
// 数据源：fetch /data/papers.json（一次缓存）
(function () {
  let data = null;
  let dataPromise = null;
  function loadData() {
    if (data) return Promise.resolve(data);
    if (dataPromise) return dataPromise;
    // 计算 base URL
    const stylesLink = document.querySelector('link[href*="/styles.css"]');
    const base = stylesLink ? stylesLink.getAttribute("href").replace(/\/styles\.css$/, "") : "";
    dataPromise = fetch(base + "/data/papers.json")
      .then(r => r.json())
      .then(d => {
        const idx = new Map();
        for (const p of d) idx.set(p.slug, p);
        data = idx;
        return idx;
      })
      .catch(() => new Map());
    return dataPromise;
  }

  let tooltip = null;
  let currentSlug = null;
  let showTimer = null;

  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement("div");
    tooltip.className = "link-preview";
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function position(t, e) {
    const padding = 14;
    let x = e.clientX + padding;
    let y = e.clientY + padding;
    const r = t.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 10) x = e.clientX - r.width - padding;
    if (y + r.height > window.innerHeight - 10) y = e.clientY - r.height - padding;
    t.style.left = x + "px";
    t.style.top = y + "px";
  }

  function show(slug, e) {
    loadData().then(idx => {
      if (currentSlug !== slug) return; // 用户已离开
      const p = idx.get(slug);
      if (!p) return;
      const t = ensureTooltip();
      const meta = document.createElement("div");
      meta.className = "lp-meta";
      meta.textContent = `${String(p.topic ?? "")} · ${p.year || ""}${p.venue ? ` · ${String(p.venue)}` : ""}`;
      const title = document.createElement("div");
      title.className = "lp-title";
      title.textContent = String(p.title ?? "");
      const children = [meta, title];
      if (p.tldr) {
        const tldr = document.createElement("div");
        tldr.className = "lp-tldr";
        tldr.textContent = `${String(p.tldr)}…`;
        children.push(tldr);
      }
      t.replaceChildren(...children);
      t.hidden = false;
      requestAnimationFrame(() => {
        t.classList.add("show");
        position(t, e);
      });
    });
  }

  function hide() {
    currentSlug = null;
    if (tooltip) {
      tooltip.classList.remove("show");
      tooltip.hidden = true;
    }
  }

  document.addEventListener("mouseover", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href");
    const m = href.match(/\/papers\/([^/]+)\/$/);
    if (!m) return;
    if (a.closest(".note-content h1, h1, .breadcrumbs")) return;
    const slug = m[1];
    if (slug === currentSlug) return;
    currentSlug = slug;
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(slug, e), 280);
  });

  document.addEventListener("mouseout", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    clearTimeout(showTimer);
    hide();
  });

  document.addEventListener("mousemove", (e) => {
    if (tooltip && !tooltip.hidden) position(tooltip, e);
  }, { passive: true });
})();
