import playersData from "../data/players.json";
import { parsePlayers } from "./game/players";

/**
 * The full question pool, validated once at module load.
 * Each player's tier is the hand-checked tier stored in data/players.json
 * (kept in sync with master-list.csv; see the README).
 */
export const players = parsePlayers(playersData);
