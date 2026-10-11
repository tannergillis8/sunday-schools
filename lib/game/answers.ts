import type { AnswerCheck } from "../../types/game";
import type { Player } from "../../types/player";
import { COLLEGE_ALIASES } from "./colleges";

/**
 * Reduces a typed college name to a comparable form:
 * lowercase, no accents or punctuation, "&" spelled out, no leading "the" or
 * "university of", no trailing "university", and a trailing "st" read as "state".
 */
export function normalizeCollege(input: string): string {
  let text = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

  text = text
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .replace(/^the /, "")
    .replace(/^university of /, "")
    .replace(/ university$/, "");

  const tokens = text.split(" ");
  if (tokens.length >= 2 && tokens[tokens.length - 1] === "st") {
    tokens[tokens.length - 1] = "state";
  }
  return tokens.join(" ");
}

const ALIAS_LOOKUP: ReadonlyMap<string, string> = (() => {
  const lookup = new Map<string, string>();
  for (const [canonicalName, aliases] of Object.entries(COLLEGE_ALIASES)) {
    const canonical = normalizeCollege(canonicalName);
    lookup.set(canonical, canonical);
    for (const alias of aliases) {
      lookup.set(normalizeCollege(alias), canonical);
    }
  }
  return lookup;
})();

/** Normalizes a name and maps known aliases onto one canonical form. */
export function canonicalCollege(input: string): string {
  const normalized = normalizeCollege(input);
  return ALIAS_LOOKUP.get(normalized) ?? normalized;
}

/**
 * Edit distance where inserting, deleting or replacing a letter, or swapping
 * two neighboring letters, each count as one edit.
 */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => {
    const row = new Array<number>(b.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= b.length; j++) d[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * One typo is forgiven in names of five letters or more. Two typos would let
 * "South Carolina" pass for "North Carolina", so that is never allowed.
 */
export function allowedTypos(length: number): number {
  return length < 5 ? 0 : 1;
}

/** True when two typed or stored college names should count as the same school. */
export function collegesMatch(answer: string, accepted: string): boolean {
  const a = canonicalCollege(answer);
  const b = canonicalCollege(accepted);
  if (a === "" || b === "") return false;
  if (a === b) return true;
  return editDistance(a, b) <= allowedTypos(Math.min(a.length, b.length));
}

/** Compares a typed answer to the player's college (and any transfer schools). */
export function checkAnswer(player: Player, input: string): AnswerCheck {
  const submittedAnswer = input.trim();
  const accepted = [player.college, ...(player.alternateColleges ?? [])];
  const matchedCollege =
    submittedAnswer === ""
      ? null
      : (accepted.find((college) => collegesMatch(submittedAnswer, college)) ?? null);

  return {
    isCorrect: matchedCollege !== null,
    submittedAnswer,
    correctCollege: player.college,
    matchedCollege,
  };
}
