const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadScript } = require("./helpers/loadScript");

// app.js references SCHOOLS/SPORTS (from schools-data.js) and `db` (from
// firebase-config.js) as globals; only the pure helpers under test here need
// those, and none of them touch `db`, so an empty stub is enough.
function loadApp() {
  return loadScript("js/app.js", { SCHOOLS: [], SPORTS: [], db: {} });
}

test("formatDate renders a short weekday/month/day", () => {
  const ctx = loadApp();
  assert.equal(ctx.formatDate("2026-09-04"), "Fri, Sep 4");
});

test("formatDate passes through a non-date string unchanged", () => {
  const ctx = loadApp();
  assert.equal(ctx.formatDate("TBD"), "TBD");
});

test("formatDate returns an empty string for no date", () => {
  const ctx = loadApp();
  assert.equal(ctx.formatDate(""), "");
});

test("escapeHtml neutralizes HTML-significant characters", () => {
  const ctx = loadApp();
  assert.equal(ctx.escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
});

test("gameSortKey orders by date then time", () => {
  const ctx = loadApp();
  const earlier = ctx.gameSortKey({ date: "2026-09-04", time: "17:00" });
  const later = ctx.gameSortKey({ date: "2026-09-04", time: "19:30" });
  assert.ok(earlier.localeCompare(later) < 0);
});

// Firebase's real DataSnapshot.forEach cancels iteration early if the
// callback returns a truthy value - and Array.prototype.push returns the
// new length, which is truthy from the very first element. Every
// `snap.forEach((child) => arr.push(...))` in this codebase silently
// dropped all but the first child until that was fixed; this fake
// reproduces that exact cancel-on-truthy-return behavior so the bug can't
// come back unnoticed.
// A leaf entry's value is a plain object; a nested entry's value is itself
// an array of [key, value] pairs (e.g. the "schedule" root, one level per
// school). The array shape is what tells this apart from a real game/record
// object, so `loadAllGames`'s two-level forEach can be tested the same way
// as every single-level path.
function fakeSnapshot(entries) {
  return {
    forEach(cb) {
      for (const [key, value] of entries) {
        const node = Array.isArray(value) ? Object.assign({ key }, fakeSnapshot(value)) : { key, val: () => value };
        if (cb(node)) return true;
      }
      return false;
    },
  };
}

function fakeDb(dataByPath) {
  return {
    ref(path) {
      return { once: () => Promise.resolve(fakeSnapshot(dataByPath[path] || [])) };
    },
  };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

test("renderScheduleTable renders every game for a school, not just the first", async () => {
  const games = [
    ["g1", { sportId: "football", date: "2026-08-28", time: "7:00 PM", opponent: "Bolivar", homeAway: "home" }],
    ["g2", { sportId: "volleyball", date: "2026-08-26", time: "", opponent: "Rock Bridge", homeAway: "away" }],
    ["g3", { sportId: "softball", date: "2026-08-29", time: "1:00 PM", opponent: "Camdenton", homeAway: "away" }],
  ];
  const ctx = loadScript("js/app.js", {
    SCHOOLS: [],
    SPORTS: [],
    schoolName: (id) => id,
    db: fakeDb({ "schedule/osage": games }),
  });
  const container = { innerHTML: "" };
  ctx.renderScheduleTable(container, "osage", "");
  await flush();
  const rowCount = (container.innerHTML.match(/<tr>/g) || []).length;
  assert.equal(rowCount, 1 + games.length, "expected one header row plus one row per game");
});

const STANDINGS_SCHOOLS = [
  { id: "osage", name: "Osage", mascot: "Indians" },
  { id: "eldon", name: "Eldon", mascot: "Mustangs" },
  { id: "fulton", name: "Fulton", mascot: "Hornets" },
];

test("isConferenceGame matches a clean conference-school opponent name", () => {
  const ctx = loadScript("js/app.js", { SCHOOLS: STANDINGS_SCHOOLS, SPORTS: [], db: {} });
  assert.equal(ctx.isConferenceGame("osage", { opponent: "Eldon" }), true);
  assert.equal(ctx.isConferenceGame("osage", { opponent: "eldon" }), true, "should be case-insensitive");
});

test("isConferenceGame rejects non-conference opponents and multi-team events", () => {
  const ctx = loadScript("js/app.js", { SCHOOLS: STANDINGS_SCHOOLS, SPORTS: [], db: {} });
  assert.equal(ctx.isConferenceGame("osage", { opponent: "Bolivar" }), false, "not a conference school");
  assert.equal(
    ctx.isConferenceGame("osage", { opponent: "Eldon (Osage Quad)" }),
    false,
    "a jamboree/quad/invitational has annotated text, not a clean school name"
  );
});

test("renderStandingsTable counts only conference games with a set outcome, not every game", async () => {
  // Osage: a conference win (counts), a conference game with no outcome yet
  // (ignored - not played/entered), and a non-conference win (ignored - the
  // whole point of this feature is to exclude these).
  const osageGames = [
    ["g1", { sportId: "football", opponent: "Eldon", outcome: "W" }],
    ["g2", { sportId: "football", opponent: "Fulton", outcome: null }],
    ["g3", { sportId: "football", opponent: "Bolivar", outcome: "W" }],
  ];
  const eldonGames = [["g4", { sportId: "football", opponent: "Osage", outcome: "L" }]];
  const ctx = loadScript("js/app.js", {
    SCHOOLS: STANDINGS_SCHOOLS,
    SPORTS: [],
    schoolName: (id) => id,
    db: fakeDb({
      schedule: [
        ["osage", osageGames],
        ["eldon", eldonGames],
        ["fulton", []],
      ],
    }),
  });
  const container = { innerHTML: "" };
  ctx.renderStandingsTable(container, "football");
  await flush();

  const rowCount = (container.innerHTML.match(/<tr>/g) || []).length;
  assert.equal(rowCount, 1 + STANDINGS_SCHOOLS.length, "expected one header row plus one row per conference school");
  assert.match(container.innerHTML, /<td>osage<\/td>\s*<td>1<\/td>\s*<td>0<\/td>\s*<td>0<\/td>/, "Osage should show 1 win, not 2");
  assert.match(container.innerHTML, /<td>eldon<\/td>\s*<td>0<\/td>\s*<td>1<\/td>\s*<td>0<\/td>/, "Eldon should show 1 loss");
});
