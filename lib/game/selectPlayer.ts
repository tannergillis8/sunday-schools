import type { Difficulty, Player } from "../../types/player";
import { DIFFICULTY_ORDER } from "./config";

/** Returns a number in [0, 1), like Math.random. Injectable for tests. */
export type Rng = () => number;

/** Players that have not been used yet in the current game. */
export function getAvailablePlayers(
  players: readonly Player[],
  usedIds: readonly string[],
): Player[] {
  const used = new Set(usedIds);
  return players.filter((player) => !used.has(player.id));
}

/**
 * Picks a random player that is not in `usedIds`.
 * Returns null when every player has already been used.
 */
export function selectRandomPlayer(
  players: readonly Player[],
  usedIds: readonly string[],
  rng: Rng = Math.random,
): Player | null {
  const available = getAvailablePlayers(players, usedIds);
  if (available.length === 0) return null;

  const index = Math.min(Math.floor(rng() * available.length), available.length - 1);
  return available[index];
}

/**
 * Picks a random unused player from one difficulty tier. If that tier has run
 * out, falls back to the nearest tier (preferring the easier one on a tie), so
 * a game never stalls on a small data set.
 */
export function selectPlayerForTier(
  players: readonly Player[],
  tier: Difficulty,
  usedIds: readonly string[],
  rng: Rng = Math.random,
): Player | null {
  const target = DIFFICULTY_ORDER.indexOf(tier);
  const nearestFirst = [...DIFFICULTY_ORDER].sort(
    (a, b) =>
      Math.abs(DIFFICULTY_ORDER.indexOf(a) - target) -
        Math.abs(DIFFICULTY_ORDER.indexOf(b) - target) ||
      DIFFICULTY_ORDER.indexOf(a) - DIFFICULTY_ORDER.indexOf(b),
  );

  for (const candidate of nearestFirst) {
    const inTier = players.filter((player) => player.difficulty === candidate);
    const picked = selectRandomPlayer(inTier, usedIds, rng);
    if (picked) return picked;
  }
  return null;
}
