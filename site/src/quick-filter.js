// 首页主题/难度/era 快筛 — 客户端 only，URL hash 同步
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("eai-quick-filter");
    if (!root) return;
    const cards = [...document.querySelectorAll(".paper-card[data-slug]")];
    const sections = [...document.querySelectorAll("[data-topic-section]")];
    const countEl = document.getElementById("eai-qf-count");

    const state = { topic: "", difficulty: "", era: "" };

    function applyHash() {
      const h = location.hash.replace(/^#/, "");
      if (!h) return;
      h.split("&").forEach(pair => {
        const [k, v] = pair.split("=");
        if (k in state) state[k] = decodeURIComponent(v || "");
      });
    }
    function writeHash() {
      const parts = Object.entries(state).filter(([_, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
      const newHash = parts.length ? "#" + parts.join("&") : "";
      if (location.hash !== newHash) {
        history.replaceState(null, "", location.pathname + location.search + newHash);
      }
    }

    function refresh() {
      let visible = 0;
      for (const c of cards) {
        const okTopic = !state.topic || c.dataset.topic === state.topic;
        const okDiff = !state.difficulty || Number(c.dataset.difficulty) === Number(state.difficulty);
        const okEra = !state.era || c.dataset.era === state.era;
        const show = okTopic && okDiff && okEra;
        c.style.display = show ? "" : "none";
        if (show) visible++;
      }
      // hide entire section if no visible cards
      for (const s of sections) {
        const visibleCards = s.querySelectorAll(".paper-card:not([style*='display: none'])");
        s.style.display = visibleCards.length ? "" : "none";
      }
      // chip active state
      root.querySelectorAll(".qf-chip").forEach(chip => {
        const t = chip.dataset.filterType;
        const v = chip.dataset.value;
        const isActive = state[t] === v;
        chip.classList.toggle("is-active", isActive);
      });
      // count
      if (countEl) {
        const total = cards.length;
        countEl.textContent = visible === total ? `全部 ${total} 篇` : `${visible} / ${total} 篇`;
      }
      writeHash();
    }

    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".qf-chip");
      if (!chip) return;
      const t = chip.dataset.filterType;
      const v = chip.dataset.value;
      // 点击已激活的"全部"无效；点击其他 chip 切换；再点同 chip 取消
      if (state[t] === v && v !== "") state[t] = "";
      else state[t] = v;
      refresh();
    });

    applyHash();
    refresh();
    window.addEventListener("hashchange", () => { applyHash(); refresh(); });
  });
})();
