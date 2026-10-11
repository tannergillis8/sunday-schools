"use client";

import { useGame } from "@/hooks/useGame";
import { isFinalQuestion } from "@/lib/game/gameState";
import { getModeLabel } from "@/lib/game/modes";
import { players } from "@/lib/players";
import { AnswerForm } from "./AnswerForm";
import { Feedback } from "./Feedback";
import { FieldProgress } from "./FieldProgress";
import { GameHeader } from "./GameHeader";
import { GameOver } from "./GameOver";
import { PlayerCard } from "./PlayerCard";
import { ScoreBoard } from "./ScoreBoard";
import { StartScreen } from "./StartScreen";

export default function Game() {
  const { state, start, restart, backToMenu, submit, next } = useGame(players);
  const { phase, currentPlayer, lastResult } = state;
  const inRound = phase === "answering" || phase === "feedback";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 pb-10 pt-5 sm:pt-8">
      <GameHeader compact={phase !== "idle"} modeLabel={getModeLabel(state.mode)} />

      {phase === "idle" && (
        <StartScreen
          totalQuestions={state.totalQuestions}
          initialMode={state.mode}
          onStart={start}
        />
      )}

      {inRound && currentPlayer && (
        <>
          <ScoreBoard
            questionNumber={state.questionNumber}
            totalQuestions={state.totalQuestions}
            score={state.score}
            streak={state.streak}
          />
          <FieldProgress
            history={state.history}
            totalQuestions={state.totalQuestions}
            currentIndex={state.questionNumber - 1}
          />
          <PlayerCard key={currentPlayer.id} player={currentPlayer}>
            {phase === "answering" && <AnswerForm onSubmit={submit} />}
            {phase === "feedback" && lastResult && (
              <Feedback
                player={currentPlayer}
                result={lastResult}
                streak={state.streak}
                isFinalQuestion={isFinalQuestion(state)}
                onNext={next}
              />
            )}
          </PlayerCard>
        </>
      )}

      {phase === "finished" && (
        <GameOver state={state} onRestart={restart} onChangeMode={backToMenu} />
      )}
    </main>
  );
}
