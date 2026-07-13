(() => {
  const deck = document.getElementById("deck");
  const track = document.getElementById("track");
  const slides = [...track.querySelectorAll(".slide")];
  const dotsBox = document.getElementById("dots");
  let idx = 0;

  // build dots
  slides.forEach((_, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `slide ${i + 1}`);
    button.addEventListener("click", event => goTo(i, event.detail === 0));
    dotsBox.appendChild(button);
  });

  function goTo(i, instant = false) {
    track.classList.toggle("is-instant", instant);
    if (instant) void track.offsetWidth;
    idx = Math.max(0, Math.min(slides.length - 1, i));
    track.style.transform = `translateX(-${idx * 100}%)`;
    [...dotsBox.children].forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", dotIndex === idx ? "true" : "false");
    });
    if (instant) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => track.classList.remove("is-instant"));
      });
    }
  }

  // keyboard
  document.addEventListener("keydown", event => {
    const interactiveTarget = event.target?.closest?.(
      "button, a, input, select, textarea, summary, [contenteditable]:not([contenteditable=\"false\"])"
    );
    if (event.key === " " && interactiveTarget) return;
    if (deck.classList.contains("overview") && event.key !== "Escape") return;
    if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      goTo(idx + 1, true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(idx - 1, true);
    } else if (event.key === "Home") {
      goTo(0, true);
    } else if (event.key === "End") {
      goTo(slides.length - 1, true);
    } else if (event.key === "Escape") {
      deck.classList.toggle("overview");
    }
  });

  // wheel
  let wheelLock = false;
  document.addEventListener("wheel", event => {
    if (deck.classList.contains("overview") || wheelLock) return;
    if (Math.abs(event.deltaX) + Math.abs(event.deltaY) < 40) return;
    wheelLock = true;
    setTimeout(() => { wheelLock = false; }, 300);
    if (event.deltaX > 0 || event.deltaY > 0) goTo(idx + 1);
    else goTo(idx - 1);
  }, { passive: true });

  // touch
  let touchX = 0;
  document.addEventListener("touchstart", event => {
    touchX = event.touches[0].clientX;
  }, { passive: true });
  document.addEventListener("touchend", event => {
    const deltaX = event.changedTouches[0].clientX - touchX;
    if (Math.abs(deltaX) < 50) return;
    goTo(idx + (deltaX < 0 ? 1 : -1));
  }, { passive: true });

  // overview click
  slides.forEach((slide, i) => slide.addEventListener("click", () => {
    if (deck.classList.contains("overview")) {
      deck.classList.remove("overview");
      goTo(i);
    }
  }));

  // viewport scaling
  function fit() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scale = Math.min(viewportWidth / 1280, viewportHeight / 720);
    deck.style.transform = `scale(${scale})`;
    deck.style.transformOrigin = "center center";
  }
  window.addEventListener("resize", fit);
  fit();

  goTo(0, true);
})();
