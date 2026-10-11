import type { GameMode, GameState } from "../../types/game";
import type { Player } from "../../types/player";
import { checkAnswer } from "./answers";
import { QUESTIONS_PER_GAME } from "./config";
import { buildQuestionPlan } from "./plan";
import { pointsFor, updateBestStreak, updateScore, updateStreak } from "./scoring";
import { selectPlayerForTier, type Rng } from "./selectPlayer";

/** The state before a game starts (the title screen). */
export function createInitialState(
  totalQuestions: number = QUESTIONS_PER_GAME,
  mode: GameMode = "blended",
): GameState {
  return {
    phase: "idle",
    mode,
    plan: [],
    totalQuestions,
    questionNumber: 0,
    currentPlayer: null,
    usedPlayerIds: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    lastResult: null,
    history: [],
  };
}

/** Starts a fresh game in the given mode with a random first player. */
export function startGame(
  players: readonly Player[],
  mode: GameMode = "blended",
  rng: Rng = Math.random,
  questionsPerGame: number = QUESTIONS_PER_GAME,
): GameState {
  const totalQuestions = Math.min(questionsPerGame, players.length);
  const plan = buildQuestionPlan(mode, totalQuestions);
  const first = plan.length > 0 ? selectPlayerForTier(players, plan[0], [], rng) : null;
  if (!first) return createInitialState(totalQuestions, mode);

  return {
    ...createInitialState(totalQuestions, mode),
    phase: "answering",
    plan,
    questionNumber: 1,
    currentPlayer: first,
    usedPlayerIds: [first.id],
  };
}

/**
 * Checks the typed answer and updates score and streak.
 * Ignored unless a question is waiting for an answer and the answer is not blank.
 */
export function submitAnswer(state: GameState, input: string): GameState {
  const player = state.currentPlayer;
  if (state.phase !== "answering" || !player || input.trim() === "") return state;

  const check = checkAnswer(player, input);
  const pointsEarned = check.isCorrect ? pointsFor(player) : 0;
  const streak = updateStreak(state.streak, check.isCorrect);

  return {
    ...state,
    phase: "feedback",
    score: updateScore(state.score, player, check.isCorrect),
    streak,
    bestStreak: updateBestStreak(state.bestStreak, streak),
    correctCount: state.correctCount + (check.isCorrect ? 1 : 0),
    lastResult: { ...check, pointsEarned },
    history: [
      ...state.history,
      {
        playerId: player.id,
        playerName: player.name,
        correctCollege: player.college,
        submittedAnswer: check.submittedAnswer,
        isCorrect: check.isCorrect,
        pointsEarned,
      },
    ],
  };
}

/** True when the question on screen is the last one of the game. */
export function isFinalQuestion(state: GameState): boolean {
  return state.questionNumber >= state.totalQuestions;
}

/**
 * Moves on from the feedback screen: to the next unused player, or to the
 * results once the game has asked every question.
 */
export function nextQuestion(
  state: GameState,
  players: readonly Player[],
  rng: Rng = Math.random,
): GameState {
  if (state.phase !== "feedback") return state;

  // plan[questionNumber] is the tier for the question after the current one.
  const tier = state.plan[state.questionNumber];
  const next =
    isFinalQuestion(state) || !tier
      ? null
      : selectPlayerForTier(players, tier, state.usedPlayerIds, rng);

  if (!next) {
    return { ...state, phase: "finished", currentPlayer: null, lastResult: null };
  }

  return {
    ...state,
    phase: "answering",
    questionNumber: state.questionNumber + 1,
    currentPlayer: next,
    usedPlayerIds: [...state.usedPlayerIds, next.id],
    lastResult: null,
  };
}
