// Click-to-fullscreen + zoom/pan viewer for every .asset (image or
// video) on the page. Images use their `data-full` attribute for the
// full-resolution source when a smaller thumbnail is shown inline;
// falls back to the element's own src if no data-full is set.
(function () {
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  overlay.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><div class="lightbox-stage"></div>';
  document.body.appendChild(overlay);

  const stage = overlay.querySelector(".lightbox-stage");
  const closeBtn = overlay.querySelector(".lightbox-close");

  let scale = 1;
  let originX = 0;
  let originY = 0;
  let panX = 0;
  let panY = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  function applyTransform(el) {
    el.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
  }

  function close() {
    overlay.classList.remove("is-open");
    stage.innerHTML = "";
    resetZoom();
    document.body.style.overflow = "";
  }

  function open(sourceEl) {
    stage.innerHTML = "";
    resetZoom();

    let el;
    if (sourceEl.tagName === "VIDEO") {
      el = document.createElement("video");
      el.src = sourceEl.currentSrc || sourceEl.src;
      el.autoplay = true;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.controls = false;
    } else {
      el = document.createElement("img");
      el.src = sourceEl.dataset.full || sourceEl.src;
      el.alt = sourceEl.alt || "";
    }
    el.className = "lightbox-media";

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (scale === 1) {
        scale = 2.5;
      } else {
        resetZoom();
      }
      applyTransform(el);
    });

    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      scale = Math.min(5, Math.max(1, scale + delta));
      if (scale === 1) { panX = 0; panY = 0; }
      applyTransform(el);
    }, { passive: false });

    el.addEventListener("mousedown", (e) => {
      if (scale === 1) return;
      dragging = true;
      dragStartX = e.clientX - panX;
      dragStartY = e.clientY - panY;
      el.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      panX = e.clientX - dragStartX;
      panY = e.clientY - dragStartY;
      applyTransform(el);
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      el.style.cursor = "";
    });

    stage.appendChild(el);
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  document.querySelectorAll(".asset").forEach((asset) => {
    asset.style.cursor = "zoom-in";
    asset.addEventListener("click", () => open(asset));
  });

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
  });
})();
