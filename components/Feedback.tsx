import type { AnswerResult } from "@/types/game";
import type { Player } from "@/types/player";
import { cn } from "@/lib/cn";

interface FeedbackProps {
  player: Player;
  result: AnswerResult;
  streak: number;
  isFinalQuestion: boolean;
  onNext: () => void;
}

export function Feedback({ player, result, streak, isFinalQuestion, onNext }: FeedbackProps) {
  const { isCorrect, correctCollege, matchedCollege, submittedAnswer, pointsEarned } = result;
  const matchedTransferSchool = isCorrect && matchedCollege !== null && matchedCollege !== correctCollege;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "animate-pop border-[3px] border-ink p-4 sm:p-5",
          isCorrect ? "bg-gold text-ink" : "bg-flag text-chalk",
        )}
      >
        <p className="font-display text-3xl">{isCorrect ? "Correct!" : "Not quite."}</p>
        <p className="mt-2 text-lg font-semibold">
          {`${player.name} came out of ${correctCollege}.`}
        </p>
        {isCorrect ? (
          <p className="mt-1 text-lg">
            {`You earned ${pointsEarned} points.`}
            {streak >= 2 && ` That makes ${streak} in a row.`}
          </p>
        ) : (
          <p className="mt-1 text-lg">{`You answered ${submittedAnswer}.`}</p>
        )}
        {matchedTransferSchool && (
          <p className="mt-1 text-base">{`${matchedCollege} counts too, since he played there before transferring.`}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        autoFocus
        className="h-14 border-[3px] border-ink bg-ink px-6 font-display text-lg text-gold shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:self-end"
      >
        {isFinalQuestion ? "See results" : "Next question"}
      </button>
    </div>
  );
}
