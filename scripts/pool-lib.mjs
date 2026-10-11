/**
 * Shared inputs for the player-pool scripts: joins players.json to nflverse rows and to
 * Pro-Football-Reference honors (All-Pro, Pro Bowl, and draft-table figures for early picks).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv } from "./csv.mjs";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const read = (p) => readFileSync(resolve(ROOT, p), "utf8");

export const norm = (name) =>
  name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

const GROUPS = {
  QB: "QB", RB: "RB", FB: "FB", HB: "RB", WR: "WR", TE: "TE",
  T: "OL", G: "OL", C: "OL", OT: "OL", OG: "OL", OL: "OL", LT: "OL", RT: "OL", LG: "OL", RG: "OL",
  DE: "F7", DT: "F7", DL: "F7", NT: "F7", EDGE: "F7", LB: "F7", OLB: "F7", ILB: "F7", MLB: "F7",
  CB: "DB", S: "DB", SS: "DB", FS: "DB", DB: "DB", SAF: "DB",
  K: "ST", P: "ST", LS: "ST", PK: "ST", KR: "ST", PR: "ST", RET: "ST", ST: "ST",
};
export const group = (pos) => GROUPS[pos?.toUpperCase()] ?? pos;

/** players: array from players.json (or the full pool). csvPath: nflverse players.csv. */
export function loadPoolInputs(players, csvPath) {
  const csv = parseCsv(readFileSync(resolve(csvPath), "utf8"));
  const allpro = parseCsv(read("scripts/pfr/allpro.csv"));
  const probowl = [...parseCsv(read("scripts/pfr/probowl.csv")), ...parseCsv(read("scripts/pfr/probowl-2016-2017-supplement.csv"))];
  const draftTables = {};
  for (let y = 2011; y <= 2026; y++) draftTables[y] = parseCsv(read(`scripts/pfr/${y}.csv`));

  const rowsByKey = new Map();
  for (const row of csv) {
    const key = `${row.display_name}|${row.draft_year || "u" + row.rookie_season}`;
    (rowsByKey.get(key) ?? rowsByKey.set(key, []).get(key)).push(row);
  }
  const csvRow = (player) => {
    const rows = rowsByKey.get(`${player.name}|${player.undrafted ? "u" : ""}${player.draftYear}`) ?? [];
    if (rows.length <= 1) return rows[0];
    const pick = /-p(\d+)$/.exec(player.id)?.[1];
    return rows.find((r) => r.draft_pick === pick) ?? rows[0];
  };

  const info = new Map();
  for (const p of players) {
    const row = csvRow(p);
    info.set(p.id, {
      player: p,
      pfrId: row?.pfr_id || null,
      pick: Number(row?.draft_pick) || 999,
      rookie: Number(row?.rookie_season) || p.draftYear,
      last: Number(row?.last_season) || p.draftYear,
      grp: group(row?.position ?? p.position),
      ap1: new Set(), ap2: new Set(), pb: new Set(),
      draftAp1: 0, draftPb: 0, pfrStarts: null, wav: null, games: null, inDraftTable: false, ambiguous: false,
    });
  }

  const stats = { draftMatched: 0, draftPickMismatch: 0, honorsAmbiguous: 0, honorsNone: 0 };
  for (const [year, rows] of Object.entries(draftTables)) {
    for (const r of rows) {
      const hits = players.filter((p) => p.draftYear === Number(year) && norm(p.name) === norm(r.player));
      const f = hits.length === 1 ? info.get(hits[0].id) : hits.map((h) => info.get(h.id)).find((x) => x.pick === Number(r.pick));
      if (!f) continue;
      if (f.pick !== Number(r.pick)) { stats.draftPickMismatch++; continue; }
      stats.draftMatched++;
      f.inDraftTable = true;
      f.draftAp1 = Number(r.AP1) || 0;
      f.draftPb = Number(r.PB) || 0;
      f.pfrStarts = r.St === "" ? null : Number(r.St);
      f.wav = r.wAV === "" ? null : Number(r.wAV);
      f.games = r.G === "" ? null : Number(r.G);
    }
  }

  const byName = new Map();
  for (const f of info.values()) (byName.get(norm(f.player.name)) ?? byName.set(norm(f.player.name), []).get(norm(f.player.name))).push(f);
  const attach = (rows, field, filter) => {
    for (const r of rows) {
      if (filter && !filter(r)) continue;
      const season = Number(r.season);
      const g = group(r.pos);
      const cands = (byName.get(norm(r.player)) ?? []).filter(
        (f) => f.rookie <= season && season <= f.last && f.player.draftYear <= season && f.grp === g,
      );
      if (cands.length === 1) cands[0][field].add(season);
      else if (cands.length > 1) { stats.honorsAmbiguous++; for (const f of cands) f.ambiguous = true; }
      else stats.honorsNone++;
    }
  };
  attach(allpro, "ap1", (r) => r.team === "1st");
  attach(allpro, "ap2", (r) => r.team === "2nd");
  attach(probowl, "pb");

  return { info, stats };
}
