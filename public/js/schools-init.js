const grid = document.getElementById("schools-grid");
grid.innerHTML = SCHOOLS.map((s) => `
  <div class="card school-card">
    <a href="school.html?id=${s.id}" class="school-badge"><img src="${s.logo}" alt="${s.name} ${s.mascot} logo" loading="lazy"></a>
    <div class="school-card-body">
      <h3><a href="school.html?id=${s.id}">${s.name}</a></h3>
      <div class="mascot">${s.mascot}</div>
      <a href="${s.website}" target="_blank" rel="noopener">Visit official website &rarr;</a>
    </div>
  </div>
`).join("");
