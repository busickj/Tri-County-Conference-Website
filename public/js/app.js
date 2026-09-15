function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Renders MSHSAA's own live embeddable schedule widget for one school+sport,
// straight from mshsaa.org - always current, no sync needed. A sport split
// by gender in MSHSAA's system (cross-country, wrestling, track, tennis)
// renders one labeled embed per gender.
function renderMshsaaEmbed(container, schoolId, sportId) {
  const school = schoolById(schoolId);
  const sport = sportById(sportId);
  if (!school || !sport) {
    container.innerHTML = '<p class="empty-state">Select a school and sport to view the live schedule.</p>';
    return;
  }

  container.innerHTML = `<div class="mshsaa-embed">
    <iframe src="https://www.mshsaa.org/Shared/Schedule.aspx?s=${school.mshsaaId}&alg=${sport.alg}"
      loading="lazy" title="${escapeHtml(school.name)} ${escapeHtml(sport.name)} schedule (live from MSHSAA)"></iframe>
  </div>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function populateSportSelect(selectEl, includeAll) {
  selectEl.innerHTML = "";
  if (includeAll) {
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All Sports";
    selectEl.appendChild(allOpt);
  }
  SPORTS.forEach((sport) => {
    const opt = document.createElement("option");
    opt.value = sport.id;
    opt.textContent = `${sport.name} (${sport.season})`;
    selectEl.appendChild(opt);
  });
}

function populateSchoolSelect(selectEl) {
  selectEl.innerHTML = "";
  SCHOOLS.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.name} ${s.mascot}`;
    selectEl.appendChild(opt);
  });
}

function gameSortKey(game) {
  return `${game.date || ""} ${game.time || ""}`;
}

// Flattens /schedule/{schoolId}/{gameId} into a single array of games,
// each tagged with its schoolId, for cross-school views like the homepage.
function loadAllGames(callback) {
  db.ref("schedule").once("value").then((snap) => {
    const games = [];
    snap.forEach((schoolSnap) => {
      schoolSnap.forEach((gameSnap) => {
        games.push(Object.assign({ id: gameSnap.key, schoolId: schoolSnap.key }, gameSnap.val()));
      });
    });
    callback(games);
  });
}

// Each game is stored on the school's own schedule, so the opponent is
// free text (usually a non-conference team, per MSHSAA's public schedules)
// rather than a reference to another member school.
function matchupLabel(schoolId, game) {
  const home = escapeHtml(schoolName(schoolId));
  return `${home} ${matchupLabelShort(game)}`;
}

// Same as matchupLabel but without the home school's own name - for views
// where the school is already shown elsewhere (a dropdown, a page header),
// repeating it in every row is just noise.
function matchupLabelShort(game) {
  const opp = escapeHtml(game.opponent || "TBD");
  if (game.homeAway === "away") return `@ ${opp}`;
  if (game.homeAway === "neutral") return `vs. ${opp} (Neutral)`;
  return `vs. ${opp}`;
}

// Shows every game in the next `days` days (default a week) - a rolling
// window computed from the real current date on every page load, so it
// naturally advances day by day rather than needing anything to update it.
function renderUpcomingGames(container, days) {
  loadAllGames((games) => {
    const today = new Date().toISOString().slice(0, 10);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (days || 7));
    const end = endDate.toISOString().slice(0, 10);
    const upcoming = games
      .filter((g) => g.date >= today && g.date <= end)
      .sort((a, b) => gameSortKey(a).localeCompare(gameSortKey(b)));

    if (upcoming.length === 0) {
      container.innerHTML = '<p class="empty-state">No games scheduled in the next 7 days.</p>';
      return;
    }

    container.innerHTML = upcoming
      .map((g) => {
        const sport = SPORTS.find((s) => s.id === g.sportId);
        return `<div class="ticker-card">
          <div class="sport-tag">${escapeHtml(sport ? sport.name : g.sportId)}</div>
          <div class="matchup">${matchupLabel(g.schoolId, g)}</div>
          <div class="meta">${formatDate(g.date)}${g.time ? " · " + escapeHtml(g.time) : ""}</div>
        </div>`;
      })
      .join("");
  });
}

