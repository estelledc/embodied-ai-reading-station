// 阅读进度追踪 — localStorage based, 完全前端
(function () {
  const KEY = "eaireading.read";
  const TS_KEY = "eaireading.readts";

  function load() {
    try { return new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); }
    catch { return new Set(); }
  }
  function save(set) {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  }
  function loadTs() {
    try { return JSON.parse(localStorage.getItem(TS_KEY) || "{}"); }
    catch { return {}; }
  }
  function saveTs(o) {
    localStorage.setItem(TS_KEY, JSON.stringify(o));
  }

  window.EAI_READ = {
    has(slug) { return load().has(slug); },
    list() { return [...load()]; },
    count() { return load().size; },
    mark(slug) {
      const s = load(); s.add(slug); save(s);
      const t = loadTs(); t[slug] = Date.now(); saveTs(t);
      this._notify();
    },
    unmark(slug) {
      const s = load(); s.delete(slug); save(s);
      const t = loadTs(); delete t[slug]; saveTs(t);
      this._notify();
    },
    toggle(slug) {
      this.has(slug) ? this.unmark(slug) : this.mark(slug);
    },
    _notify() {
      window.dispatchEvent(new CustomEvent("eai:read-changed", {
        detail: { count: this.count(), list: this.list() }
      }));
    },
  };

  function bindButton(btn) {
    const slug = btn.dataset.slug;
    if (!slug) return;
    function render() {
      const isRead = window.EAI_READ.has(slug);
      btn.classList.toggle("is-read", isRead);
      btn.textContent = isRead ? "✓ 已读" : "标记已读";
      btn.setAttribute("aria-pressed", isRead ? "true" : "false");
    }
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      window.EAI_READ.toggle(slug);
      render();
    });
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function bindCards() {
    document.querySelectorAll("[data-slug]").forEach(card => {
      const slug = card.dataset.slug;
      if (!slug || card.tagName === "BUTTON") return;
      function render() {
        card.classList.toggle("eai-card-read", window.EAI_READ.has(slug));
      }
      render();
      window.addEventListener("eai:read-changed", render);
    });
  }

  function bindStats() {
    const el = document.querySelector("[data-eai-read-count]");
    if (!el) return;
    function render() {
      const n = window.EAI_READ.count();
      el.textContent = n;
      const root = el.closest(".stat-cell");
      if (root) root.style.opacity = n > 0 ? "1" : "0.55";
    }
    render();
    window.addEventListener("eai:read-changed", render);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".read-btn[data-slug]").forEach(bindButton);
    bindCards();
    bindStats();
  });
})();
