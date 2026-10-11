import type { Difficulty } from "../../types/player";

export interface Hints {
  showTeam: boolean;
  showDraftYear: boolean;
}

/** Harder tiers give fewer clues. Position and name are always shown. */
export function getHints(difficulty: Difficulty): Hints {
  switch (difficulty) {
    case "easy":
    case "medium":
      return { showTeam: true, showDraftYear: true };
    case "hard":
      return { showTeam: true, showDraftYear: false };
    case "sicko":
      return { showTeam: false, showDraftYear: false };
  }
}
