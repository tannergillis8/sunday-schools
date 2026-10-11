"use client";

import { useState } from "react";
import type { GameMode } from "@/types/game";
import { cn } from "@/lib/cn";
import { MODES } from "@/lib/game/modes";
import { Football } from "./Football";

interface StartScreenProps {
  totalQuestions: number;
  initialMode: GameMode;
  onStart: (mode: GameMode) => void;
}

export function StartScreen({ totalQuestions, initialMode, onStart }: StartScreenProps) {
  const [selected, setSelected] = useState<GameMode>(initialMode);

  return (
    <section className="border-[3px] border-ink bg-chalk p-6 text-ink shadow-hard sm:p-10">
      <Football className="h-12 w-20" />
      <h2 className="mt-4 font-display text-3xl sm:text-4xl">Name the college.</h2>
      <p className="mt-3 max-w-[60ch] text-lg">
        {`You get ${totalQuestions} NFL starters from the last decade or so. Type the school each one played for. Nicknames like LSU and Ole Miss work, and so does a small typo.`}
      </p>

      <fieldset className="mt-6">
        <legend className="text-base font-bold">Choose a difficulty</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {MODES.map((info) => {
            const isSelected = selected === info.mode;
            return (
              <label
                key={info.mode}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 border-[3px] border-ink p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
                  isSelected ? "bg-gold shadow-hard-sm" : "bg-white",
                  info.mode === "blended" && "sm:col-span-2",
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={info.mode}
                  checked={isSelected}
                  onChange={() => setSelected(info.mode)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-3">
                  <span className="font-display text-xl">{info.label}</span>
                  {isSelected && <span className="text-sm font-bold">Selected</span>}
                </span>
                <span className="text-base">{info.description}</span>
                <span className="text-sm font-semibold text-ink/75">{info.points}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => onStart(selected)}
        className="mt-6 h-14 w-full border-[3px] border-ink bg-gold px-8 font-display text-xl text-ink shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:w-auto"
      >
        Kick off
      </button>

      <p className="mt-6 text-sm text-ink/75">
        {"Player data from "}
        <a
          href="https://github.com/nflverse/nflverse-data"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          nflverse
        </a>
        .
      </p>
    </section>
  );
}
