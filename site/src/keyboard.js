// 全局键盘快捷键 + ? 帮助弹窗
(function () {
  const BASE = (() => {
    // try to read site base from a known link prefix; fallback to ''
    const a = document.querySelector('link[rel="stylesheet"][href*="/styles.css"]');
    if (a) {
      const m = a.getAttribute("href").match(/^(.*)\/styles\.css$/);
      if (m) return m[1];
    }
    return "";
  })();

  const SHORTCUTS = [
    { keys: "?", desc: "显示这个帮助" },
    { keys: "g h", desc: "回首页" },
    { keys: "g t", desc: "去 Topics 主题列表" },
    { keys: "g l", desc: "去 Timeline 时间线" },
    { keys: "g c", desc: "去 Compare 对比页" },
    { keys: "g x", desc: "去 Graph 关系图" },
    { keys: "g g", desc: "去 Glossary 术语表" },
    { keys: "/", desc: "唤起站内搜索" },
    { keys: "j", desc: "下一篇论文（在论文页上）" },
    { keys: "k", desc: "上一篇论文（在论文页上）" },
    { keys: "m", desc: "切换'已读'（在论文页上）" },
    { keys: "Esc", desc: "关闭弹窗" },
  ];

  function buildHelp() {
    const dlg = document.createElement("dialog");
    dlg.className = "kb-help-dialog";
    dlg.innerHTML = `
      <button class="kb-close" aria-label="close">×</button>
      <div class="kb-eyebrow">Keyboard · 快捷键</div>
      <h2 class="kb-title">${SHORTCUTS.length} 个快捷键。</h2>
      <table class="kb-table">
        ${SHORTCUTS.map(s => `<tr><td class="kb-keys">${s.keys.split(" ").map(k => `<kbd>${k}</kbd>`).join(" ")}</td><td class="kb-desc">${s.desc}</td></tr>`).join("")}
      </table>
      <p class="kb-foot">在输入框/文本编辑器里时键盘快捷键不生效。</p>
    `;
    document.body.appendChild(dlg);
    dlg.querySelector(".kb-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    return dlg;
  }

  let helpDlg = null;
  function showHelp() {
    if (!helpDlg) helpDlg = buildHelp();
    if (helpDlg.open) helpDlg.close(); else helpDlg.showModal();
  }

  function isTyping() {
    const a = document.activeElement;
    if (!a) return false;
    const tag = a.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || a.isContentEditable;
  }

  function navigateRelative(delta) {
    // 在论文页：找 detail 里 All papers ol 的当前项，跳前/后
    const m = location.pathname.match(/\/papers\/([^/]+)\//);
    if (!m) return false;
    const cur = m[1];
    const items = [...document.querySelectorAll("details ol li a")];
    if (!items.length) return false;
    const idx = items.findIndex(a => a.getAttribute("href").includes(`/papers/${cur}/`));
    if (idx < 0) return false;
    const next = items[idx + delta];
    if (next) { location.href = next.href; return true; }
    return false;
  }

  function toggleRead() {
    const btn = document.querySelector(".read-btn[data-slug]");
    if (btn) btn.click();
  }

  function openSearch() {
    const trig = document.querySelector(".search-trigger");
    if (trig) trig.click();
  }

  let pending = null;
  let pendingTimeout = null;

  document.addEventListener("keydown", (e) => {
    if (isTyping()) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    // 待处理 leader：g
    if (pending === "g") {
      clearTimeout(pendingTimeout);
      pending = null;
      const map = { h: "/", t: "/topics/", l: "/timeline/", c: "/compare/", x: "/graph/", g: "/glossary/" };
      const dest = map[e.key.toLowerCase()];
      if (dest) {
        e.preventDefault();
        location.href = BASE + dest;
      }
      return;
    }

    if (e.key === "?") { e.preventDefault(); showHelp(); return; }
    if (e.key === "/") { e.preventDefault(); openSearch(); return; }
    if (e.key === "j") { if (navigateRelative(1)) e.preventDefault(); return; }
    if (e.key === "k") { if (navigateRelative(-1)) e.preventDefault(); return; }
    if (e.key === "m") { e.preventDefault(); toggleRead(); return; }
    if (e.key === "Escape") {
      if (helpDlg && helpDlg.open) helpDlg.close();
      return;
    }
    if (e.key === "g") {
      pending = "g";
      pendingTimeout = setTimeout(() => { pending = null; }, 800);
      return;
    }
  });
})();
