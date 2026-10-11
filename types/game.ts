import type { Difficulty, Player } from "./player";

export type GamePhase = "idle" | "answering" | "feedback" | "finished";

/** "blended" mixes all tiers in one game; the others use a single tier. */
export type GameMode = "blended" | Difficulty;

/** Outcome of comparing a typed answer to a player's college. */
export interface AnswerCheck {
  isCorrect: boolean;
  submittedAnswer: string;
  /** The college the player was drafted out of. */
  correctCollege: string;
  /** Which accepted college the answer matched, or null when wrong. */
  matchedCollege: string | null;
}

export interface AnswerResult extends AnswerCheck {
  pointsEarned: number;
}

export interface HistoryEntry {
  playerId: string;
  playerName: string;
  correctCollege: string;
  submittedAnswer: string;
  isCorrect: boolean;
  pointsEarned: number;
}

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  /** The difficulty each question is aiming for, in order. */
  plan: Difficulty[];
  totalQuestions: number;
  /** 1-based. 0 before the game starts. */
  questionNumber: number;
  currentPlayer: Player | null;
  usedPlayerIds: string[];
  score: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  lastResult: AnswerResult | null;
  history: HistoryEntry[];
}
