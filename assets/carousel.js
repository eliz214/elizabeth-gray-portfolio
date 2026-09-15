// Click-through slideshow for step-by-step content (e.g. a
// presentation deck exported as sequential slide images).
document.querySelectorAll(".carousel").forEach((carousel) => {
  const slides = [...carousel.querySelectorAll(".carousel-slide")];
  const counter = carousel.querySelector(".carousel-counter");
  const prevBtn = carousel.querySelector(".carousel-prev");
  const nextBtn = carousel.querySelector(".carousel-next");
  let index = 0;

  function update() {
    slides.forEach((s, i) => s.classList.toggle("is-active", i === index));
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  }

  prevBtn?.addEventListener("click", () => {
    index = (index - 1 + slides.length) % slides.length;
    update();
  });

  nextBtn?.addEventListener("click", () => {
    index = (index + 1) % slides.length;
    update();
  });

  update();
});
