// 注册 service worker，并把版本切换留给用户主动确认。
(function () {
  if (!("serviceWorker" in navigator)) return;

  const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (location.protocol !== "https:" && !localHosts.has(location.hostname)) return;

  function assetBase(assetUrl, filename) {
    if (!assetUrl) return null;
    try {
      const parsed = new URL(assetUrl, location.href);
      if (parsed.origin !== location.origin) return null;
      const suffix = "/" + filename;
      if (!parsed.pathname.endsWith(suffix)) return null;
      return parsed.pathname.slice(0, -suffix.length).replace(/\/$/, "");
    } catch {
      return null;
    }
  }

  // currentScript 仅在脚本执行期间可靠，因此必须在 load 回调之前冻结 base。
  const currentScript = document.currentScript;
  const scriptSrc = currentScript && (
    currentScript.src ||
    (typeof currentScript.getAttribute === "function" && currentScript.getAttribute("src"))
  );
  let base = assetBase(scriptSrc, "sw-register.js");
  if (base === null) {
    const stylesLink = document.querySelector('link[href*="styles.css"]');
    const stylesHref = stylesLink && (
      stylesLink.href ||
      (typeof stylesLink.getAttribute === "function" && stylesLink.getAttribute("href"))
    );
    base = assetBase(stylesHref, "styles.css") || "";
  }

  window.addEventListener("load", () => {
    let registration;
    let promptShown = false;
    let updateAccepted = false;
    let reloadRequested = false;

    const warn = error => console.warn("SW register failed:", error);

    function showUpdatePrompt() {
      if (promptShown || !navigator.serviceWorker.controller) return;
      promptShown = true;

      const toast = document.createElement("div");
      toast.className = "auto-mark-toast show";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");

      const message = document.createElement("span");
      message.textContent = "发现新版本，可立即更新。";

      const updateButton = document.createElement("button");
      updateButton.type = "button";
      updateButton.textContent = "立即更新";
      updateButton.addEventListener("click", () => {
        if (updateAccepted) return;
        const waiting = registration && registration.waiting;
        if (!waiting || typeof waiting.postMessage !== "function") {
          console.warn("SW update failed: waiting worker unavailable");
          return;
        }
        updateAccepted = true;
        updateButton.disabled = true;
        waiting.postMessage({ type: "SKIP_WAITING" });
      });

      toast.append(message, updateButton);
      document.body.appendChild(toast);
    }

    function watchInstalling(worker) {
      if (!worker || typeof worker.addEventListener !== "function") return;
      const onStateChange = () => {
        if (worker.state === "installed") showUpdatePrompt();
      };
      worker.addEventListener("statechange", onStateChange);
      onStateChange();
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!updateAccepted || reloadRequested) return;
      reloadRequested = true;
      location.reload();
    });

    try {
      navigator.serviceWorker.register(base + "/sw.js", { scope: base + "/" })
        .then(result => {
          registration = result;
          if (registration.waiting) showUpdatePrompt();
          if (registration.installing) watchInstalling(registration.installing);
          registration.addEventListener("updatefound", () => {
            watchInstalling(registration.installing);
          });
        })
        .catch(warn);
    } catch (error) {
      warn(error);
    }
  });
})();
