import type { FactorRatings, ScoreResult } from "../../types/difficulty";
import type { Difficulty } from "../../types/player";
import {
  FACTOR_COEFFICIENTS,
  MAX_RATING,
  MAX_SCORE,
  MIN_RATING,
  MIN_SCORE,
  TIER_UPPER_BOUNDS,
} from "./config";

const FACTOR_KEYS = Object.keys(FACTOR_COEFFICIENTS) as (keyof FactorRatings)[];

/** Returns a list of problems. An empty list means the input is a valid set of ratings. */
export function validateRatings(input: unknown): string[] {
  if (typeof input !== "object" || input === null) return ["Ratings must be an object."];
  const record = input as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of FACTOR_KEYS) {
    const value = record[key];
    if (value === undefined || value === null) {
      errors.push(`${key} is missing.`);
    } else if (typeof value !== "number" || !Number.isInteger(value)) {
      errors.push(`${key} must be an integer, got ${JSON.stringify(value)}.`);
    } else if (value < MIN_RATING || value > MAX_RATING) {
      errors.push(`${key} must be between ${MIN_RATING} and ${MAX_RATING}, got ${value}.`);
    }
  }
  return errors;
}

/** The exact spec formula, with no rounding or normalizing. Assumes valid ratings. */
export function calculateDifficultyScore(ratings: FactorRatings): number {
  return (
    FACTOR_COEFFICIENTS.playerNotoriety * (5 - ratings.playerNotoriety) +
    FACTOR_COEFFICIENTS.collegeRecognition * (5 - ratings.collegeRecognition) +
    FACTOR_COEFFICIENTS.collegeAssociation * (5 - ratings.collegeAssociation) +
    FACTOR_COEFFICIENTS.collegePathComplexity * (5 - ratings.collegePathComplexity)
  );
}

/** Maps a score to a tier using inclusive boundaries 0-24, 25-44, 45-64, 65-100. Throws on an invalid score. */
export function classifyScore(score: number): Difficulty {
  if (!Number.isInteger(score) || score < MIN_SCORE || score > MAX_SCORE) {
    throw new RangeError(`Score must be an integer from ${MIN_SCORE} to ${MAX_SCORE}, got ${score}.`);
  }
  if (score <= TIER_UPPER_BOUNDS.easy) return "easy";
  if (score <= TIER_UPPER_BOUNDS.medium) return "medium";
  if (score <= TIER_UPPER_BOUNDS.hard) return "hard";
  return "sicko";
}

/** Validates the ratings, then returns the score and tier, or the list of errors. Never guesses. */
export function scoreDifficulty(input: unknown): ScoreResult {
  const errors = validateRatings(input);
  if (errors.length > 0) return { ok: false, errors };
  const ratings = input as FactorRatings;
  const difficultyScore = calculateDifficultyScore(ratings);
  return { ok: true, difficultyScore, difficulty: classifyScore(difficultyScore) };
}
