import type { Difficulty } from "../../types/player";

export const QUESTIONS_PER_GAME = 10;

/** Easiest first. */
export const DIFFICULTY_ORDER: readonly Difficulty[] = ["easy", "medium", "hard", "sicko"];

export const POINTS_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 10,
  medium: 15,
  hard: 20,
  sicko: 30,
};

/** Share of a blended game given to each tier. A 10-question game is 3, 3, 2, 2. */
export const BLENDED_WEIGHTS: Record<Difficulty, number> = {
  easy: 0.3,
  medium: 0.3,
  hard: 0.2,
  sicko: 0.2,
};
