// 主题切换：light / dark / system
(function () {
  const KEY = "eaireading.theme";
  const html = document.documentElement;

  function apply(mode) {
    html.classList.remove("light-theme", "dark-theme");
    if (mode === "light") html.classList.add("light-theme");
    else if (mode === "dark") html.classList.add("dark-theme");
    // mode === "system" → 不加 class，跟随 prefers-color-scheme
  }

  function get() {
    return localStorage.getItem(KEY) || "system";
  }
  function set(mode) {
    if (mode === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, mode);
    apply(mode);
    updateBtn();
  }
  function cycle() {
    const cur = get();
    const next = cur === "system" ? "light" : cur === "light" ? "dark" : "system";
    set(next);
  }

  let btn = null;
  function updateBtn() {
    if (!btn) return;
    const mode = get();
    const label = mode === "light" ? "☀" : mode === "dark" ? "☾" : "⊙";
    const tip = mode === "light" ? "亮色" : mode === "dark" ? "暗色" : "跟随系统";
    btn.textContent = label;
    btn.setAttribute("title", `主题：${tip}（点击切换）`);
    btn.setAttribute("aria-label", `主题：${tip}`);
  }

  document.addEventListener("DOMContentLoaded", () => {
    apply(get());
    btn = document.createElement("button");
    btn.className = "theme-toggle";
    btn.type = "button";
    btn.addEventListener("click", cycle);
    const masthead = document.querySelector(".masthead");
    if (masthead) masthead.appendChild(btn);
    updateBtn();
  });

  // 立即应用以避免 flash（不等 DOMContentLoaded）
  apply(get());
})();
