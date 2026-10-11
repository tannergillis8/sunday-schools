import type {
  CollegeRecognitionEntry,
  DifficultyRecord,
  PlayerRatingEntry,
} from "../../types/difficulty";
import type { Player } from "../../types/player";
import { scoreDifficulty } from "./score";

export type CollegeRecognitionTable = Readonly<Record<string, CollegeRecognitionEntry>>;

/**
 * Builds the audit record for one player. Anything missing, unsure or ambiguous
 * sets needsReview and says why. It never fills in a rating that was not provided.
 */
export function evaluatePlayer(
  player: Pick<Player, "id" | "name" | "college" | "alternateColleges">,
  schools: CollegeRecognitionTable,
  entry: PlayerRatingEntry | undefined,
): DifficultyRecord {
  const reviewReasons: string[] = [];

  const defaultColleges = [player.college, ...(player.alternateColleges ?? [])];
  const collegesAttended = [...(entry?.collegesAttended ?? defaultColleges)];
  const canonicalCollege = entry?.canonicalCollege ?? player.college;

  if (!entry) {
    reviewReasons.push("No player ratings have been entered.");
  } else {
    if (!collegesAttended.includes(canonicalCollege)) {
      reviewReasons.push("canonicalCollege is not in collegesAttended.");
    }
    if (collegesAttended.length > 1 && !entry.canonicalConfirmed) {
      reviewReasons.push("Several colleges attended and the canonical answer is not confirmed.");
    }
    if (canonicalCollege !== player.college) {
      reviewReasons.push(`Canonical college "${canonicalCollege}" differs from players.json ("${player.college}").`);
    }
    if (entry.confidence !== "confident") reviewReasons.push("Player ratings were marked unsure.");
    if (!entry.sources || entry.sources.length === 0) reviewReasons.push("No sources listed.");
  }

  const school = schools[canonicalCollege];
  if (!school) reviewReasons.push(`No college recognition rating for "${canonicalCollege}".`);
  else if (school.confidence !== "confident") reviewReasons.push(`College recognition for "${canonicalCollege}" was marked unsure.`);

  const ratings = {
    playerNotoriety: entry?.playerNotoriety ?? null,
    collegeRecognition: school?.rating ?? null,
    collegeAssociation: entry?.collegeAssociation ?? null,
    collegePathComplexity: entry?.collegePathComplexity ?? null,
  };

  const result = scoreDifficulty(ratings);
  if (!result.ok && entry && school) reviewReasons.push(...result.errors);

  const base = { id: player.id, name: player.name, ...ratings, collegesAttended, canonicalCollege };

  if (!result.ok) {
    return {
      ...base,
      difficultyScore: null,
      difficulty: null,
      difficultyReason: "Not classified: one or more factor ratings are missing or invalid.",
      needsReview: true,
      reviewReasons,
    };
  }

  const reason = entry
    ? `Notoriety ${ratings.playerNotoriety}, college ${ratings.collegeRecognition}, association ${ratings.collegeAssociation}, path ${ratings.collegePathComplexity}. ${entry.rationale}`
    : "Not rated.";
  return {
    ...base,
    difficultyScore: result.difficultyScore,
    difficulty: result.difficulty,
    difficultyReason: reason,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
  };
}
