/** A title for the final results, based on how many answers were right. */
export function getRank(correctCount: number, totalQuestions: number): string {
  if (totalQuestions <= 0) return "Still in the stands";
  const ratio = correctCount / totalQuestions;
  if (ratio >= 0.9) return "Hall of Fame";
  if (ratio >= 0.7) return "Pro Bowler";
  if (ratio >= 0.5) return "Starter";
  if (ratio >= 0.3) return "Practice squad";
  return "Still in the stands";
}
