"use client";

import { useState, type FormEvent } from "react";

interface AnswerFormProps {
  onSubmit: (answer: string) => void;
}

export function AnswerForm({ onSubmit }: AnswerFormProps) {
  const [answer, setAnswer] = useState("");
  const canSubmit = answer.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit(answer);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label htmlFor="college-answer" className="text-base font-bold">
        Your answer
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="college-answer"
          type="text"
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          placeholder="Type a college"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="go"
          className="h-14 min-w-0 flex-1 border-[3px] border-ink bg-white px-4 text-lg font-semibold text-ink placeholder:font-normal placeholder:text-ink/55 focus:bg-gold/20"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-14 border-[3px] border-ink bg-gold px-6 font-display text-lg text-ink shadow-hard-sm transition-none enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Lock it in
        </button>
      </div>
    </form>
  );
}
