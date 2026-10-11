import type { Difficulty } from "../../types/player";

/**
 * Points added per rating step BELOW 5. The coefficients are the ones in the spec:
 * score = 7*(5-notoriety) + 8*(5-recognition) + 3*(5-association) + 2*(5-complexity).
 */
export const FACTOR_COEFFICIENTS = {
  playerNotoriety: 7,
  collegeRecognition: 8,
  collegeAssociation: 3,
  collegePathComplexity: 2,
} as const;

/**
 * Inclusive upper bound of each tier. Sicko runs up to MAX_SCORE.
 * The original spec used 24 / 49 / 74. These were lowered because the formula's real ceiling is 80
 * (ratings run 1-5), which left sicko nearly unreachable and medium too large.
 */
export const TIER_UPPER_BOUNDS: Record<Exclude<Difficulty, "sicko">, number> = {
  easy: 24,
  medium: 44,
  hard: 64,
};

export const MIN_SCORE = 0;
export const MAX_SCORE = 100;
export const MIN_RATING = 1;
export const MAX_RATING = 5;
