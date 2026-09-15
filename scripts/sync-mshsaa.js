#!/usr/bin/env node
// Recurring sync: pulls each Tri-County Conference school's live schedule
// from its public MSHSAA page (mshsaa.org/MySchool/?s=<id>) and merges it
// into Firebase, replacing only the entries this script previously wrote
// (tagged source:"mshsaa") so games added by hand in the admin panel are
// never clobbered.
//
// Uses the `firebase` CLI, so it just needs `firebase login` to have been
// run once on this machine (no separate credential file to manage). If this
// ever needs to run unattended (e.g. a scheduled cloud task with no prior
// `firebase login`), switch to a Firebase Admin SDK service account instead.
//
// Usage: node scripts/sync-mshsaa.js [--project=tccmid-mo]
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const cheerio = require("cheerio");

const SCHOOLS = [
  { id: "blair-oaks", mshsaaId: 217 },
  { id: "boonville", mshsaaId: 16 },
  { id: "california", mshsaaId: 582 },
  { id: "eldon", mshsaaId: 278 },
  { id: "fulton", mshsaaId: 80 },
  { id: "hallsville", mshsaaId: 311 },
  { id: "osage", mshsaaId: 152 },
  { id: "southern-boone", mshsaaId: 2 },
];

// Maps MSHSAA's "Sport - Gender" label (lowercased) to this site's sport ids.
// Every sport here is single-gender, matching how MSHSAA itself tracks them
// (separate schedules, standings, and state championships per gender) -
// there's no combined "cross-country" or "tennis" id to fall back to.
const SPORT_MAP = {
  football: "football",
  "volleyball - girls": "volleyball",
  "volleyball - boys": "volleyball",
  "soccer - boys": "boys-soccer",
  "soccer - girls": "girls-soccer",
  "golf - girls": "girls-golf",
  "golf - boys": "boys-golf",
  "cross country - boys": "boys-cross-country",
  "cross country - girls": "girls-cross-country",
  "basketball - boys": "boys-basketball",
  "basketball - girls": "girls-basketball",
  wrestling: "boys-wrestling",
  "wrestling - boys": "boys-wrestling",
  "wrestling - girls": "girls-wrestling",
  baseball: "baseball",
  "softball - girls": "softball",
  "tennis - girls": "girls-tennis",
  "tennis - boys": "boys-tennis",
  "track and field - boys": "boys-track-and-field",
  "track and field - girls": "girls-track-and-field",
};