function renderLatestNews(container, limit) {
  db.ref("news").orderByChild("date").limitToLast(limit).once("value").then((snap) => {
    const posts = [];
    snap.forEach((child) => { posts.push(Object.assign({ id: child.key }, child.val())); });
    posts.reverse();

    if (posts.length === 0) {
      container.innerHTML = '<p class="empty-state">No news posted yet.</p>';
      return;
    }

    container.innerHTML = `<div class="news-list">${posts
      .map(
        (p) => `<div class="news-post">
          <div class="news-thumb">${p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : "TCC"}</div>
          <div>
            <h3>${escapeHtml(p.title)}</h3>
            <div class="meta">${formatDate(p.date)}${p.author ? " · " + escapeHtml(p.author) : ""}</div>
            <div class="body">${escapeHtml(p.body || "")}</div>
          </div>
        </div>`
      )
      .join("")}</div>`;
  });
}

// sportId of "" (the "All Sports" option) shows every sport for the school.
function renderScheduleTable(container, schoolId, sportId) {
  db.ref(`schedule/${schoolId}`).once("value").then((snap) => {
    let games = [];
    snap.forEach((child) => { games.push(Object.assign({ id: child.key }, child.val())); });
    if (sportId) games = games.filter((g) => g.sportId === sportId);
    games.sort((a, b) => gameSortKey(a).localeCompare(gameSortKey(b)));

    if (games.length === 0) {
      container.innerHTML = '<p class="empty-state">No games scheduled yet.</p>';
      return;
    }

    const rows = games
      .map((g) => {
        const sport = SPORTS.find((s) => s.id === g.sportId);
        return `<tr>
          <td>${formatDate(g.date)}</td>
          <td>${escapeHtml(g.time || "")}</td>
          <td>${escapeHtml(sport ? sport.name : g.sportId)}</td>
          <td>${matchupLabelShort(g)}</td>
          <td>${escapeHtml(g.location || "")}</td>
          <td>${escapeHtml(g.result || "")}</td>
        </tr>`;
      })
      .join("");

    container.innerHTML = `<div class="table-scroll"><table class="data-table">
      <thead><tr><th>Date</th><th>Time</th><th>Sport</th><th>Matchup</th><th>Location</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  });
}

// A game only counts as a conference matchup when the opponent field is
// exactly another member school's name and nothing else - MSHSAA's synced
// schedules append parenthetical text for jamborees/quads/invitationals
// (see scripts/sync-mshsaa.js), so a clean exact match is enough to tell a
// real conference dual from a multi-team non-conference event.
function isConferenceGame(schoolId, game) {
  const opponent = (game.opponent || "").trim().toLowerCase();
  return SCHOOLS.some((s) => s.id !== schoolId && s.name.toLowerCase() === opponent);
}

// Standings are derived from the schedule itself rather than stored
// separately: MSHSAA's feed carries no scores, so each game's `outcome`
// (W/L/T) is set by hand in the admin panel after it's played, and only
// conference games count toward a school's record here.
function computeStandings(sportId, callback) {
  loadAllGames((games) => {
    const records = {};
    SCHOOLS.forEach((s) => { records[s.id] = { schoolId: s.id, wins: 0, losses: 0, ties: 0 }; });

    games.forEach((g) => {
      if (g.sportId !== sportId || !isConferenceGame(g.schoolId, g)) return;
      const rec = records[g.schoolId];
      if (g.outcome === "W") rec.wins += 1;
      else if (g.outcome === "L") rec.losses += 1;
      else if (g.outcome === "T") rec.ties += 1;
    });

    callback(Object.values(records));
  });
}

function renderStandingsTable(container, sportId) {
  computeStandings(sportId, (rows) => {
    rows.sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));

    const body = rows
      .map(
        (r, i) => `<tr>
          <td class="rank">${i + 1}</td>
          <td>${escapeHtml(schoolName(r.schoolId))}</td>
          <td>${r.wins || 0}</td>
          <td>${r.losses || 0}</td>
          <td>${r.ties || 0}</td>
        </tr>`
      )
      .join("");

    container.innerHTML = `<p class="section-note">Conference games only.</p>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th></th><th>School</th><th>W</th><th>L</th><th>T</th></tr></thead>
      <tbody>${body}</tbody>
    </table></div>`;
  });
}
