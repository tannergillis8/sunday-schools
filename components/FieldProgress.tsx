import type { HistoryEntry } from "@/types/game";
import { cn } from "@/lib/cn";
import { Football } from "./Football";

interface FieldProgressProps {
  history: readonly HistoryEntry[];
  totalQuestions: number;
  /** 0-based index of the question on screen. */
  currentIndex: number;
}

/** One yard marker per question. The ball sits on the question being played. */
export function FieldProgress({ history, totalQuestions, currentIndex }: FieldProgressProps) {
  const ballLeft = ((currentIndex + 0.5) / totalQuestions) * 100;

  return (
    <div className="relative pt-8">
      <div
        aria-hidden="true"
        className="absolute top-0 -translate-x-1/2 motion-safe:transition-[left] motion-safe:duration-300"
        style={{ left: `${ballLeft}%` }}
      >
        <Football className="h-7 w-11" />
      </div>
      <ol
        aria-label="Question results"
        className="grid border-[3px] border-chalk bg-turf-deep"
        style={{ gridTemplateColumns: `repeat(${totalQuestions}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalQuestions }, (_, index) => {
          const entry = history[index];
          const isCurrent = index === currentIndex && !entry;
          const status = entry
            ? entry.isCorrect
              ? "correct"
              : "missed"
            : isCurrent
              ? "up next"
              : "to come";

          return (
            <li
              key={index}
              className={cn(
                "flex h-9 items-center justify-center border-l-2 border-chalk/50 font-display text-sm first:border-l-0",
                entry?.isCorrect && "bg-gold text-ink",
                entry && !entry.isCorrect && "bg-flag text-chalk",
                isCurrent && "bg-chalk text-ink",
                !entry && !isCurrent && "text-chalk/60",
              )}
            >
              {index + 1}
              <span className="sr-only">{`: ${status}`}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
