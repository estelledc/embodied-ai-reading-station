// Accessible disclosure behavior for the masthead's secondary navigation.
(() => {
  const controllers = [...document.querySelectorAll("[data-more-nav]")]
    .map((root) => {
      const trigger = root.querySelector(".more-nav-trigger[aria-controls]");
      if (!trigger) return null;
      const panel = document.getElementById(trigger.getAttribute("aria-controls"));
      if (!panel || !root.contains(panel)) return null;

      const setOpen = (open) => {
        trigger.setAttribute("aria-expanded", open ? "true" : "false");
        panel.hidden = !open;
        root.classList.toggle("is-open", open);
      };
      const close = ({ restoreFocus = false } = {}) => {
        if (panel.hidden) return;
        setOpen(false);
        if (restoreFocus) trigger.focus();
      };

      setOpen(false);
      trigger.addEventListener("click", () => setOpen(panel.hidden));
      root.addEventListener("keydown", (event) => {
        if (event.key !== "Escape" || panel.hidden) return;
        event.preventDefault();
        event.stopPropagation();
        close({ restoreFocus: true });
      });
      return { root, panel, close };
    })
    .filter(Boolean);

  if (controllers.length === 0) return;
  document.addEventListener("click", (event) => {
    for (const controller of controllers) {
      if (!controller.root.contains(event.target)) {
        controller.close({
          restoreFocus: controller.panel.contains(document.activeElement),
        });
      }
    }
  });
  document.addEventListener("focusin", (event) => {
    for (const controller of controllers) {
      if (!controller.root.contains(event.target)) controller.close();
    }
  });
  window.addEventListener("pageshow", () => {
    for (const controller of controllers) {
      controller.close({
        restoreFocus: controller.panel.contains(document.activeElement),
      });
    }
  });
})();
