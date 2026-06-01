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

  function dayKey(ts) {
    const d = new Date(ts);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function computeStreak() {
    const ts = loadTs();
    const days = new Set(Object.values(ts).map(dayKey));
    if (days.size === 0) return { streak: 0, week: 0, month: 0, today: 0 };
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      if (days.has(dayKey(d))) streak++;
      else if (i === 0) continue; // today not yet read is OK, streak still counts from yesterday
      else break;
    }
    const weekAgo = today.getTime() - 7 * 86400000;
    const monthAgo = today.getTime() - 30 * 86400000;
    const todayKey = dayKey(today);
    let week = 0, month = 0, todayCount = 0;
    for (const t of Object.values(ts)) {
      if (t >= weekAgo) week++;
      if (t >= monthAgo) month++;
      if (dayKey(t) === todayKey) todayCount++;
    }
    return { streak, week, month, today: todayCount };
  }

  window.EAI_READ = {
    has(slug) { return load().has(slug); },
    list() { return [...load()]; },
    count() { return load().size; },
    streak() { return computeStreak(); },
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
    if (el) {
      const root = el.closest(".stat-cell");
      const renderCount = () => {
        const n = window.EAI_READ.count();
        el.textContent = n;
        if (root) root.style.opacity = n > 0 ? "1" : "0.55";
      };
      renderCount();
      window.addEventListener("eai:read-changed", renderCount);
    }

    const exportBtn = document.getElementById("eai-streak-export");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const data = document.getElementById("eai-papers-data");
        if (!data) return;
        let papers = [];
        try { papers = JSON.parse(data.textContent); } catch { return; }
        const read = load();
        const ts = loadTs();
        const readPapers = papers.filter(p => read.has(p.slug))
          .sort((a, b) => (ts[b.slug] || 0) - (ts[a.slug] || 0));
        const today = new Date().toISOString().slice(0, 10);
        let md = `# 我的具身 AI 论文阅读清单\n\n`;
        md += `> Exported from Embodied AI Reading Station · ${today}\n`;
        md += `> 已读 ${readPapers.length} 篇 / 共 ${papers.length} 篇\n\n`;
        const byTopic = new Map();
        for (const p of readPapers) {
          if (!byTopic.has(p.topic)) byTopic.set(p.topic, []);
          byTopic.get(p.topic).push(p);
        }
        for (const [topic, ps] of byTopic) {
          md += `## ${topic}\n\n`;
          for (const p of ps) {
            const date = ts[p.slug] ? new Date(ts[p.slug]).toISOString().slice(0, 10) : "";
            md += `- [№ ${String(p.num).padStart(2, "0")} · ${p.title}](https://estelledc.github.io/embodied-ai-reading-station${p.url}) — ${p.tldr || ""}${date ? ` *(读于 ${date})*` : ""}\n`;
          }
          md += "\n";
        }
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `eai-reading-list-${today}.md`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    const streakBox = document.getElementById("eai-streak-box");
    if (streakBox) {
      const renderStreak = () => {
        const s = window.EAI_READ.streak();
        const total = window.EAI_READ.count();
        if (total === 0) {
          streakBox.hidden = true;
          return;
        }
        streakBox.hidden = false;
        streakBox.querySelector("[data-streak-days]").textContent = s.streak;
        streakBox.querySelector("[data-streak-today]").textContent = s.today;
        streakBox.querySelector("[data-streak-week]").textContent = s.week;
        streakBox.querySelector("[data-streak-month]").textContent = s.month;
        const flame = streakBox.querySelector(".streak-flame");
        if (flame) {
          flame.textContent = s.streak >= 7 ? "🔥🔥🔥" : s.streak >= 3 ? "🔥🔥" : s.streak >= 1 ? "🔥" : "·";
        }
      };
      renderStreak();
      window.addEventListener("eai:read-changed", renderStreak);
    }
  }

  function bindNextPick() {
    const aside = document.getElementById("eai-next-pick");
    const data = document.getElementById("eai-papers-data");
    if (!aside || !data) return;
    let papers = [];
    try { papers = JSON.parse(data.textContent); } catch { return; }

    function render() {
      const read = load();
      const unread = papers.filter(p => !read.has(p.slug));
      if (unread.length === 0) {
        aside.hidden = true;
        return;
      }
      // 推荐策略：
      // 1) 优先推同主题序列（已读最多的主题里挑下一篇）
      // 2) 否则按 era + difficulty 升序挑入门 (founder, 难度低)
      // 3) 全新读者 → 推荐 CLIP（vlm-foundation 起点）
      let pick = null;
      let reason = "";
      if (read.size === 0) {
        pick = unread.find(p => p.slug === "clip") || unread.find(p => p.era === "founder") || unread[0];
        reason = "从这里开始入门";
      } else {
        const byTopic = new Map();
        for (const p of papers) {
          if (!read.has(p.slug)) continue;
          byTopic.set(p.topic, (byTopic.get(p.topic) || 0) + 1);
        }
        const topicsByCount = [...byTopic.entries()].sort((a, b) => b[1] - a[1]);
        for (const [topic] of topicsByCount) {
          const candidates = unread.filter(p => p.topic === topic);
          if (candidates.length) {
            const eraOrder = { founder: 0, classic: 1, frontier: 2 };
            candidates.sort((a, b) => (eraOrder[a.era] ?? 1) - (eraOrder[b.era] ?? 1));
            pick = candidates[0];
            reason = `继续 · ${topic}`;
            break;
          }
        }
        if (!pick) {
          pick = unread.sort((a, b) => {
            const eraOrder = { founder: 0, classic: 1, frontier: 2 };
            const ea = (eraOrder[a.era] ?? 1) - (eraOrder[b.era] ?? 1);
            return ea !== 0 ? ea : a.difficulty - b.difficulty;
          })[0];
          reason = "新主题 · 入门难度";
        }
      }

      const link = aside.querySelector(".next-pick-card");
      link.href = pick.url;
      aside.querySelector(".next-pick-num").textContent = `№ ${String(pick.num).padStart(2, "0")}`;
      aside.querySelector(".next-pick-topic").textContent = pick.topic;
      aside.querySelector(".next-pick-title").textContent = pick.title;
      aside.querySelector(".next-pick-tldr").textContent = pick.tldr || "";
      aside.querySelector(".next-pick-difficulty").textContent = "★".repeat(Math.max(1, pick.difficulty));
      aside.querySelector(".next-pick-reason").textContent = reason;
      aside.hidden = false;
    }
    render();
    window.addEventListener("eai:read-changed", render);
  }

  function bindAutoMarkOnScroll() {
    // 在论文页：当 endmark ◼ 进入视口时自动标记已读（如果还没）
    const endmark = document.querySelector(".note-content .endmark");
    if (!endmark) return;
    const btn = document.querySelector(".read-btn[data-slug]");
    if (!btn) return;
    const slug = btn.dataset.slug;
    if (!slug || window.EAI_READ.has(slug)) return;
    let triggered = false;
    const obs = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting && !triggered) {
          triggered = true;
          window.EAI_READ.mark(slug);
          // 显示一个轻量 toast
          const toast = document.createElement("div");
          toast.className = "auto-mark-toast";
          toast.innerHTML = `✓ 已自动标记为已读 <button type="button" aria-label="撤销">撤销</button>`;
          document.body.appendChild(toast);
          requestAnimationFrame(() => toast.classList.add("show"));
          const undoBtn = toast.querySelector("button");
          undoBtn.addEventListener("click", () => {
            window.EAI_READ.unmark(slug);
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
          });
          setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
          }, 5000);
          obs.disconnect();
        }
      }
    }, { threshold: 0.5 });
    obs.observe(endmark);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".read-btn[data-slug]").forEach(bindButton);
    bindCards();
    bindStats();
    bindNextPick();
    bindAutoMarkOnScroll();
  });
})();
