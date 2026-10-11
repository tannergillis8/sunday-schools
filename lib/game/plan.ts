import type { GameMode } from "../../types/game";
import type { Difficulty } from "../../types/player";
import { BLENDED_WEIGHTS, DIFFICULTY_ORDER } from "./config";

/**
 * The difficulty each question should aim for, in order.
 * A single-tier mode repeats that tier. Blended splits the game across all
 * tiers by BLENDED_WEIGHTS and climbs from easy to sicko.
 */
export function buildQuestionPlan(mode: GameMode, totalQuestions: number): Difficulty[] {
  if (mode !== "blended") {
    return Array.from({ length: totalQuestions }, () => mode);
  }

  const exact = DIFFICULTY_ORDER.map((tier) => BLENDED_WEIGHTS[tier] * totalQuestions);
  const counts = exact.map((value) => Math.floor(value + 1e-9));
  let remaining = totalQuestions - counts.reduce((sum, count) => sum + count, 0);

  // Hand out any leftover questions to the tiers with the biggest remainders.
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value + 1e-9) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    counts[index] += 1;
    remaining -= 1;
  }

  return DIFFICULTY_ORDER.flatMap((tier, index) =>
    Array.from({ length: counts[index] }, () => tier),
  );
}
