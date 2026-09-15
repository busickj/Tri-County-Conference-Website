const { test } = require("node:test");
const assert = require("node:assert/strict");
const { loadScript } = require("./helpers/loadScript");

test("schoolById finds a member school by id", () => {
  const ctx = loadScript("js/schools-data.js");
  const osage = ctx.schoolById("osage");
  assert.equal(osage.name, "Osage");
  assert.equal(osage.mascot, "Indians");
});

test("schoolById returns undefined for a non-member school", () => {
  const ctx = loadScript("js/schools-data.js");
  assert.equal(ctx.schoolById("nonexistent"), undefined);
});

test("schoolName combines school name and mascot", () => {
  const ctx = loadScript("js/schools-data.js");
  assert.equal(ctx.schoolName("boonville"), "Boonville Pirates");
});

test("schoolName falls back to the raw id when the school is unknown", () => {
  const ctx = loadScript("js/schools-data.js");
  assert.equal(ctx.schoolName("mystery-school"), "mystery-school");
});

test("every member school has a unique id", () => {
  const ctx = loadScript("js/schools-data.js");
  const ids = ctx.allSchools().map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 8);
});

test("every sport belongs to a recognized season", () => {
  const ctx = loadScript("js/schools-data.js");
  ctx.allSports().forEach((sport) => {
    assert.match(sport.season, /^(Fall|Winter|Spring)$/);
  });
});
