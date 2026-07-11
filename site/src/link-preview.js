// hover 内部 /papers/<slug>/ 链接 → 显示 tldr 预览卡片
// 数据源：经共享 data-api.js 读取 /data/v2/papers.json（一次缓存）
(function () {
  let data = null;
  let dataPromise = null;
  let dataError = null;

  function reportDataFailure(error, endpoint) {
    const fallback = {
      consumer: "link-preview",
      code: error?.code || "DATA_API_UNKNOWN",
      message: error?.message || "论文预览数据加载失败。",
      endpoint: error?.endpoint || endpoint,
      status: Number.isInteger(error?.status) ? error.status : null,
    };
    if (window.EAI_DATA_API?.reportError) {
      dataError = window.EAI_DATA_API.reportError(error, { consumer: "link-preview" });
    } else {
      dataError = fallback;
      console.error(`[EAI data API] link-preview ${dataError.code}: ${dataError.message}`);
      window.dispatchEvent(new CustomEvent("eai:data-error", { detail: dataError }));
    }
    return dataError;
  }

  function loadData() {
    if (data) return Promise.resolve(data);
    if (dataPromise) return dataPromise;
    const stylesLink = document.querySelector('link[href*="/styles.css"]');
    const base = stylesLink ? stylesLink.getAttribute("href").replace(/\/styles\.css$/, "") : "";
    const endpoint = `${base}/data/v2/papers.json`;
    const api = window.EAI_DATA_API;
    const request = api?.loadPapers
      ? api.loadPapers({ base })
      : Promise.reject(Object.assign(new Error("共享浏览器 Data API 适配器未加载。"), {
          code: "DATA_API_ADAPTER_MISSING",
          endpoint,
        }));
    dataPromise = request
      .then(d => {
        const idx = new Map();
        for (const p of d) idx.set(p.slug, p);
        data = idx;
        return idx;
      })
      .catch(error => {
        reportDataFailure(error, endpoint);
        throw error;
      });
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

  function showUnavailable(e) {
    const detail = dataError || {
      code: "DATA_API_UNKNOWN",
      message: "论文预览数据加载失败。",
    };
    const t = ensureTooltip();
    const meta = document.createElement("div");
    meta.className = "lp-meta";
    meta.textContent = `数据错误 · ${String(detail.code)}`;
    const title = document.createElement("div");
    title.className = "lp-title";
    title.textContent = "论文预览暂不可用";
    const message = document.createElement("div");
    message.className = "lp-tldr";
    message.textContent = String(detail.message);
    t.replaceChildren(meta, title, message);
    t.hidden = false;
    requestAnimationFrame(() => {
      t.classList.add("show");
      position(t, e);
    });
  }

  function show(slug, e) {
    loadData()
      .then(idx => {
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
      })
      .catch(() => {
        if (currentSlug === slug) showUnavailable(e);
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
