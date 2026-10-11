import collegeData from "../../data/college-recognition.json";
import ratingData from "../../data/player-ratings.json";
import type { CollegeRecognitionEntry, DifficultyRecord, PlayerRatingEntry } from "../../types/difficulty";
import type { Player } from "../../types/player";
import { evaluatePlayer } from "./evaluate";

export const collegeRecognition = collegeData as unknown as Record<string, CollegeRecognitionEntry>;
export const playerRatingEntries = ratingData as unknown as PlayerRatingEntry[];

const entryById = new Map(playerRatingEntries.map((entry) => [entry.id, entry]));

/** Audit record for every player. Unrated players come back with needsReview set. */
export function buildDifficultyRecords(players: readonly Player[]): DifficultyRecord[] {
  return players.map((player) => evaluatePlayer(player, collegeRecognition, entryById.get(player.id)));
}
