#!/usr/bin/env node
/**
 * Builds the full candidate pool (scripts/players-full.json) from the public nflverse players file.
 * Then run build-starters.mjs and trim-players.mjs to produce data/players.json.
 *
 *   node scripts/build-players.mjs [path/to/players.csv] [--report]
 *
 * With no path it downloads the file from GitHub. --report prints how the
 * difficulty tiers came out instead of writing anything.
 *
 * Source: https://github.com/nflverse/nflverse-data (players release).
 * Credit nflverse wherever you share the game, and check their license terms.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_URL =
  "https://github.com/nflverse/nflverse-data/releases/download/players/players.csv";

const FIRST_DRAFT_YEAR = 2011;
const LAST_DRAFT_YEAR = 2026;

/** Share of the pool given to each tier, easiest first. Tune these to taste. */
const TIER_SHARES = [
  ["easy", 0.06],
  ["medium", 0.2],
  ["hard", 0.34],
  ["sicko", 0.4],
];

const TEAMS = {
  ARI: "Arizona Cardinals", ATL: "Atlanta Falcons", BAL: "Baltimore Ravens",
  BUF: "Buffalo Bills", CAR: "Carolina Panthers", CHI: "Chicago Bears",
  CIN: "Cincinnati Bengals", CLE: "Cleveland Browns", DAL: "Dallas Cowboys",
  DEN: "Denver Broncos", DET: "Detroit Lions", GB: "Green Bay Packers",
  HOU: "Houston Texans", IND: "Indianapolis Colts", JAX: "Jacksonville Jaguars",
  KC: "Kansas City Chiefs", LV: "Las Vegas Raiders", LAC: "Los Angeles Chargers",
  LA: "Los Angeles Rams", MIA: "Miami Dolphins", MIN: "Minnesota Vikings",
  NE: "New England Patriots", NO: "New Orleans Saints", NYG: "New York Giants",
  NYJ: "New York Jets", PHI: "Philadelphia Eagles", PIT: "Pittsburgh Steelers",
  SEA: "Seattle Seahawks", SF: "San Francisco 49ers", TB: "Tampa Bay Buccaneers",
  TEN: "Tennessee Titans", WAS: "Washington Commanders",
};

const POSITIONS = {
  SAF: "S", FS: "S", NT: "DT",
};

/** How recognizable a position is to a casual fan (0 to 1). */
const VISIBILITY = {
  QB: 1, WR: 0.9, RB: 0.9, TE: 0.8, DE: 0.8, LB: 0.75, OLB: 0.75, ILB: 0.7, MLB: 0.75, CB: 0.75, DT: 0.7,
  S: 0.65, DB: 0.65, OT: 0.4, DL: 0.6, G: 0.35, C: 0.35, OL: 0.35,
  FB: 0.4, K: 0.4, P: 0.4, LS: 0.2,
};

const COLLEGE_RENAMES = {
  "N.C. State": "NC State",
  Mississippi: "Ole Miss",
  "Louisiana-Lafayette": "Louisiana",
  "Louisiana-Monroe": "UL Monroe",
  "Texas-San Antonio": "UTSA",
  "Texas-El Paso": "UTEP",
  "Tennessee-Chattanooga": "Chattanooga",
  "Tennessee-Martin": "UT Martin",
  "Nebraska-Omaha": "Omaha",
  "Miami (Ohio)": "Miami (OH)",
  "UMass Amherst": "UMass",
  "Texas State-San Marcos": "Texas State",
  "Towson State": "Towson",
  "Northwestern State (LA)": "Northwestern State",
  "Southern Utah State": "Southern Utah",
  "Univ of California-San Diego": "UC San Diego",
  "University of Edinboro": "Edinboro",
  "University of Arkansas at Pine Bluff": "Arkansas-Pine Bluff",
};

/** Junior colleges and similar stops. They are never a question's answer. */
const JUNIOR_COLLEGE =
  /\b(JC|CC|J\.C\.|Junior|Community|Comm\.)\b|City College|Georgia Military|^Snow$|^Navarro$|^Ventura$|^Mt\. San Antonio$|^Sierra JC$|Monterey Peninsula|De Anza|El Camino|Reedley|Chabot|Santa Monica|Santa Rosa|Santa Barbara|Pierce College|American River|Contra Costa|Palomar|Cerritos|Citrus|Kilgore|Louisburg|Pearl River|Hinds|Itawamba|Mesa CC|Butte College|Shasta|Bakersfield|Chaffey|Allan Hancock|Antelope Valley|Long Beach City|East Los Angeles|San Bernardino Valley|San Joaquin Delta|Sacramento City|College of the|Ellsworth|Blinn|Tyler|Dodge City|Garden City|Coffeyville|Hutchinson|Butler County|Lackawanna|Iowa Western|Fort Scott|Nassau|Northeast Oklahoma|Globe Institute|Eastern Arizona|Arizona Western|Glendale|Cisco|LAHC|Holmes County|Gulf Coast|Mid-State Technical|Madison Area Technical|Manhattan Christian|Jones County|Copiah|Coahoma|East Central/i;

