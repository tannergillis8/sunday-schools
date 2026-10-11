import { cn } from "@/lib/cn";

interface GameHeaderProps {
  /** Smaller title while a game is in progress. */
  compact: boolean;
  /** Shown under the compact title, e.g. "Sicko". */
  modeLabel?: string;
}

export function GameHeader({ compact, modeLabel }: GameHeaderProps) {
  return (
    <header className={cn("text-center", compact ? "pt-1" : "pt-6 sm:pt-12")}>
      <h1
        className={cn(
          "font-display leading-none text-chalk [text-shadow:4px_4px_0_#14213d]",
          compact ? "text-3xl sm:text-4xl" : "text-5xl sm:text-7xl",
        )}
      >
        Sunday Schools
      </h1>
      {!compact && (
        <p className="mt-4 text-lg font-semibold text-chalk/90">
          The NFL college trivia game
        </p>
      )}
      {compact && modeLabel && (
        <p className="mt-2 text-base font-semibold text-chalk/90">{`${modeLabel} mode`}</p>
      )}
    </header>
  );
}
