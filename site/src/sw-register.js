// 注册 service worker（仅 https 或 localhost）
(function () {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost") return;
  window.addEventListener("load", () => {
    // 计算 base path（GitHub Pages /repo-name/）
    const stylesLink = document.querySelector('link[href*="/styles.css"]');
    const base = stylesLink ? stylesLink.getAttribute("href").replace(/\/styles\.css$/, "") : "";
    const swPath = base + "/sw.js";
    navigator.serviceWorker.register(swPath, { scope: base + "/" })
      .catch(err => console.warn("SW register failed:", err));
  });
})();
