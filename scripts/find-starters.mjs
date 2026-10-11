#!/usr/bin/env node
/**
 * Finds every player who started the majority of at least one season from 2015 to 2026,
 * drafted or not, plus anyone starting right now.
 *
 *   node scripts/find-starters.mjs <players.csv> <snap_counts dir>
 *
 * The directory holds snap_counts_<year>.csv files from
 * https://github.com/nflverse/nflverse-data/releases (tag: snap_counts).
 * The data has no "started" flag, so a game counts as a start when the player took at least his
 * position's starter share of offensive or defensive snaps (QB, WR, TE, OL, DB 50%; DL and
 * linebackers 45%; RB 40%; FB 25%). Kickers, punters and long snappers count when they played on
 * special teams. A season is a majority-start season with at least 9 start games (a majority of 16
 * or 17). For the current, unfinished season it means more than half of his team's games so far.
 * "Current" starters are also kept: 2026 start games in at least 2 games at the starter share,
 * or a 2025 majority-start season and still active or on reserve in 2026.
 * Writes scripts/qualifying-starters.json.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, group } from "./pool-lib.mjs";
import { parseCsv } from "./csv.mjs";

const [csvPath, snapDir] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!csvPath || !snapDir) { console.error("Usage: node scripts/find-starters.mjs <players.csv> <snap_counts dir>"); process.exit(1); }

const FIRST = 2015, CURRENT = 2026;
const THRESHOLD = { QB: 0.5, RB: 0.4, FB: 0.25, WR: 0.5, TE: 0.5, OL: 0.5, F7: 0.45, DB: 0.5 };
const MAJORITY_GAMES = 9;

const roster = new Map();
for (const r of parseCsv(readFileSync(resolve(csvPath), "utf8"))) if (r.pfr_id) roster.set(r.pfr_id, r);

const result = new Map(); // pfrId -> { years: [], now: bool, lastYearMajority: bool }
for (let year = FIRST; year <= CURRENT; year++) {
  const teamGames = new Map();
  const starts = new Map();
  for (const r of parseCsv(readFileSync(resolve(snapDir, `snap_counts_${year}.csv`), "utf8"))) {
    if (r.game_type !== "REG") continue;
    (teamGames.get(r.team) ?? teamGames.set(r.team, new Set()).get(r.team)).add(r.game_id);
    const row = roster.get(r.pfr_player_id);
    if (!row) continue;
    const grp = group(row.position);
    const share = Math.max(Number(r.offense_pct) || 0, Number(r.defense_pct) || 0);
    const isStart = grp === "ST" ? Number(r.st_snaps) > 0 : share >= (THRESHOLD[grp] ?? 0.5);
    if (isStart) starts.set(r.pfr_player_id, (starts.get(r.pfr_player_id) ?? 0) + 1);
  }
  const gamesSoFar = Math.max(...[...teamGames.values()].map((s) => s.size));
  for (const [pfrId, n] of starts) {
    const entry = result.get(pfrId) ?? result.set(pfrId, { years: [], now: false, lastYearMajority: false }).get(pfrId);
    const majority = year === CURRENT ? n > gamesSoFar / 2 : n >= MAJORITY_GAMES;
    if (majority) entry.years.push(year);
    if (year === CURRENT && n >= 2) entry.now = true;
    if (year === CURRENT - 1 && majority) entry.lastYearMajority = true;
  }
}

const out = [];
for (const [pfrId, e] of result) {
  const row = roster.get(pfrId);
  // Guard against roster rows whose id points at the wrong person (a 1980 rookie cannot start in 2015).
  if (Number(row.rookie_season) < 1995) { console.log(`Skipped ${row.display_name}: rookie season ${row.rookie_season} looks like a bad record`); continue; }
  const current = e.now || (e.lastYearMajority && Number(row.last_season) >= CURRENT && ["ACT", "RES"].includes(row.status));
  if (e.years.length === 0 && !current) continue;
  out.push({
    pfr_id: pfrId, gsis_id: row.gsis_id, name: row.display_name, position: row.position, team: row.latest_team,
    draftYear: row.draft_year || null, majoritySeasons: e.years, current,
  });
}
out.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(resolve(ROOT, "scripts/qualifying-starters.json"), "[\n" + out.map((e) => "  " + JSON.stringify(e)).join(",\n") + "\n]\n");
const undrafted = out.filter((e) => !e.draftYear).length;
console.log(`Qualifying starters 2015-${CURRENT}: ${out.length} (${undrafted} undrafted). Current starters: ${out.filter((e) => e.current).length}. Majority-start seasons: ${out.filter((e) => e.majoritySeasons.length).length} players.`);
