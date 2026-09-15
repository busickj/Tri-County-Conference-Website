const auth = firebase.auth();
const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  loginError.style.display = "none";
  auth.signInWithEmailAndPassword(email, password).catch((err) => {
    loginError.textContent = err.message;
    loginError.style.display = "block";
  });
});

document.getElementById("logout-btn").addEventListener("click", () => auth.signOut());

auth.onAuthStateChanged((user) => {
  if (user) {
    loginPanel.style.display = "none";
    adminPanel.style.display = "block";
    document.getElementById("admin-email").textContent = user.email;
    initAdminPanel();
  } else {
    loginPanel.style.display = "block";
    adminPanel.style.display = "none";
  }
});

function initAdminPanel() {
  populateSportSelect(document.getElementById("game-sport"));
  populateSportSelect(document.getElementById("game-list-sport"), true);
  populateSchoolSelect(document.getElementById("game-school"));
  populateSchoolSelect(document.getElementById("game-list-school"));

  refreshNewsAdminList();
  refreshGameAdminListFromSelects();

  document.getElementById("game-list-school").addEventListener("change", refreshGameAdminListFromSelects);
  document.getElementById("game-list-sport").addEventListener("change", refreshGameAdminListFromSelects);
}

function refreshGameAdminListFromSelects() {
  refreshGameAdminList(document.getElementById("game-list-school").value, document.getElementById("game-list-sport").value);
}

// --- News ---

document.getElementById("news-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("news-title").value.trim();
  const date = document.getElementById("news-date").value;
  const author = document.getElementById("news-author").value.trim();
  const image = document.getElementById("news-image").value.trim();
  const body = document.getElementById("news-body").value.trim();
  if (!title || !date) return;

  db.ref("news").push({ title, date, author, image, body }).then(() => {
    e.target.reset();
    refreshNewsAdminList();
  });
});

function refreshNewsAdminList() {
  const container = document.getElementById("news-admin-list");
  db.ref("news").orderByChild("date").once("value").then((snap) => {
    const posts = [];
    snap.forEach((child) => { posts.push(Object.assign({ id: child.key }, child.val())); });
    posts.reverse();

    if (posts.length === 0) {
      container.innerHTML = '<p class="empty-state">No posts yet.</p>';
      return;
    }

    container.innerHTML = posts
      .map(
        (p) => `<div class="admin-list-row card">
          <span>${escapeHtml(p.title)} <span class="mascot">(${formatDate(p.date)})</span></span>
          <button class="btn" data-delete-news="${p.id}">Delete</button>
        </div>`
      )
      .join("");

    container.querySelectorAll("[data-delete-news]").forEach((btn) => {
      btn.addEventListener("click", () => {
        db.ref(`news/${btn.dataset.deleteNews}`).remove().then(refreshNewsAdminList);
      });
    });
  });
}

// --- Games / Schedule ---

document.getElementById("game-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const schoolId = document.getElementById("game-school").value;
  const sportId = document.getElementById("game-sport").value;
  const date = document.getElementById("game-date").value;
  const time = document.getElementById("game-time").value;
  const opponent = document.getElementById("game-opponent").value.trim();
  const homeAway = document.getElementById("game-homeaway").value;
  const location = document.getElementById("game-location").value.trim();
  if (!date || !opponent) return;

  db.ref(`schedule/${schoolId}`).push({ sportId, date, time, opponent, homeAway, location, result: null, outcome: null }).then(() => {
    document.getElementById("game-date").value = "";
    document.getElementById("game-time").value = "";
    document.getElementById("game-opponent").value = "";
    document.getElementById("game-location").value = "";
    refreshGameAdminListFromSelects();
  });
});

function refreshGameAdminList(schoolId, sportId) {
  const container = document.getElementById("game-admin-list");
  db.ref(`schedule/${schoolId}`).once("value").then((snap) => {
    let games = [];
    snap.forEach((child) => { games.push(Object.assign({ id: child.key }, child.val())); });
    if (sportId) games = games.filter((g) => g.sportId === sportId);
    games.sort((a, b) => gameSortKey(a).localeCompare(gameSortKey(b)));

    if (games.length === 0) {
      container.innerHTML = '<p class="empty-state">No games for this school yet.</p>';
      return;
    }

    container.innerHTML = games
      .map((g) => {
        const sport = SPORTS.find((s) => s.id === g.sportId);
        const outcomeOptions = ["", "W", "L", "T"]
          .map((o) => `<option value="${o}" ${(g.outcome || "") === o ? "selected" : ""}>${o || "No result yet"}</option>`)
          .join("");
        return `<div class="admin-list-row card">
          <span>${formatDate(g.date)} ${escapeHtml(g.time || "")} &mdash; ${escapeHtml(sport ? sport.name : g.sportId)}: ${matchupLabelShort(g)}</span>
          <span>
            <select data-outcome="${g.id}">${outcomeOptions}</select>
            <input type="text" placeholder="Score (optional)" value="${escapeHtml(g.result || "")}" style="width:110px" data-result="${g.id}">
            <button class="btn" data-save-result="${g.id}">Save</button>
            <button class="btn" data-delete-game="${g.id}">Delete</button>
          </span>
        </div>`;
      })
      .join("");

    container.querySelectorAll("[data-save-result]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const gameId = btn.dataset.saveResult;
        const outcome = container.querySelector(`[data-outcome="${gameId}"]`).value || null;
        const result = container.querySelector(`[data-result="${gameId}"]`).value.trim() || null;
        db.ref(`schedule/${schoolId}/${gameId}`).update({ outcome, result });
      });
    });

    container.querySelectorAll("[data-delete-game]").forEach((btn) => {
      btn.addEventListener("click", () => {
        db.ref(`schedule/${schoolId}/${btn.dataset.deleteGame}`).remove().then(() => refreshGameAdminListFromSelects());
      });
    });
  });
}
