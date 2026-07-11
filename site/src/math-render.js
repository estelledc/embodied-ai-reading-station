// KaTeX auto-render bootstrap. Loaded after katex.min.js and auto-render.min.js.
(function () {
  if (typeof window.renderMathInElement !== "function") {
    console.error("[EAI math] KaTeX auto-render helper is unavailable.");
    return;
  }
  window.renderMathInElement(document.body, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "$", right: "$", display: false },
    ],
  });
})();