function parseSchedule(html) {
  const $ = cheerio.load(html);
  const games = [];
  const skippedSports = new Set();

  $("#UpcomingEvents > div").each((_, dayBlock) => {
    const $day = $(dayBlock);
    const $xl = $day.find(".xl").first();
    if ($xl.length === 0) return;
    // Multi-day entries read like "August 28-29, 2026 Friday - Saturday" -
    // strip the day-of-week suffix and take the range's start day.
    const dateText = $xl.clone().children().remove().end().text().trim();
    const dateMatch = dateText.match(/^([A-Za-z]+)\s+(\d{1,2})(?:-\d{1,2})?,\s*(\d{4})/);
    if (!dateMatch) return;
    const parsedDate = new Date(`${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`);
    if (isNaN(parsedDate.getTime())) return;
    const isoDate = parsedDate.toISOString().slice(0, 10);

    $day.find("table tr").each((_, tr) => {
      const $tr = $(tr);
      const $infoTd = $tr.find("td").eq(1);
      if ($infoTd.length === 0) return;

      const opponentRaw = $infoTd
        .contents()
        .filter((i, el) => el.type === "text")
        .first()
        .text()
        .trim();
      const tourney = $infoTd.find("> strong.xsmall").first().text().trim().replace(/^\(|\)$/g, "");
      const opponent = tourney ? `${opponentRaw} (${tourney})` : opponentRaw;

      const $sportDiv = $infoTd.find("div.xsmall").first();
      const homeAwayText = $sportDiv.find("strong").text().trim().toLowerCase();
      const sportText = $sportDiv.clone().children().remove().end().text().trim();
      const sportId = SPORT_MAP[sportText.toLowerCase()];
      if (!sportId) {
        if (sportText) skippedSports.add(sportText);
        return;
      }

      let homeAway = "neutral";
      if (homeAwayText.includes("home")) homeAway = "home";
      else if (homeAwayText.includes("away")) homeAway = "away";

      const tinyHtml = $infoTd.find(".tiny").first().html() || "";
      const lines = tinyHtml
        .split(/<br\s*\/?>/i)
        .map((s) => s.replace(/&nbsp;/gi, " ").replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      const varsityLine = lines.find((l) => /varsity/i.test(l)) || lines[0] || "";
      const timeMatch = varsityLine.match(/^(\d{1,2}:\d{2}\s*[APap]\.?[Mm]\.?|TBD)\s*:/);
      const time = timeMatch && !/^tbd$/i.test(timeMatch[1].trim()) ? timeMatch[1].trim() : "";

      if (!opponent) return;
      games.push({ sportId, date: isoDate, time, opponent, homeAway, location: "", result: null, outcome: null, source: "mshsaa" });
    });
  });

  return { games, skippedSports: Array.from(skippedSports) };
}

async function fetchSchoolHtml(mshsaaId) {
  const res = await fetch(`https://www.mshsaa.org/MySchool/?s=${mshsaaId}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching school ${mshsaaId}`);
  return res.text();
}

function firebase(args, project) {
  return execFileSync("firebase", [...args, "--project", project], { encoding: "utf8" });
}

function getExistingSchedule(schoolId, project) {
  const raw = firebase(["database:get", `/schedule/${schoolId}`], project).trim();
  if (!raw || raw === "null") return {};
  return JSON.parse(raw);
}

function setSchedule(schoolId, data, project) {
  const tmpFile = path.join(os.tmpdir(), `tcc-schedule-${schoolId}-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(data));
  try {
    firebase(["database:set", `/schedule/${schoolId}`, tmpFile, "-f"], project);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v === undefined ? true : v];
    })
  );
  const project = args.project || "tccmid-mo";
  const allSkipped = new Set();
  const summary = [];

  for (const school of SCHOOLS) {
    process.stderr.write(`Syncing ${school.id} (mshsaa id ${school.mshsaaId})...\n`);
    const html = await fetchSchoolHtml(school.mshsaaId);
    const { games, skippedSports } = parseSchedule(html);
    skippedSports.forEach((s) => allSkipped.add(s));

    const existing = getExistingSchedule(school.id, project);
    const manualEntries = Object.fromEntries(
      Object.entries(existing).filter(([, g]) => g.source !== "mshsaa")
    );

    // MSHSAA-sourced game ids are regenerated from scratch every run, so a
    // freshly fetched game must inherit any outcome/result an admin already
    // entered for the same real-world game - otherwise every sync silently
    // erases every score. Matched by sport+date+opponent, which uniquely
    // identifies a game on these schedules.
    const priorMshsaaBySignature = new Map();
    Object.values(existing).forEach((g) => {
      if (g.source === "mshsaa") priorMshsaaBySignature.set(`${g.sportId}|${g.date}|${g.opponent}`, g);
    });
    const freshEntries = Object.fromEntries(
      games.map((g, i) => {
        const prior = priorMshsaaBySignature.get(`${g.sportId}|${g.date}|${g.opponent}`);
        const withResult = prior ? { ...g, outcome: prior.outcome ?? null, result: prior.result ?? null } : g;
        return [`mshsaa${i}`, withResult];
      })
    );
    const merged = { ...manualEntries, ...freshEntries };

    setSchedule(school.id, merged, project);
    summary.push(`${school.id}: ${games.length} MSHSAA games, ${Object.keys(manualEntries).length} manual games preserved`);
  }

  process.stderr.write(`\nDone.\n${summary.join("\n")}\n`);
  if (allSkipped.size > 0) {
    process.stderr.write(`Skipped sports with no mapping in SPORT_MAP: ${Array.from(allSkipped).join(", ")}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
