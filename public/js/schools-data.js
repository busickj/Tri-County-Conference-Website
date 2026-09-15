// Member schools of the Tri-County Conference.
// This is static: membership rarely changes, so it isn't stored in the database.
// mshsaaId is the school's id in MSHSAA's directory (mshsaa.org/MySchool/?s=<id>),
// used by scripts/import-mshsaa.js to pull each school's live schedule.
//
// `theme` primary colors are each school's official hex value. `accent` is
// also the official secondary color, except where that secondary is white
// - white has no contrast to serve as a UI highlight (borders/hover states),
// so Blair Oaks and Boonville use black instead (Southern Boone keeps a
// neutral gold accent, #d4a017, by request). Osage uses Aggie Maroon as
// primary with Black/Gray from their official brand guide as accent/text
// colors instead, via the optional `text`/`textMuted` overrides - no tan.
// `font` is only set where a school's own site uses something distinctly
// different from this site's base Inter - otherwise it inherits Inter.
const SCHOOLS = [
  { id: "blair-oaks", name: "Blair Oaks", mascot: "Falcons", abbr: "BO", website: "https://www.blairoaks.k12.mo.us/", logo: "images/logos/blair-oaks.webp", mshsaaId: 217, theme: { primary: "#007D41", accent: "#000000" } },
  { id: "boonville", name: "Boonville", mascot: "Pirates", abbr: "BV", website: "https://bhs.bpsk12.net/", logo: "images/logos/boonville.webp", mshsaaId: 16, theme: { primary: "#044FBC", accent: "#000000", font: "Roboto Slab" } },
  { id: "california", name: "California", mascot: "Pintos", abbr: "CA", website: "https://hs.californiak12.org/", logo: "images/logos/california.webp", mshsaaId: 582, theme: { primary: "#D4190C", accent: "#023168" } },
  { id: "eldon", name: "Eldon", mascot: "Mustangs", abbr: "EL", website: "https://eldonmustangs.org/eldon-high-school/", logo: "images/logos/eldon.webp", mshsaaId: 278, theme: { primary: "#41010E", accent: "#B1945B" } },
  { id: "fulton", name: "Fulton", mascot: "Hornets", abbr: "FU", website: "https://fhs.fulton58.org/", logo: "images/logos/fulton.webp", mshsaaId: 80, theme: { primary: "#000000", accent: "#FFCC02", font: "Poppins" } },
  { id: "hallsville", name: "Hallsville", mascot: "Indians", abbr: "HV", website: "https://www.hallsville.org/", logo: "images/logos/hallsville.webp", mshsaaId: 311, theme: { primary: "#4F2684", accent: "#D5C86E" } },
  { id: "osage", name: "Osage", mascot: "Indians", abbr: "OS", website: "https://www.osageschools.org/", logo: "images/logos/osage.webp", mshsaaId: 152, theme: { primary: "#500000", accent: "#151514", text: "#151514", textMuted: "#3A3A3B", font: "Playfair Display" } },
  { id: "southern-boone", name: "Southern Boone", mascot: "Eagles", abbr: "SB", website: "https://www.ashland.k12.mo.us/o/high", logo: "images/logos/southern-boone.webp", mshsaaId: 2, theme: { primary: "#B50100", accent: "#d4a017" } }
];

// Sports offered across the conference, used to populate filters on the
// schedule and standings pages. Seasons are for grouping/sorting only, and
// come from MSHSAA's own season classification (this is why softball is
// "Fall" here rather than the more familiar spring/summer convention, and
// why boys and girls tennis - the one sport MSHSAA runs in different
// seasons per gender - end up in different season groups).
//
// Every sport is single-gender: MSHSAA itself tracks boys and girls
// editions of a sport as entirely separate activities (separate schedules,
// separate standings, separate state championships), so this site mirrors
// that instead of pairing them up under one combined entry.
//
// `alg` is MSHSAA's activity id (mshsaa.org/Shared/Schedule.aspx?s=<school>&alg=<id>),
// used to embed that school's live schedule for the sport.
const SPORTS = [
  { id: "baseball", name: "Baseball", season: "Spring", alg: 3 },
  { id: "boys-basketball", name: "Boys Basketball", season: "Winter", alg: 5 },
  { id: "boys-cross-country", name: "Boys Cross Country", season: "Fall", alg: 11 },
  { id: "boys-golf", name: "Boys Golf", season: "Spring", alg: 23 },
  { id: "boys-soccer", name: "Boys Soccer", season: "Fall", alg: 33 },
  { id: "boys-tennis", name: "Boys Tennis", season: "Spring", alg: 48 },
  { id: "boys-track-and-field", name: "Boys Track & Field", season: "Spring", alg: 52 },
  { id: "boys-wrestling", name: "Boys Wrestling", season: "Winter", alg: 64 },
  { id: "football", name: "Football", season: "Fall", alg: 19 },
  { id: "girls-basketball", name: "Girls Basketball", season: "Winter", alg: 6 },
  { id: "girls-cross-country", name: "Girls Cross Country", season: "Fall", alg: 12 },
  { id: "girls-golf", name: "Girls Golf", season: "Fall", alg: 24 },
  { id: "girls-soccer", name: "Girls Soccer", season: "Spring", alg: 34 },
  { id: "girls-tennis", name: "Girls Tennis", season: "Fall", alg: 49 },
  { id: "girls-track-and-field", name: "Girls Track & Field", season: "Spring", alg: 53 },
  { id: "girls-wrestling", name: "Girls Wrestling", season: "Winter", alg: 79 },
  { id: "softball", name: "Softball", season: "Fall", alg: 38 },
  { id: "volleyball", name: "Volleyball", season: "Fall", alg: 57 }
];

function schoolById(id) {
  return SCHOOLS.find((s) => s.id === id);
}

function sportById(id) {
  return SPORTS.find((s) => s.id === id);
}

function schoolName(id) {
  const s = schoolById(id);
  return s ? `${s.name} ${s.mascot}` : id;
}

// Plain functions (unlike top-level const/let) are visible outside a vm
// sandbox, so tests reach the SCHOOLS/SPORTS lists through these.
function allSchools() {
  return SCHOOLS;
}

function allSports() {
  return SPORTS;
}
