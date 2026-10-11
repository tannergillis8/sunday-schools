export type Difficulty = "easy" | "medium" | "hard" | "sicko";

export interface Player {
  id: string;
  name: string;
  position: string;
  /** Team the player is best known with (current team for active players). */
  nflTeam: string;
  /** The college the player was drafted out of. This is the answer. */
  college: string;
  /** Draft year. For undrafted players this is their rookie season (see `undrafted`). */
  draftYear: number;
  /** True when the player was never drafted. */
  undrafted?: boolean;
  difficulty: Difficulty;
  /**
   * Optional: other schools the player attended (transfers). Typing one of
   * these also counts as correct, but the reveal still shows `college`.
   */
  alternateColleges?: string[];
}
