import type { Player } from "../../types/player";
import { POINTS_BY_DIFFICULTY } from "./config";

/** Points a correct answer on this player is worth. */
export function pointsFor(player: Player): number {
  return POINTS_BY_DIFFICULTY[player.difficulty];
}

export function updateScore(score: number, player: Player, isCorrect: boolean): number {
  return isCorrect ? score + pointsFor(player) : score;
}

/** A correct answer extends the streak; a miss resets it. */
export function updateStreak(streak: number, isCorrect: boolean): number {
  return isCorrect ? streak + 1 : 0;
}

export function updateBestStreak(bestStreak: number, streak: number): number {
  return Math.max(bestStreak, streak);
}
