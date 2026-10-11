import type { GameState } from "@/types/game";
import { getModeLabel } from "@/lib/game/modes";
import { getRank } from "@/lib/game/rank";
import { cn } from "@/lib/cn";

interface GameOverProps {
  state: GameState;
  onRestart: () => void;
  onChangeMode: () => void;
}

export function GameOver({ state, onRestart, onChangeMode }: GameOverProps) {
  const { score, correctCount, totalQuestions, bestStreak, history, mode } = state;

  return (
    <section
      aria-label="Final results"
      className="animate-pop border-[3px] border-ink bg-chalk p-6 text-ink shadow-hard sm:p-10"
    >
      <p className="text-lg font-bold">{`Final whistle in ${getModeLabel(mode)} mode. Your rank:`}</p>
      <h2 className="mt-1 font-display text-4xl sm:text-5xl">
        {getRank(correctCount, totalQuestions)}
      </h2>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <div className="border-[3px] border-ink bg-ink px-3 py-2">
          <dt className="text-sm font-semibold text-chalk/80">Score</dt>
          <dd className="font-display text-3xl text-gold">{score}</dd>
        </div>
        <div className="border-[3px] border-ink bg-ink px-3 py-2">
          <dt className="text-sm font-semibold text-chalk/80">Correct</dt>
          <dd className="font-display text-3xl text-gold">{`${correctCount}/${totalQuestions}`}</dd>
        </div>
        <div className="border-[3px] border-ink bg-ink px-3 py-2">
          <dt className="text-sm font-semibold text-chalk/80">Best streak</dt>
          <dd className="font-display text-3xl text-gold">{bestStreak}</dd>
        </div>
      </dl>

      <ul className="mt-6 divide-y-2 divide-ink/20 border-y-2 border-ink/20">
        {history.map((entry) => (
          <li key={entry.playerId} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="font-bold">{entry.playerName}</p>
              <p className="text-ink/80">{entry.correctCollege}</p>
            </div>
            <p
              className={cn(
                "shrink-0 border-2 border-ink px-2 py-0.5 text-sm font-bold",
                entry.isCorrect ? "bg-gold text-ink" : "bg-flag text-chalk",
              )}
            >
              {entry.isCorrect ? `Correct, +${entry.pointsEarned}` : "Missed"}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onRestart}
          autoFocus
          className="h-14 border-[3px] border-ink bg-gold px-8 font-display text-xl text-ink shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onChangeMode}
          className="h-14 border-[3px] border-ink bg-white px-8 font-display text-xl text-ink shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
        >
          Change difficulty
        </button>
      </div>
    </section>
  );
}
