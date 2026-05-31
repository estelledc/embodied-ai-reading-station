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
