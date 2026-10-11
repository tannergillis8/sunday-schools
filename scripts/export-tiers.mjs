#!/usr/bin/env node
/**
 * Writes every player and their tier to a CSV you can open in Excel, Numbers
 * or Google Sheets.
 *
 *   node scripts/export-tiers.mjs [output.csv]
 *
 * Edit the Tier column, save as CSV, then run scripts/import-tiers.mjs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toCsv } from "./csv.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ORDER = ["easy", "medium", "hard", "sicko"];

const outPath = resolve(process.argv[2] ?? resolve(ROOT, "players-tiers.csv"));
const players = JSON.parse(readFileSync(resolve(ROOT, "data/players.json"), "utf8"));
const overrides = JSON.parse(readFileSync(resolve(ROOT, "scripts/difficulty-overrides.json"), "utf8"));

const rows = [...players].sort(
  (a, b) => ORDER.indexOf(a.difficulty) - ORDER.indexOf(b.difficulty) || a.name.localeCompare(b.name),
);

const header = ["Name", "Position", "Team", "School", "Draft year", "Tier", "Also attended", "Hand-set", "id"];
const body = rows.map((p) => [
  p.name,
  p.position,
  p.nflTeam,
  p.college,
  p.draftYear,
  p.difficulty,
  (p.alternateColleges ?? []).join("; "),
  overrides[p.id] ? "yes" : "",
  p.id,
]);

// The byte-order mark makes Excel read accents correctly.
writeFileSync(outPath, "﻿" + toCsv([header, ...body]));
console.log(`Wrote ${rows.length} players to ${outPath}`);
