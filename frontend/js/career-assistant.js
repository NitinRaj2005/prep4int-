// Career Assistant dashboard foundation. Resume and JD workflows are introduced in later phases.
(() => {
  const cards = document.querySelectorAll(".career-card");
  cards.forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", card.querySelector("h2")?.textContent || "Career Assistant module");
  });
})();
