import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Difficulty, Player } from "../../types/player";
import {
  canonicalCollege,
  checkAnswer,
  collegesMatch,
  editDistance,
  normalizeCollege,
} from "./answers";
import { DIFFICULTY_ORDER } from "./config";
import { createInitialState, isFinalQuestion, nextQuestion, startGame, submitAnswer } from "./gameState";
import { getHints } from "./hints";
import { buildQuestionPlan } from "./plan";
import { parsePlayers } from "./players";
import { getRank } from "./rank";
import { pointsFor, updateBestStreak, updateScore, updateStreak } from "./scoring";
import { getAvailablePlayers, selectPlayerForTier, selectRandomPlayer } from "./selectPlayer";

/** Small deterministic random number generator so tests are repeatable. */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makePlayer(index: number, overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${index}`,
    name: `Player ${index}`,
    position: "QB",
    nflTeam: "Test Team",
    college: `College ${index}`,
    draftYear: 2020,
    difficulty: "medium",
    ...overrides,
  };
}

/** Twelve medium players. */
const pool: Player[] = Array.from({ length: 12 }, (_, i) => makePlayer(i + 1));

/** Ten players in each of the four tiers. */
const tieredPool: Player[] = DIFFICULTY_ORDER.flatMap((tier, tierIndex) =>
  Array.from({ length: 10 }, (_, i) =>
    makePlayer(tierIndex * 10 + i + 1, { difficulty: tier, college: `${tier} College ${i + 1}` }),
  ),
);

describe("selectRandomPlayer", () => {
  it("never returns a player that was already used", () => {
    const used = pool.slice(0, 11).map((p) => p.id);
    for (let seed = 1; seed <= 20; seed++) {
      expect(selectRandomPlayer(pool, used, seeded(seed))?.id).toBe("player-12");
    }
  });

  it("returns null when every player has been used", () => {
    expect(selectRandomPlayer(pool, pool.map((p) => p.id))).toBeNull();
  });

  it("is deterministic for a given rng and handles an rng of nearly 1", () => {
    expect(selectRandomPlayer(pool, [], () => 0)?.id).toBe("player-1");
    expect(selectRandomPlayer(pool, [], () => 0.999999)?.id).toBe("player-12");
  });

  it("filters used players from the available list", () => {
    expect(getAvailablePlayers(pool, ["player-1", "player-2"])).toHaveLength(10);
  });
});

describe("selectPlayerForTier", () => {
  it("picks from the requested tier", () => {
    for (const tier of DIFFICULTY_ORDER) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(selectPlayerForTier(tieredPool, tier, [], seeded(seed))?.difficulty).toBe(tier);
      }
    }
  });

  it("skips used players within the tier", () => {
    const sickoIds = tieredPool.filter((p) => p.difficulty === "sicko").map((p) => p.id);
    const picked = selectPlayerForTier(tieredPool, "sicko", sickoIds.slice(1), seeded(1));
    expect(picked?.id).toBe(sickoIds[0]);
  });

  it("falls back to the nearest tier when the requested one is empty", () => {
    expect(selectPlayerForTier(pool, "sicko", [], seeded(1))?.difficulty).toBe("medium");

    const sickoIds = tieredPool.filter((p) => p.difficulty === "sicko").map((p) => p.id);
    expect(selectPlayerForTier(tieredPool, "sicko", sickoIds, seeded(1))?.difficulty).toBe("hard");
  });

  it("prefers the easier tier when two tiers are equally close", () => {
    const onlyEasyAndHard = tieredPool.filter((p) => p.difficulty === "easy" || p.difficulty === "hard");
    expect(selectPlayerForTier(onlyEasyAndHard, "medium", [], seeded(1))?.difficulty).toBe("easy");
  });

  it("returns null when nothing is left", () => {
    expect(selectPlayerForTier(pool, "easy", pool.map((p) => p.id))).toBeNull();
  });
});

describe("buildQuestionPlan", () => {
  it("splits a blended 10-question game 3, 3, 2, 2 from easy up to sicko", () => {
    expect(buildQuestionPlan("blended", 10)).toEqual([
      "easy", "easy", "easy", "medium", "medium", "medium", "hard", "hard", "sicko", "sicko",
    ]);
  });

  it("always produces exactly the number of questions asked for", () => {
    for (let total = 0; total <= 25; total++) {
      expect(buildQuestionPlan("blended", total)).toHaveLength(total);
    }
  });

  it("never lists a harder tier before an easier one", () => {
    for (let total = 1; total <= 25; total++) {
      const ranks = buildQuestionPlan("blended", total).map((t) => DIFFICULTY_ORDER.indexOf(t));
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });

  it("repeats one tier in single-tier modes", () => {
    expect(buildQuestionPlan("sicko", 4)).toEqual(["sicko", "sicko", "sicko", "sicko"]);
    expect(buildQuestionPlan("easy", 2)).toEqual(["easy", "easy"]);
  });
});

describe("getHints", () => {
  it("shows everything on easy and medium", () => {
    expect(getHints("easy")).toEqual({ showTeam: true, showDraftYear: true });
    expect(getHints("medium")).toEqual({ showTeam: true, showDraftYear: true });
  });

  it("hides the draft year on hard", () => {
    expect(getHints("hard")).toEqual({ showTeam: true, showDraftYear: false });
  });

  it("hides the team and draft year on sicko", () => {
    expect(getHints("sicko")).toEqual({ showTeam: false, showDraftYear: false });
  });
});

describe("checkAnswer", () => {
  const ohioState = makePlayer(1, { college: "Ohio State" });

  it("accepts the exact name regardless of case and punctuation", () => {
    expect(checkAnswer(ohioState, "Ohio State").isCorrect).toBe(true);
    expect(checkAnswer(ohioState, "  ohio state  ").isCorrect).toBe(true);
    expect(checkAnswer(ohioState, "OHIO STATE!").isCorrect).toBe(true);
  });

  it("accepts common variations", () => {
    expect(checkAnswer(ohioState, "The Ohio State University").isCorrect).toBe(true);
    expect(checkAnswer(ohioState, "Ohio St").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(2, { college: "LSU" }), "Louisiana State").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(3, { college: "USC" }), "Southern California").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(4, { college: "Ole Miss" }), "Mississippi").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(4, { college: "Ole Miss" }), "Ole Miss").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(5, { college: "NC State" }), "N.C. State").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(5, { college: "NC State" }), "North Carolina State").isCorrect).toBe(true);
  });

  it("handles Texas A&M however it is typed", () => {
    const aggie = makePlayer(6, { college: "Texas A&M" });
    for (const answer of ["Texas A&M", "texas a and m", "Texas A&M University", "TAMU", "Texas AM"]) {
      expect(checkAnswer(aggie, answer).isCorrect).toBe(true);
    }
    expect(checkAnswer(aggie, "Texas").isCorrect).toBe(false);
  });

  it("tells the two Miamis apart", () => {
    const florida = makePlayer(7, { college: "Miami (FL)" });
    const ohio = makePlayer(8, { college: "Miami (OH)" });
    expect(checkAnswer(florida, "Miami").isCorrect).toBe(true);
    expect(checkAnswer(florida, "Miami Florida").isCorrect).toBe(true);
    expect(checkAnswer(florida, "Miami (OH)").isCorrect).toBe(false);
    expect(checkAnswer(ohio, "Miami Ohio").isCorrect).toBe(true);
    expect(checkAnswer(ohio, "Miami").isCorrect).toBe(false);
  });

  it("forgives one typo or swapped letters in a longer name", () => {
    const wisconsin = makePlayer(9, { college: "Wisconsin" });
    expect(checkAnswer(wisconsin, "Wisconsn").isCorrect).toBe(true);
    expect(checkAnswer(wisconsin, "Wiscnosin").isCorrect).toBe(true);
    expect(checkAnswer(makePlayer(10, { college: "Alabama" }), "Alabma").isCorrect).toBe(true);
  });

  it("does not forgive two typos or typos in short names", () => {
    expect(checkAnswer(makePlayer(11, { college: "Wisconsin" }), "Wiscnsn").isCorrect).toBe(false);
    expect(checkAnswer(makePlayer(12, { college: "Iowa" }), "Ioma").isCorrect).toBe(false);
  });

  it("never confuses real schools that look alike", () => {
    const pairs: Array<[string, string]> = [
      ["North Carolina", "South Carolina"],
      ["Western Michigan", "Eastern Michigan"],
      ["Northern Illinois", "Southern Illinois"],
      ["Iowa State", "Iowa"],
      ["Michigan State", "Michigan"],
      ["Mississippi State", "Ole Miss"],
      ["Kansas State", "Kansas"],
      ["Miami (FL)", "Miami (OH)"],
    ];
    for (const [school, other] of pairs) {
      expect(checkAnswer(makePlayer(1, { college: school }), other).isCorrect).toBe(false);
      expect(checkAnswer(makePlayer(1, { college: other }), school).isCorrect).toBe(false);
    }
  });

  it("rejects blank and wrong answers and reports the correct college", () => {
    expect(checkAnswer(ohioState, "").isCorrect).toBe(false);
    expect(checkAnswer(ohioState, "   ").isCorrect).toBe(false);
    const wrong = checkAnswer(ohioState, "Michigan");
    expect(wrong.isCorrect).toBe(false);
    expect(wrong.correctCollege).toBe("Ohio State");
    expect(wrong.matchedCollege).toBeNull();
  });

  it("accepts a transfer school but still reveals the drafted-from college", () => {
    const transfer = makePlayer(13, { college: "LSU", alternateColleges: ["Ohio State"] });
    const result = checkAnswer(transfer, "Ohio State");
    expect(result.isCorrect).toBe(true);
    expect(result.matchedCollege).toBe("Ohio State");
    expect(result.correctCollege).toBe("LSU");
  });

  it("normalizes names consistently", () => {
    expect(normalizeCollege("Texas A&M")).toBe("texas a and m");
    expect(normalizeCollege("Penn St.")).toBe("penn state");
    expect(normalizeCollege("University of Texas")).toBe("texas");
    expect(canonicalCollege("Pitt")).toBe("pittsburgh");
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("ab", "ba")).toBe(1);
  });
});

describe("scoring", () => {
  it("awards points by difficulty", () => {
    expect(pointsFor(makePlayer(1, { difficulty: "easy" }))).toBe(10);
    expect(pointsFor(makePlayer(1, { difficulty: "medium" }))).toBe(15);
    expect(pointsFor(makePlayer(1, { difficulty: "hard" }))).toBe(20);
    expect(pointsFor(makePlayer(1, { difficulty: "sicko" }))).toBe(30);
  });

  it("only adds points for correct answers", () => {
    const hard = makePlayer(1, { difficulty: "hard" });
    expect(updateScore(30, hard, true)).toBe(50);
    expect(updateScore(30, hard, false)).toBe(30);
  });

  it("extends the streak on a hit and resets it on a miss", () => {
    expect(updateStreak(2, true)).toBe(3);
    expect(updateStreak(5, false)).toBe(0);
    expect(updateBestStreak(4, 2)).toBe(4);
    expect(updateBestStreak(2, 3)).toBe(3);
  });
});

describe("game flow", () => {
  it("starts in the idle state with nothing on screen", () => {
    const idle = createInitialState();
    expect(idle.phase).toBe("idle");
    expect(idle.mode).toBe("blended");
    expect(idle.currentPlayer).toBeNull();
  });

  it("starts a game with the first question ready", () => {
    const state = startGame(pool, "blended", seeded(1));
    expect(state.phase).toBe("answering");
    expect(state.questionNumber).toBe(1);
    expect(state.totalQuestions).toBe(10);
    expect(state.plan).toHaveLength(10);
    expect(state.usedPlayerIds).toHaveLength(1);
  });

  it("asks 10 questions and never repeats a player", () => {
    for (const mode of ["blended", "easy", "sicko"] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const rng = seeded(seed);
        let state = startGame(tieredPool, mode, rng);
        const seen: string[] = [];

        while (state.phase !== "finished") {
          expect(state.currentPlayer).not.toBeNull();
          seen.push(state.currentPlayer!.id);
          state = submitAnswer(state, "wrong answer");
          state = nextQuestion(state, tieredPool, rng);
        }

        expect(seen).toHaveLength(10);
        expect(new Set(seen).size).toBe(10);
      }
    }
  });

  it("follows the blended plan question by question", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = seeded(seed);
      let state = startGame(tieredPool, "blended", rng);
      const tiers: Difficulty[] = [];
      while (state.phase !== "finished") {
        tiers.push(state.currentPlayer!.difficulty);
        state = nextQuestion(submitAnswer(state, "x"), tieredPool, rng);
      }
      expect(tiers).toEqual(buildQuestionPlan("blended", 10));
    }
  });

  it("uses only one tier in a single-tier mode", () => {
    const rng = seeded(7);
    let state = startGame(tieredPool, "sicko", rng);
    while (state.phase !== "finished") {
      expect(state.currentPlayer!.difficulty).toBe("sicko");
      state = nextQuestion(submitAnswer(state, "x"), tieredPool, rng);
    }
  });

  it("keeps going when a tier runs out of players", () => {
    // Only 3 sicko players but a 10-question sicko game: the rest fall back to harder-to-easier tiers.
    const thin = tieredPool.filter((p) => p.difficulty !== "sicko").concat(
      tieredPool.filter((p) => p.difficulty === "sicko").slice(0, 3),
    );
    const rng = seeded(3);
    let state = startGame(thin, "sicko", rng);
    let asked = 0;
    while (state.phase !== "finished") {
      asked++;
      state = nextQuestion(submitAnswer(state, "x"), thin, rng);
    }
    expect(asked).toBe(10);
  });

  it("shortens the game when there are fewer players than questions", () => {
    const state = startGame(pool.slice(0, 3), "blended", seeded(1));
    expect(state.totalQuestions).toBe(3);
    expect(state.plan).toHaveLength(3);
  });

  it("scores a correct answer by the player's tier and enters the feedback phase", () => {
    const started = startGame(tieredPool, "sicko", seeded(2));
    const player = started.currentPlayer!;
    const state = submitAnswer(started, player.college);

    expect(state.phase).toBe("feedback");
    expect(state.score).toBe(30);
    expect(state.streak).toBe(1);
    expect(state.correctCount).toBe(1);
    expect(state.lastResult?.isCorrect).toBe(true);
    expect(state.lastResult?.pointsEarned).toBe(30);
    expect(state.history).toHaveLength(1);
  });

  it("resets the streak on a miss but remembers the best streak", () => {
    const rng = seeded(3);
    let state = startGame(pool, "blended", rng);

    const play = (answer: (college: string) => string) => {
      state = submitAnswer(state, answer(state.currentPlayer!.college));
      state = nextQuestion(state, pool, rng);
    };

    play((college) => college);
    play((college) => college);
    expect(state.streak).toBe(2);
    play(() => "Nowhere State");
    expect(state.streak).toBe(0);
    play((college) => college);
    expect(state.streak).toBe(1);
    expect(state.bestStreak).toBe(2);
    expect(state.correctCount).toBe(3);
  });

  it("ignores blank answers and out-of-order actions", () => {
    const started = startGame(pool, "blended", seeded(4));
    expect(submitAnswer(started, "   ")).toBe(started);
    expect(nextQuestion(started, pool)).toBe(started);

    const answered = submitAnswer(started, "x");
    expect(submitAnswer(answered, "y")).toBe(answered);
  });

  it("flags the final question and finishes after it", () => {
    const rng = seeded(5);
    let state = startGame(pool, "blended", rng);
    for (let i = 1; i < 10; i++) {
      expect(isFinalQuestion(state)).toBe(false);
      state = nextQuestion(submitAnswer(state, "x"), pool, rng);
    }
    expect(state.questionNumber).toBe(10);
    expect(isFinalQuestion(state)).toBe(true);

    const finished = nextQuestion(submitAnswer(state, "x"), pool, rng);
    expect(finished.phase).toBe("finished");
    expect(finished.history).toHaveLength(10);
  });

  it("remembers the mode for the next game", () => {
    expect(startGame(tieredPool, "hard", seeded(1)).mode).toBe("hard");
    expect(createInitialState(10, "sicko").mode).toBe("sicko");
  });
});

describe("rank", () => {
  it("scales with the share of correct answers", () => {
    expect(getRank(10, 10)).toBe("Hall of Fame");
    expect(getRank(7, 10)).toBe("Pro Bowler");
    expect(getRank(5, 10)).toBe("Starter");
    expect(getRank(3, 10)).toBe("Practice squad");
    expect(getRank(0, 10)).toBe("Still in the stands");
  });
});

describe("data/players.json", () => {
  const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), "data/players.json"), "utf8"));
  const players = parsePlayers(raw);

  it("is a valid list of players with unique ids", () => {
    expect(players.length).toBeGreaterThanOrEqual(1000);
  });

  it("has plenty of players in every tier", () => {
    for (const tier of DIFFICULTY_ORDER) {
      const count = players.filter((p) => p.difficulty === tier).length;
      expect(count).toBeGreaterThanOrEqual(50);
    }
  });

  it("covers players who started from 2015 on (drafted or rookie year 1990-2026)", () => {
    for (const player of players) {
      expect(player.draftYear).toBeGreaterThanOrEqual(1990);
      expect(player.draftYear).toBeLessThanOrEqual(2026);
    }
  });

  it("accepts every player's own college and transfer schools as the answer", () => {
    for (const player of players) {
      expect(checkAnswer(player, player.college).isCorrect).toBe(true);
      for (const alternate of player.alternateColleges ?? []) {
        expect(checkAnswer(player, alternate).isCorrect).toBe(true);
      }
    }
  });

  it("never lists a player's own school among their alternates", () => {
    for (const player of players) {
      for (const alternate of player.alternateColleges ?? []) {
        expect(collegesMatch(alternate, player.college)).toBe(false);
      }
    }
  });

  it("has no two different schools that a typed answer could confuse", () => {
    const schools = new Set<string>();
    for (const player of players) {
      schools.add(player.college);
      for (const alternate of player.alternateColleges ?? []) schools.add(alternate);
    }

    const byCanonical = new Map<string, string>();
    for (const school of schools) {
      const key = canonicalCollege(school);
      const existing = byCanonical.get(key);
      // Two spellings of one school are fine, but they must be the same canonical name.
      if (existing !== undefined) expect(collegesMatch(existing, school)).toBe(true);
      else byCanonical.set(key, school);
    }

    const distinct = [...byCanonical.values()];
    const confusable: string[] = [];
    for (let i = 0; i < distinct.length; i++) {
      for (let j = i + 1; j < distinct.length; j++) {
        if (collegesMatch(distinct[i], distinct[j])) confusable.push(`${distinct[i]} / ${distinct[j]}`);
      }
    }
    expect(confusable).toEqual([]);
  });

  it("rejects invalid data", () => {
    expect(() => parsePlayers({})).toThrow();
    expect(() => parsePlayers([{ id: "x" }])).toThrow();
    expect(() => parsePlayers([makePlayer(1), makePlayer(1)])).toThrow();
    expect(() => parsePlayers([makePlayer(1, { difficulty: "impossible" as Difficulty })])).toThrow();
  });
});
