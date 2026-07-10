// Pagefind search dialog — "/" 唤起，esc 关闭
(() => {
  const dialog = document.querySelector(".search-dialog");
  const trigger = document.querySelector(".search-trigger");
  const container = document.querySelector(".search-container");
  if (!dialog || !trigger || !container) return;

  const base = container.dataset.base || "";
  let initialized = false;

  // 搜索历史
  const HISTORY_KEY = "eaireading.searches";
  const MAX_HISTORY_QUERY_LENGTH = 200;
  const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

  function normalizeHistoryQuery(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (trimmed.length < 2 || CONTROL_CHAR_RE.test(trimmed)) return null;
    return [...trimmed].slice(0, MAX_HISTORY_QUERY_LENGTH).join("");
  }

  function loadHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.flatMap(item => {
        const q = normalizeHistoryQuery(item?.q);
        return q ? [{ q, t: Number.isFinite(item?.t) ? item.t : 0 }] : [];
      }).slice(0, 5);
    }
    catch { return []; }
  }
  function pushHistory(q) {
    const normalized = normalizeHistoryQuery(q);
    if (!normalized) return;
    const cur = loadHistory().filter(x => x.q !== normalized);
    cur.unshift({ q: normalized, t: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, 5)));
  }
  function renderHistory() {
    const wrap = document.querySelector(".search-history");
    if (!wrap) return;
    const items = loadHistory();
    wrap.replaceChildren();
    if (!items.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const eyebrow = document.createElement("div");
    eyebrow.className = "sh-eyebrow";
    eyebrow.textContent = "最近搜过";
    const list = document.createElement("ul");
    for (const item of items) {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.q = item.q;
      button.textContent = item.q;
      row.appendChild(button);
      list.appendChild(row);
    }
    wrap.append(eyebrow, list);
    wrap.querySelectorAll("button[data-q]").forEach(b => {
      b.addEventListener("click", () => {
        const input = container.querySelector("input");
        if (input) {
          input.value = b.dataset.q;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      });
    });
  }
  // 监听 input 变化记历史
  function watchInput() {
    const input = container.querySelector("input");
    if (!input) return;
    let timer = null;
    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (input.value && input.value.length >= 3) pushHistory(input.value.trim());
      }, 1500);
    });
  }

  function open() {
    if (!initialized) {
      // PagefindUI loaded after defer
      if (typeof PagefindUI === "undefined") {
        setTimeout(open, 100);
        return;
      }
      new PagefindUI({
        element: container,
        bundlePath: base + "/pagefind/",
        showImages: false,
        showSubResults: true,
        excerptLength: 28,
        translations: {
          placeholder: "搜笔记 · search notes",
          clear_search: "清空",
          load_more: "加载更多",
          search_label: "站内搜索",
          filters_label: "筛选",
          zero_results: "找不到 [SEARCH_TERM]",
          many_results: "找到 [COUNT] 条结果，[SEARCH_TERM]",
          one_result: "找到 [COUNT] 条结果，[SEARCH_TERM]",
          alt_search: "试试 [DIFFERENT_TERM]",
          search_suggestion: "或许试试：",
          searching: "搜索 [SEARCH_TERM] 中…",
        },
      });
      initialized = true;
    }
    dialog.showModal();
    renderHistory();
    setTimeout(() => {
      const input = container.querySelector("input");
      if (input) input.focus();
      watchInput();
    }, 50);
  }

  trigger.addEventListener("click", open);

  // ?q= URL param auto-open + 预填 (OpenSearch 来的)
  const params = new URLSearchParams(location.search);
  const q = params.get("q");
  if (q) {
    setTimeout(() => {
      open();
      setTimeout(() => {
        const input = container.querySelector("input");
        if (input) {
          input.value = q;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, 200);
    }, 100);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      e.preventDefault();
      open();
    } else if (e.key === "Escape" && dialog.open) {
      dialog.close();
    }
  });

  // 点击背景关闭
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
})();
