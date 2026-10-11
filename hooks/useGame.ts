"use client";

import { useCallback, useState } from "react";
import type { GameMode, GameState } from "../types/game";
import type { Player } from "../types/player";
import { createInitialState, nextQuestion, startGame, submitAnswer } from "../lib/game/gameState";

/**
 * Connects the pure game functions to React state.
 * All rules live in lib/game; this hook only holds the current state.
 */
export function useGame(players: readonly Player[]) {
  const [state, setState] = useState<GameState>(() => createInitialState());

  // Random picks happen here, outside state updaters, so updaters stay pure.
  const start = useCallback(
    (mode: GameMode) => {
      setState(startGame(players, mode));
    },
    [players],
  );

  /** Another game in the same mode. */
  const restart = useCallback(() => {
    setState(startGame(players, state.mode));
  }, [players, state.mode]);

  /** Back to the start screen, remembering the last mode. */
  const backToMenu = useCallback(() => {
    setState((current) => createInitialState(undefined, current.mode));
  }, []);

  const submit = useCallback((answer: string) => {
    setState((current) => submitAnswer(current, answer));
  }, []);

  const next = useCallback(() => {
    setState(nextQuestion(state, players));
  }, [state, players]);

  return { state, start, restart, backToMenu, submit, next };
}
