#!/usr/bin/env node
/**
 * Reads a CSV saved from the tiers spreadsheet and applies any tier changes.
 *
 *   node scripts/import-tiers.mjs players-tiers.csv [--dry-run]
 *
 * Only the "id" and "Tier" columns are used, so other edits are ignored.
 * Each changed player is written to data/players.json (the game uses it right
 * away) and to scripts/difficulty-overrides.json (so `npm run players` keeps it).
 * Players whose tier you did not change are left alone.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TIERS = ["easy", "medium", "hard", "sicko"];
const PLAYERS_PATH = resolve(ROOT, "data/players.json");
const OVERRIDES_PATH = resolve(ROOT, "scripts/difficulty-overrides.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const csvPath = args.find((a) => !a.startsWith("--"));
if (!csvPath) {
  console.error("Usage: node scripts/import-tiers.mjs <file.csv> [--dry-run]");
  process.exit(1);
}

const rows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
const find = (row, name) => row[Object.keys(row).find((key) => key.toLowerCase() === name)] ?? "";
if (rows.length === 0 || !("id" in Object.fromEntries(Object.keys(rows[0]).map((k) => [k.toLowerCase(), 1]))) ||
    !("tier" in Object.fromEntries(Object.keys(rows[0]).map((k) => [k.toLowerCase(), 1])))) {
  console.error('This file needs "id" and "Tier" columns. Export one with: npm run tiers:export');
  process.exit(1);
}

const players = JSON.parse(readFileSync(PLAYERS_PATH, "utf8"));
const byId = new Map(players.map((p) => [p.id, p]));
const overrides = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));

const changes = [];
const unknownIds = [];
const badTiers = [];
for (const [index, row] of rows.entries()) {
  const id = find(row, "id").trim();
  const tier = find(row, "tier").trim().toLowerCase();
  if (!id || !tier) continue;
  const line = index + 2; // header is line 1
  const player = byId.get(id);
  if (!player) { unknownIds.push(`line ${line}: ${id}`); continue; }
  if (!TIERS.includes(tier)) { badTiers.push(`line ${line}: ${player.name} has "${find(row, "tier").trim()}"`); continue; }
  if (player.difficulty !== tier) changes.push({ player, from: player.difficulty, to: tier });
}

console.log(`Read ${rows.length} rows. ${changes.length} tier change(s).`);
for (const { player, from, to } of changes.slice(0, 25)) {
  console.log(`  ${player.name} (${player.position}, ${player.college}, ${player.draftYear}): ${from} -> ${to}`);
}
if (changes.length > 25) console.log(`  ...and ${changes.length - 25} more`);
if (badTiers.length) console.log(`\nSkipped rows with a tier that is not easy, medium, hard or sicko:\n  ${badTiers.join("\n  ")}`);
if (unknownIds.length) console.log(`\nSkipped rows whose id is not in data/players.json:\n  ${unknownIds.join("\n  ")}`);

if (dryRun) {
  console.log("\nDry run: nothing was written.");
} else if (changes.length === 0) {
  console.log("\nNothing to write.");
} else {
  for (const { player, to } of changes) {
    player.difficulty = to;
    overrides[player.id] = to;
  }
  const lines = players.map((p) => "  " + JSON.stringify(p));
  writeFileSync(PLAYERS_PATH, `[\n${lines.join(",\n")}\n]\n`);
  writeFileSync(OVERRIDES_PATH, JSON.stringify(overrides, null, 2) + "\n");
  console.log("\nUpdated data/players.json and scripts/difficulty-overrides.json.");
}
