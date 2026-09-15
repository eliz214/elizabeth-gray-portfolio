// Drives the asymmetric hover animation on .hyperlink elements:
// slides in from the right on hover, slides out to the LEFT on
// mouse-out (not just a reverse of the entrance). If the mouse
// leaves before the entrance finishes, the entrance is allowed to
// complete before the exit starts.
document.querySelectorAll(".hyperlink").forEach((link) => {
  let state = "idle"; // idle -> entering -> visible -> exiting -> idle
  let pendingExit = false;

  function onEnterEnd(e) {
    if (e.target !== link || e.propertyName !== "transform") return;
    link.removeEventListener("transitionend", onEnterEnd);
    state = "visible";
    if (pendingExit) {
      pendingExit = false;
      startExit();
    }
  }

  function startExit() {
    state = "exiting";
    link.classList.remove("is-visible");
    link.classList.add("is-exiting");
    link.addEventListener("transitionend", onExitEnd);
  }

  function onExitEnd(e) {
    if (e.target !== link || e.propertyName !== "transform") return;
    link.removeEventListener("transitionend", onExitEnd);
    // Snap back to the off-right resting position with no transition,
    // then re-enable transitions on the next frame.
    link.classList.add("no-transition");
    link.classList.remove("is-exiting");
    void link.offsetWidth;
    link.classList.remove("no-transition");
    state = "idle";
  }

  link.addEventListener("mouseenter", () => {
    if (state === "idle") {
      state = "entering";
      link.classList.add("is-visible");
      link.addEventListener("transitionend", onEnterEnd);
    } else if (state === "exiting") {
      pendingExit = false;
    }
  });

  link.addEventListener("mouseleave", () => {
    if (state === "entering") {
      pendingExit = true;
    } else if (state === "visible") {
      startExit();
    }
  });
});
