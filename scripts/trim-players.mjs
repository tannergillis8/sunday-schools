#!/usr/bin/env node
/**
 * Trims the full pool (scripts/players-full.json) to NFL starters and writes data/players.json.
 *
 *   node scripts/trim-players.mjs <players.csv> [--dry-run]
 *
 * Keeps a player who started the majority of at least two seasons from 2015 to 2026 (the current,
 * unfinished season counts when he has started more than half of his team's games so far).
 * See find-starters.mjs and scripts/qualifying-starters.json. Drafted or not.
 * Offensive and defensive linemen, kickers and punters are kept only with at least one All-Pro (first or second team) or
 * Pro Bowl selection. Writes scripts/removed-players.csv listing everyone cut.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, loadPoolInputs, read } from "./pool-lib.mjs";
import { toCsv } from "./csv.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
if (!csvPath) { console.error("Usage: node scripts/trim-players.mjs <players.csv> [--dry-run]"); process.exit(1); }

const full = JSON.parse(read("scripts/players-full.json"));
const starters = new Map(JSON.parse(read("scripts/qualifying-starters.json")).map((e) => [e.pfr_id, e]));
const { info } = loadPoolInputs(full, csvPath);

const MIN_SEASONS = 2;
// Linemen, kickers and punters need an All-Pro or Pro Bowl to stay (long snappers are not held to this).
const NEEDS_HONORS = new Set(["T", "G", "C", "OT", "OG", "OL", "DE", "DT", "DL", "NT", "K", "P"]);
const kept = [], removed = [];
const why = new Map();
let linemenCut = 0, linemenAmbiguousKept = 0;
for (const p of full) {
  const f = info.get(p.id);
  const s = f.pfrId ? starters.get(f.pfrId) : undefined;
  if (!s || s.majoritySeasons.length < MIN_SEASONS) {
    why.set(p.id, s && s.majoritySeasons.length === 1 ? "only 1 majority-start season in 2015-2026" : "no majority-start season in 2015-2026");
    removed.push({ p, s, f });
    continue;
  }
  const honors = f.ap1.size + f.ap2.size + f.pb.size + f.draftAp1 + f.draftPb;
  if (NEEDS_HONORS.has(p.position) && honors === 0) {
    if (f.ambiguous) linemenAmbiguousKept++; // a same-name player is on an honors list; keep rather than guess
    else { why.set(p.id, "lineman, kicker or punter with no All-Pro or Pro Bowl"); linemenCut++; removed.push({ p, s, f }); continue; }
  }
  kept.push({ p, s, f });
}
console.log(`Linemen, kickers and punters cut for no All-Pro or Pro Bowl: ${linemenCut}. Kept because a same-name honors entry made attribution unclear: ${linemenAmbiguousKept}.`);
console.log(`Full pool ${full.length}: keep ${kept.length}, remove ${removed.length}`);
console.log(`Undrafted kept: ${kept.filter(({ p }) => p.undrafted).length}. Drafted before 2011 kept: ${kept.filter(({ p }) => !p.undrafted && p.draftYear < 2011).length}.`);

const inFull = new Set([...info.values()].map((f) => f.pfrId));
const missing = JSON.parse(read("scripts/qualifying-starters.json")).filter((e) => !inFull.has(e.pfr_id));
console.log(`Qualifying starters missing from the full pool (no college listed, or a junior college only): ${missing.length}`);
if (missing.length) console.log("  " + missing.slice(0, 40).map((e) => `${e.name} (${e.position})`).join(", ") + (missing.length > 40 ? ", ..." : ""));

if (dryRun) { console.log("Dry run: nothing written."); process.exit(0); }
if (!args.includes("--force")) {
  console.error("Refusing to overwrite data/players.json: its tiers were hand-checked (see master-list.csv). Pass --force to rebuild it from scratch.");
  process.exit(1);
}
writeFileSync(resolve(ROOT, "data/players.json"), "[\n" + kept.map(({ p }) => "  " + JSON.stringify(p)).join(",\n") + "\n]\n");
writeFileSync(
  resolve(ROOT, "scripts/removed-players.csv"),
  "﻿" + toCsv([
    ["Name", "Position", "School", "Draft year", "Draft pick", "Why cut", "id"],
    ...removed.map(({ p, f }) => [p.name, p.position, p.college, p.draftYear, f.pick === 999 ? "" : f.pick, why.get(p.id), p.id]),
  ]),
);
console.log(`Wrote data/players.json (${kept.length}) and scripts/removed-players.csv (${removed.length}).`);
