import type { Difficulty, Player } from "../../types/player";
import { DIFFICULTY_ORDER } from "./config";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPlayer(value: unknown): value is Player {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  const alternates = v.alternateColleges;
  const alternatesOk =
    alternates === undefined ||
    (Array.isArray(alternates) && alternates.every(isNonEmptyString));

  return (
    isNonEmptyString(v.id) &&
    isNonEmptyString(v.name) &&
    isNonEmptyString(v.position) &&
    isNonEmptyString(v.nflTeam) &&
    isNonEmptyString(v.college) &&
    typeof v.draftYear === "number" &&
    Number.isInteger(v.draftYear) &&
    (v.undrafted === undefined || typeof v.undrafted === "boolean") &&
    DIFFICULTY_ORDER.includes(v.difficulty as Difficulty) &&
    alternatesOk
  );
}

/** Validates raw JSON and returns typed players. Throws with a useful message. */
export function parsePlayers(data: unknown): Player[] {
  if (!Array.isArray(data)) {
    throw new Error("players.json must contain an array of players.");
  }

  const seen = new Set<string>();
  data.forEach((entry, index) => {
    if (!isPlayer(entry)) {
      throw new Error(`players.json entry #${index} is not a valid Player.`);
    }
    if (seen.has(entry.id)) {
      throw new Error(`players.json has a duplicate id: "${entry.id}".`);
    }
    seen.add(entry.id);
  });

  return data as Player[];
}
