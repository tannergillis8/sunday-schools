import type { Difficulty } from "./player";

/** Every factor is an integer from 1 (lowest) to 5 (highest). */
export type Rating = 1 | 2 | 3 | 4 | 5;

export interface FactorRatings {
  /** How famous the player is (weight 35%). */
  playerNotoriety: Rating;
  /** How recognizable the college's football program is (weight 40%). */
  collegeRecognition: Rating;
  /** How strongly the player and college are linked in public memory (weight 15%). */
  collegeAssociation: Rating;
  /** How complicated the player's college history is (weight 10%). */
  collegePathComplexity: Rating;
}

export type ScoreResult =
  | { ok: true; difficultyScore: number; difficulty: Difficulty }
  | { ok: false; errors: string[] };

/** How sure the rater was. Anything but "confident" sets needsReview. */
export type Confidence = "confident" | "unsure";

/** One reusable rating per school, kept in data/college-recognition.json. */
export interface CollegeRecognitionEntry {
  rating: Rating;
  /** Documented facts the rating rests on. */
  evidence: string;
  /** "unsure" sends every player from this school to review. */
  confidence: Confidence;
}

/** Player-specific input, kept in data/player-ratings.json. */
export interface PlayerRatingEntry {
  id: string;
  playerNotoriety: Rating;
  collegeAssociation: Rating;
  collegePathComplexity: Rating;
  /** Every college attended. Defaults to the player's school plus alternateColleges. */
  collegesAttended?: string[];
  /** The answer shown to the player. Defaults to the player's school. */
  canonicalCollege?: string;
  /** True when the canonical answer for a multi-school player was confirmed. Single-school players need no confirmation. */
  canonicalConfirmed?: boolean;
  /** Short explanation of the three player-level ratings. */
  rationale: string;
  /** Where the facts came from. */
  sources?: string[];
  /** "unsure" means the ratings are an estimate that needs a person's check. */
  confidence: Confidence;
}

/** The full audit record for one player. */
export interface DifficultyRecord {
  id: string;
  name: string;
  /** Null when the factor has not been rated yet. */
  playerNotoriety: Rating | null;
  collegeRecognition: Rating | null;
  collegeAssociation: Rating | null;
  collegePathComplexity: Rating | null;
  /** Null when any factor is missing or invalid. */
  difficultyScore: number | null;
  difficulty: Difficulty | null;
  difficultyReason: string;
  needsReview: boolean;
  /** Why the record needs review. Empty when it does not. */
  reviewReasons: string[];
  collegesAttended: string[];
  canonicalCollege: string;
}
