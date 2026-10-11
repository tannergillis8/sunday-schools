import type { GameMode } from "../../types/game";
import { POINTS_BY_DIFFICULTY } from "./config";

export interface ModeInfo {
  mode: GameMode;
  label: string;
  description: string;
  points: string;
}

const { easy, medium, hard, sicko } = POINTS_BY_DIFFICULTY;

export const MODES: readonly ModeInfo[] = [
  {
    mode: "blended",
    label: "Blended",
    description: "A bit of everything. Starts easy and finishes at sicko.",
    points: `${easy} to ${sicko} points each`,
  },
  {
    mode: "easy",
    label: "Easy",
    description: "Stars you see every Sunday.",
    points: `${easy} points each`,
  },
  {
    mode: "medium",
    label: "Medium",
    description: "Familiar starters and fan favorites.",
    points: `${medium} points each`,
  },
  {
    mode: "hard",
    label: "Hard",
    description: "Tricky schools. No draft year.",
    points: `${hard} points each`,
  },
  {
    mode: "sicko",
    label: "Sicko",
    description: "Deep cuts. No team and no draft year.",
    points: `${sicko} points each`,
  },
];

export function getModeLabel(mode: GameMode): string {
  return MODES.find((info) => info.mode === mode)?.label ?? "Blended";
}
