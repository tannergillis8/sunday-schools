import type { ReactNode } from "react";
import type { Player } from "@/types/player";
import { getHints } from "@/lib/game/hints";
import { pointsFor } from "@/lib/game/scoring";

interface PlayerCardProps {
  player: Player;
  /** The answer form or the feedback, shown under the player. */
  children: ReactNode;
}

const DIFFICULTY_LABEL: Record<Player["difficulty"], string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  sicko: "Sicko",
};

export function PlayerCard({ player, children }: PlayerCardProps) {
  const hints = getHints(player.difficulty);

  return (
    <section
      aria-label="Current player"
      className="border-[3px] border-ink bg-chalk p-5 text-ink shadow-hard sm:p-8"
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-3">
        <span className="grid size-14 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-gold font-display text-lg">
          {player.position}
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <p className="text-lg font-bold leading-tight">
            {hints.showTeam ? player.nflTeam : "Team hidden"}
          </p>
          <p className="text-base text-ink/75">
            {hints.showDraftYear
              ? player.undrafted
                ? `Undrafted, rookie in ${player.draftYear}`
                : `Drafted in ${player.draftYear}`
              : "Draft year hidden"}
          </p>
        </div>
        <p className="ml-auto shrink-0 whitespace-nowrap border-2 border-ink px-2 py-1 text-sm font-semibold">
          {`${DIFFICULTY_LABEL[player.difficulty]}, ${pointsFor(player)} pts`}
        </p>
      </div>

      <h2 className="mt-6 break-words font-display text-4xl leading-[1.05] sm:text-6xl">
        {player.name}
      </h2>
      <p className="mt-3 text-lg text-ink/80">Which college did this player come from?</p>

      <div className="mt-6 border-t-[3px] border-dashed border-ink/30 pt-6">{children}</div>
    </section>
  );
}