const num = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

function slug(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanCollege(raw, { primary, conference }) {
  let name = raw.trim();
  if (name === "Miami") {
    name = primary && /Mid-American/i.test(conference) ? "Miami (OH)" : "Miami (FL)";
  }
  name = COLLEGE_RENAMES[name] ?? name;
  name = name.replace(/^University of /, "").replace(/ University$/, "");
  return name;
}

/** Qualifying starters (scripts/qualifying-starters.json) are always included, drafted or not. */
function loadCurrentStarters() {
  try {
    return new Set(JSON.parse(readFileSync(resolve(ROOT, "scripts/qualifying-starters.json"), "utf8")).map((e) => e.gsis_id));
  } catch {
    return new Set();
  }
}

function loadRows(csvText) {
  const players = [];
  const current = loadCurrentStarters();
  for (const row of parseCsv(csvText)) {
    const forced = current.has(row.gsis_id);
    const drafted = num(row.draft_year);
    const undrafted = !drafted;
    const draftYear = drafted ?? num(row.rookie_season);
    if (!draftYear) continue;
    if (!forced && (undrafted || draftYear < FIRST_DRAFT_YEAR || draftYear > LAST_DRAFT_YEAR)) continue;
    if (!row.college_name || !row.display_name) continue;

    // A forced (current) starter whose first listed school is a junior college is answered with his first four-year school.
    const allSchools = row.college_name.split(";").map((s) => s.trim()).filter(Boolean);
    const schools = forced ? allSchools.filter((s) => !JUNIOR_COLLEGE.test(s)) : allSchools;
    const [primaryRaw, ...restRaw] = schools;
    if (!primaryRaw || JUNIOR_COLLEGE.test(primaryRaw)) continue;

    const college = cleanCollege(primaryRaw, { primary: true, conference: row.college_conference });
    const alternateColleges = [
      ...new Set(
        restRaw
          .filter((s) => !JUNIOR_COLLEGE.test(s))
          .map((s) => cleanCollege(s, { primary: false, conference: "" }))
          .filter((s) => s !== college),
      ),
    ];

    const rookie = num(row.rookie_season);
    const last = num(row.last_season);
    const seasons = rookie && last ? last - rookie + 1 : 0;
    const round = num(row.draft_round) ?? 7;
    const pick = num(row.draft_pick) ?? 262;
    const rawPosition = row.position || row.position_group;
    const position = POSITIONS[rawPosition] ?? rawPosition;
    const team = TEAMS[row.latest_team] ?? TEAMS[row.draft_team];
    if (!position || !team || seasons < 1) continue;

    // Keep the harder tiers fair: skip one-year players who were never high picks.
    const rookieClass = draftYear >= LAST_DRAFT_YEAR - 1;
    const established = seasons >= 2 || round <= 2 || (rookieClass && round <= 4);
    if (!established && !forced) continue;

    players.push({
      id: `${slug(row.display_name)}-${draftYear}`,
      name: row.display_name,
      position,
      nflTeam: team,
      college,
      draftYear,
      ...(undrafted ? { undrafted: true } : {}),
      alternateColleges,
      _pick: pick,
      _seasons: seasons,
    });
  }

  // Two players can share a name and year. Make ids unique by adding the pick.
  const counts = new Map();
  for (const p of players) counts.set(p.id, (counts.get(p.id) ?? 0) + 1);
  for (const p of players) if (counts.get(p.id) > 1) p.id = `${p.id}-p${p._pick}`;
  return players;
}

function scorePlayers(players) {
  const schoolCounts = new Map();
  for (const p of players) schoolCounts.set(p.college, (schoolCounts.get(p.college) ?? 0) + 1);
  const biggest = Math.max(...schoolCounts.values());

  for (const p of players) {
    const fPick = 1 - Math.log(p._pick) / Math.log(262);
    const fLong = Math.min(p._seasons, 10) / 10;
    const vis = VISIBILITY[p.position] ?? 0.5;
    p._fame = Math.min(1, (vis * (0.6 * fPick + 0.4 * fLong)) / 0.8);
    // Schools that send many players to the NFL are the obvious guesses.
    p._obscurity = 1 - Math.log(schoolCounts.get(p.college)) / Math.log(biggest);
    p._score = 0.55 * (1 - p._fame) + 0.45 * p._obscurity;
  }
}

function assignTiers(players, overrides) {
  const sorted = [...players].sort((a, b) => a._score - b._score);
  let start = 0;
  TIER_SHARES.forEach(([tier, share], index) => {
    const end = index === TIER_SHARES.length - 1 ? sorted.length : start + Math.round(sorted.length * share);
    for (const p of sorted.slice(start, end)) p.difficulty = tier;
    start = end;
  });
  let applied = 0;
  for (const p of players) {
    p._computed = p.difficulty;
    if (overrides[p.id]) { p.difficulty = overrides[p.id]; applied++; }
  }
  const missing = Object.keys(overrides).filter((id) => !players.some((p) => p.id === id));
  return { applied, missing };
}

function toOutput(p) {
  const out = {
    id: p.id, name: p.name, position: p.position, nflTeam: p.nflTeam,
    college: p.college, draftYear: p.draftYear, difficulty: p.difficulty,
  };
  if (p.undrafted) out.undrafted = true;
  if (p.alternateColleges.length) out.alternateColleges = p.alternateColleges;
  return out;
}

function report(players, overrides) {
  const tiers = TIER_SHARES.map(([tier]) => tier);
  const label = (p) => `${p.name} (${p.position}, ${p.college}, ${p.draftYear})`;
  const every = (list, count) => {
    const step = Math.max(1, Math.floor(list.length / count));
    return list.filter((_, i) => i % step === 0).slice(0, count);
  };

  console.log("\nFormula tier sizes:", Object.fromEntries(tiers.map((t) => [t, players.filter((p) => p._computed === t).length])));

  console.log("\nHand labels (rows) vs formula (columns):");
  for (const given of tiers) {
    const row = players.filter((p) => overrides[p.id] === given);
    if (!row.length) continue;
    const cells = tiers.map((t) => `${t}:${row.filter((p) => p._computed === t).length}`).join("  ");
    console.log(`  ${given.padEnd(7)} ${cells}`);
  }

  console.log("\nHand-labeled players the formula disagrees with by 2+ tiers:");
  for (const p of players) {
    const given = overrides[p.id];
    if (given && Math.abs(tiers.indexOf(given) - tiers.indexOf(p._computed)) >= 2) {
      console.log(`  ${label(p)}: you said ${given}, formula says ${p._computed}`);
    }
  }

  const byScore = [...players].sort((a, b) => a._score - b._score);
  console.log("\nTop 45 by formula (should read like household names):");
  console.log("  " + byScore.slice(0, 45).map((p) => p.name).join(", "));

  for (const tier of tiers) {
    const inTier = byScore.filter((p) => p._computed === tier);
    console.log(`\n${tier} (formula) sample:`);
    console.log("  " + every(inTier, 18).map(label).join("\n  "));
  }

  const primaryCounts = new Map();
  for (const p of players) primaryCounts.set(p.college, (primaryCounts.get(p.college) ?? 0) + 1);
  const rare = [...primaryCounts].filter(([, n]) => n <= 2).map(([name]) => name).sort();
  console.log(`\nAnswer schools used by only 1-2 players (${rare.length}), to spot junior colleges:`);
  console.log("  " + rare.join(" | "));
}

const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const csvPath = args.find((a) => !a.startsWith("--"));

const csvText = csvPath
  ? readFileSync(resolve(csvPath), "utf8")
  : await fetch(CSV_URL).then((r) => {
      if (!r.ok) throw new Error(`Download failed: ${r.status}`);
      return r.text();
    });

const overrides = JSON.parse(readFileSync(resolve(ROOT, "scripts/difficulty-overrides.json"), "utf8"));
const players = loadRows(csvText);
scorePlayers(players);
const { applied, missing } = assignTiers(players, overrides);

if (missing.length) console.warn(`Overrides that matched no player: ${missing.join(", ")}`);

if (reportOnly) {
  console.log(`Players: ${players.length}, overrides applied: ${applied}`);
  report(players, overrides);
} else {
  players.sort((a, b) => a.name.localeCompare(b.name) || a.draftYear - b.draftYear);
  const lines = players.map((p) => "  " + JSON.stringify(toOutput(p)));
  writeFileSync(resolve(ROOT, "scripts/players-full.json"), `[\n${lines.join(",\n")}\n]\n`);
  const sizes = Object.fromEntries(["easy", "medium", "hard", "sicko"].map((t) => [t, players.filter((p) => p.difficulty === t).length]));
  console.log(`Wrote ${players.length} players to scripts/players-full.json`, sizes);
  console.log(`Overrides applied: ${applied}`);
}
