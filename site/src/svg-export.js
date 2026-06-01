// 给页面里的 svg 加'下载 PNG'按钮
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // 选可导出的 svg：heatmap / topic-timeline 等
    const targets = document.querySelectorAll(".topic-timeline, #graph-svg, main svg");
    if (targets.length === 0) return;

    targets.forEach(svg => {
      // 只给 viewBox 的 svg（保证可缩放）
      if (!svg.getAttribute("viewBox")) return;
      // 找到合适的容器（svg 父元素）
      const wrap = svg.closest(".topic-timeline-wrap, #graph-container, .shell, main") || svg.parentElement;
      if (!wrap) return;
      // 已经有按钮就跳过
      if (wrap.querySelector(".svg-export-btn")) return;

      const btn = document.createElement("button");
      btn.className = "svg-export-btn";
      btn.textContent = "↓ PNG";
      btn.type = "button";
      btn.title = "下载为 PNG";
      btn.addEventListener("click", () => exportSvg(svg));
      // 浮在 svg 角上
      btn.style.position = "absolute";
      btn.style.top = "0.5rem";
      btn.style.right = "0.5rem";
      btn.style.zIndex = "5";
      const wrapStyle = getComputedStyle(wrap);
      if (wrapStyle.position === "static") wrap.style.position = "relative";
      wrap.appendChild(btn);
    });

    function exportSvg(svg) {
      const vb = svg.getAttribute("viewBox").split(/\s+|,/).map(Number);
      const [, , vbW, vbH] = vb;
      const scale = 2; // 2× retina
      const W = Math.round(vbW * scale);
      const H = Math.round(vbH * scale);

      // 内联当前 CSS variable 实际值到 svg 副本（avoid 黑底）
      const styles = getComputedStyle(document.documentElement);
      const tokens = ["--paper", "--paper-warm", "--paper-dark", "--bone", "--ink", "--ink-soft", "--ink-mute", "--ink-faint", "--coral", "--mustard", "--olive"];
      const styleBlock = tokens.map(t => `${t}: ${styles.getPropertyValue(t)};`).join(" ");

      const clone = svg.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute("style", styleBlock);
      const xml = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([`<?xml version="1.0"?>${xml}`], { type: "image/svg+xml" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d");
        // 暖纸底
        ctx.fillStyle = styles.getPropertyValue("--paper") || "#efe7d2";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        canvas.toBlob(blob => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `eai-${location.pathname.split("/").filter(Boolean).pop() || "chart"}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, "image/png");
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        console.warn("SVG export failed");
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  });
})();
