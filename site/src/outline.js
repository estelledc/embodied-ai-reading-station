// 长文笔记右栏 sticky outline — IntersectionObserver 高亮当前章节
(() => {
  const outline = document.querySelector(".outline");
  if (!outline) return;

  const links = outline.querySelectorAll("a[href^='#']");
  if (links.length === 0) return;

  const idToLink = new Map();
  for (const a of links) idToLink.set(a.getAttribute("href").slice(1), a);

  const headings = [];
  for (const id of idToLink.keys()) {
    const el = document.getElementById(id);
    if (el) headings.push(el);
  }
  if (headings.length === 0) return;

  let active = null;
  function setActive(id) {
    if (active === id) return;
    if (active && idToLink.has(active)) idToLink.get(active).classList.remove("active");
    active = id;
    if (id && idToLink.has(id)) idToLink.get(id).classList.add("active");
  }

  const obs = new IntersectionObserver((entries) => {
    // 找最靠上的那个 intersecting heading
    const visible = entries
      .filter((e) => e.isIntersecting)
      .map((e) => ({ id: e.target.id, top: e.boundingClientRect.top }))
      .sort((a, b) => a.top - b.top);
    if (visible.length > 0) setActive(visible[0].id);
  }, {
    rootMargin: "-15% 0px -70% 0px",
    threshold: 0,
  });

  for (const h of headings) obs.observe(h);
})();

// === heading anchor copy: hover h2/h3 显示 #，点击复制 deep link ===
(() => {
  const content = document.querySelector(".note-content");
  if (!content) return;
  const headings = content.querySelectorAll("h2[id], h3[id]");
  for (const h of headings) {
    const link = document.createElement("a");
    link.className = "heading-anchor";
    link.href = "#" + h.id;
    link.setAttribute("aria-label", "复制链接");
    link.textContent = "#";
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      const deepLink = location.origin + location.pathname + "#" + h.id;
      try {
        await navigator.clipboard.writeText(deepLink);
        link.classList.add("copied");
        link.textContent = "✓";
        history.replaceState(null, "", "#" + h.id);
        setTimeout(() => {
          link.classList.remove("copied");
          link.textContent = "#";
        }, 1200);
      } catch {
        // fallback: 直接跳转
        location.hash = h.id;
      }
    });
    h.appendChild(link);
  }
})();

// === scroll progress bar：仅在论文页 ===
(() => {
  if (!document.querySelector(".note-content")) return;
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.appendChild(bar);
  let raf = null;
  function update() {
    raf = null;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (max <= 0) { bar.style.transform = "scaleX(0)"; return; }
    const pct = Math.min(1, Math.max(0, h.scrollTop / max));
    bar.style.transform = `scaleX(${pct})`;
  }
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
