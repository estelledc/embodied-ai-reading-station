// Pagefind search dialog — "/" 唤起，esc 关闭
(() => {
  const dialog = document.querySelector(".search-dialog");
  const trigger = document.querySelector(".search-trigger");
  const container = document.querySelector(".search-container");
  if (!dialog || !trigger || !container) return;

  const base = container.dataset.base || "";
  let initialized = false;

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
    setTimeout(() => {
      const input = container.querySelector("input");
      if (input) input.focus();
    }, 50);
  }

  trigger.addEventListener("click", open);

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
