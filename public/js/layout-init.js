// Renders the horizontal school-logo strip under the header. Included on
// every page (schools-data.js must load first) so all member schools stay
// visible site-wide, not just on the schools directory page.
(function () {
  const container = document.getElementById("school-strip");
  if (!container) return;
  container.innerHTML = SCHOOLS.map(
    (s) => `<a href="school.html?id=${s.id}">
      <span class="chip"><img src="${s.logo}" alt="${s.name} ${s.mascot} logo" loading="lazy"></span>
      <span class="label">${s.name}</span>
    </a>`
  ).join("");
})();
