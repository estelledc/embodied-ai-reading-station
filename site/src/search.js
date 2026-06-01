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
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
  }
  function pushHistory(q) {
    if (!q || q.length < 2) return;
    const cur = loadHistory().filter(x => x.q !== q);
    cur.unshift({ q, t: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, 5)));
  }
  function renderHistory() {
    const wrap = document.querySelector(".search-history");
    if (!wrap) return;
    const items = loadHistory();
    if (!items.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    wrap.innerHTML = `<div class="sh-eyebrow">最近搜过</div><ul>${items.map(i =>
      `<li><button type="button" data-q="${i.q.replace(/"/g, "&quot;")}">${i.q}</button></li>`
    ).join("")}</ul>`;
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
