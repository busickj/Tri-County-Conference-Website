const schoolId = new URLSearchParams(location.search).get("id");
const school = schoolById(schoolId);

const headerContainer = document.getElementById("school-header");
const tabsContainer = document.getElementById("sport-tabs");
const scheduleContainer = document.getElementById("school-schedule");

// Mixes a hex color toward white by `amount` (0-1) - used to derive a
// slightly lighter hover/link shade from each school's single primary color
// without having to hand-pick a second value for every school.
function lighten(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

// Re-themes the page's header/hero/nav panels to one school's own primary
// color (see the comment on SCHOOLS in schools-data.js), plus swapping in
// that school's own site's heading font where one was worth borrowing.
// Only --navy/--navy-2 are overridden here, not --gold or --text: several
// schools' official accent/text colors are black or near-black, which would
// vanish against this site's dark page background if used for the gold
// accent or body text everywhere instead of just a school's own color block.
function applySchoolTheme(theme) {
  if (!theme) return;
  document.documentElement.style.setProperty("--navy", theme.primary);
  document.documentElement.style.setProperty("--navy-2", lighten(theme.primary, 0.18));

  if (theme.font) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(theme.font)}:wght@600;800&display=swap`;
    document.head.appendChild(link);

    const style = document.createElement("style");
    style.textContent = `.school-header h1 { font-family: '${theme.font}', var(--font); }`;
    document.head.appendChild(style);
  }
}

// Overrides the generic per-page social-preview tags (set statically in
// school.html's <head>, since this page is one template for eight schools)
// with this specific school's own name and logo. Only crawlers that execute
// JavaScript will see this - Facebook's does not - so social shares there
// fall back to the generic version rather than showing nothing.
function setSocialMeta(title, description, image) {
  document.title = title;
  [
    ["meta[property='og:title']", title],
    ["meta[property='og:description']", description],
    ["meta[property='og:image']", image],
    ["meta[property='og:url']", location.href],
    ["meta[name='twitter:title']", title],
    ["meta[name='twitter:description']", description],
    ["meta[name='twitter:image']", image],
  ].forEach(([selector, value]) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute("content", value);
  });
}

if (!school) {
  headerContainer.innerHTML = '<h1 class="section-title">School Not Found</h1>';
  tabsContainer.remove();
  scheduleContainer.innerHTML = '<p class="empty-state">That school isn\'t part of the Tri-County Conference. <a href="schools.html">See all member schools</a>.</p>';
} else {
  setSocialMeta(
    `${school.name} ${school.mascot} - Tri-County Conference`,
    `Schedules and sports for the ${school.name} ${school.mascot}, a member of the Tri-County Conference.`,
    new URL(school.logo, location.href).href
  );
  applySchoolTheme(school.theme);

  headerContainer.innerHTML = `
    <div class="school-header">
      <div class="school-header-badge"><img src="${school.logo}" alt="${school.name} ${school.mascot} logo"></div>
      <div>
        <h1 class="section-title" style="border-bottom:none; margin-bottom:2px; padding-bottom:0;">${school.name} ${school.mascot}</h1>
        <a href="${school.website}" target="_blank" rel="noopener">Visit official website &rarr;</a>
      </div>
    </div>
  `;

  tabsContainer.innerHTML = SPORTS.map(
    (sport) => `
      <div class="sport-tab">
        <button type="button" class="sport-tab-btn">${sport.name}</button>
        <div class="sport-tab-menu">
          <a href="schedule.html?school=${school.id}&sport=${sport.id}">Schedule</a>
          <a href="standings.html?sport=${sport.id}">Standings</a>
        </div>
      </div>
    `
  ).join("");

  // Hovering opens the menu (desktop); tapping the button toggles it too,
  // since touch devices have no hover state.
  tabsContainer.querySelectorAll(".sport-tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tab = btn.closest(".sport-tab");
      const wasOpen = tab.classList.contains("open");
      tabsContainer.querySelectorAll(".sport-tab.open").forEach((t) => t.classList.remove("open"));
      if (!wasOpen) tab.classList.add("open");
    });
  });
  document.addEventListener("click", () => {
    tabsContainer.querySelectorAll(".sport-tab.open").forEach((t) => t.classList.remove("open"));
  });

  renderScheduleTable(scheduleContainer, school.id, "");
}
