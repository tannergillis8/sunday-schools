#!/usr/bin/env node
/**
 * Writes data/player-ratings.json (the per-player factor ratings).
 *
 *   node scripts/build-ratings.mjs <players.csv> [--report]
 *
 * Priority for each player:
 *   1. scripts/manual-ratings.json   hand-written entries with their own rationale
 *   2. scripts/curated-ratings.json  well-known players rated from memory of their careers
 *   3. Pro-Football-Reference honors (scripts/pfr/): All-Pro, Pro Bowl, and for the first ~105
 *      picks of each draft also career approximate value (wAV) and games
 *
 * Notoriety from honors (see notorietyFromHonors). Offensive linemen, kickers, punters and
 * long snappers drop one step unless they were first-team All-Pro, because average viewers
 * do not know them. Association is 1 for players with notoriety 1-2, otherwise 2, unless curated.
 * Anything matched by name alone to an ambiguous list entry, and the newest draft classes,
 * are marked unsure. Multi-school players are never marked confirmed here.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, loadPoolInputs, read } from "./pool-lib.mjs";

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const report = args.includes("--report");
if (!csvPath) { console.error("Usage: node scripts/build-ratings.mjs <players.csv> [--report]"); process.exit(1); }

const players = JSON.parse(read("data/players.json"));
const manual = JSON.parse(read("scripts/manual-ratings.json"));
const curated = JSON.parse(read("scripts/curated-ratings.json"));
const { info, stats: poolStats } = loadPoolInputs(players, csvPath);
const LOW_PROFILE = new Set(["OL", "ST"]);

// ---------- notoriety ----------
function notorietyFromHonors(f) {
  const ap1 = Math.max(f.ap1.size, f.draftAp1);
  const ap2 = f.ap2.size;
  const pb = Math.max(f.pb.size, f.draftPb);
  const seasons = Math.max(1, f.last - f.rookie + 1);
  const wav = f.wav;
  let n;
  if (ap1 >= 3 || (ap1 >= 2 && pb >= 5)) n = 5;
  else if (ap1 >= 2 || pb >= 5 || (ap1 >= 1 && pb >= 3)) n = 4;
  else if (pb >= 1 || ap1 >= 1 || ap2 >= 1 || (wav !== null && wav >= 60)) n = 3;
  else if ((wav !== null && wav >= 25) || (wav === null && seasons >= 6)) n = 2;
  else n = 1;
  if (f.grp === "QB" && n < 3 && ((wav !== null && wav >= 30) || pb >= 1)) n = 3;
  if (LOW_PROFILE.has(f.grp) && ap1 < 1 && n > 1) n -= 1;
  return { n, ap1, ap2, pb, seasons, wav };
}

// ---------- build ----------
const curatedN = new Map();
for (const level of [3, 4, 5]) for (const key of curated[`notoriety${level}`]) curatedN.set(key, level);
const curatedA = new Map(Object.entries(curated.association));
const manualById = new Map(manual.map((e) => [e.id, e]));

const out = [];
const stats = { manual: 0, curated: 0, honors: 0, unsure: 0 };
for (const player of players) {
  if (manualById.has(player.id)) { out.push(manualById.get(player.id)); stats.manual++; continue; }
  const f = info.get(player.id);
  const key = `${player.name} ${player.draftYear}`;
  const multi = (player.alternateColleges ?? []).length;
  const path = multi === 0 ? 1 : multi === 1 ? 3 : 4;
  const curatedLevel = curatedN.get(key);

  let n, confidence, note, sources;
  if (curatedLevel) {
    n = curatedLevel; confidence = "confident"; stats.curated++;
    note = "Notoriety judged from memory of career honors; no source attached.";
    sources = ["model-judgment", "pro-football-reference.com"];
  } else {
    stats.honors++;
    const h = notorietyFromHonors(f);
    n = h.n;
    const recent = player.draftYear >= 2025;
    if (player.draftYear < 2011 && !player.undrafted) {
      confidence = "unsure";
      note = `Drafted ${player.draftYear}, before the honors data starts (2011); notoriety undercounts earlier honors.`;
    } else if (recent) {
      n = f.pick <= 5 ? 3 : f.pick <= 32 ? 2 : 1;
      confidence = "unsure";
      note = `Drafted #${f.pick}; too early in the career for honors. Estimated from draft slot.`;
    } else {
      confidence = f.ambiguous ? "unsure" : "confident";
      const bits = [];
      if (h.ap1) bits.push(`${h.ap1}x 1st-team All-Pro`);
      if (h.ap2) bits.push(`${h.ap2}x 2nd-team`);
      if (h.pb) bits.push(`${h.pb} Pro Bowl${h.pb > 1 ? "s" : ""}`);
      if (h.wav !== null) bits.push(`wAV ${h.wav}`);
      bits.push(`${h.seasons} season${h.seasons > 1 ? "s" : ""}`);
      note = `PFR: ${bits.join(", ")}.${LOW_PROFILE.has(f.grp) ? " Linemen and specialists score one lower unless 1st-team All-Pro." : ""}${f.ambiguous ? " A same-name player made an honors list; check." : ""}`;
    }
    sources = ["pro-football-reference.com"];
  }

  let assoc;
  if (curatedA.has(key)) assoc = curatedA.get(key);
  else if (curatedLevel) assoc = 3;
  else assoc = n <= 2 ? 1 : 2;

  if (confidence === "unsure") stats.unsure++;
  out.push({
    id: player.id,
    playerNotoriety: n,
    collegeAssociation: assoc,
    collegePathComplexity: path,
    ...(multi > 0 ? { canonicalConfirmed: false } : {}),
    rationale: note,
    sources,
    confidence,
  });
}

writeFileSync(resolve(ROOT, "data/player-ratings.json"), "[\n" + out.map((e) => "  " + JSON.stringify(e)).join(",\n") + "\n]\n");
console.log(`Wrote ${out.length} ratings`, stats);
if (report) {
  console.log("PFR join:", poolStats);
  const dist = {};
  for (const e of out) dist[e.playerNotoriety] = (dist[e.playerNotoriety] ?? 0) + 1;
  console.log("Notoriety distribution:", dist);
}
