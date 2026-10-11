import { describe, expect, it } from "vitest";
import type { CollegeRecognitionEntry, PlayerRatingEntry } from "../../types/difficulty";
import { MAX_SCORE } from "./config";
import { evaluatePlayer } from "./evaluate";
import { buildDifficultyRecords, collegeRecognition, playerRatingEntries } from "./records";
import { calculateDifficultyScore, classifyScore, scoreDifficulty, validateRatings } from "./score";
import playersData from "../../data/players.json";
import type { Player } from "../../types/player";

const ratings = (n: number, r: number, a: number, c: number) => ({
  playerNotoriety: n,
  collegeRecognition: r,
  collegeAssociation: a,
  collegePathComplexity: c,
});

describe("calculateDifficultyScore", () => {
  it("uses 7/8/3/2 times (5 - rating) with no rounding", () => {
    expect(calculateDifficultyScore(ratings(5, 5, 5, 5) as never)).toBe(0);
    expect(calculateDifficultyScore(ratings(1, 1, 1, 1) as never)).toBe(80);
    expect(calculateDifficultyScore(ratings(4, 3, 2, 1) as never)).toBe(7 + 16 + 9 + 8);
  });

  it("documents that the formula's reachable range is 0-80 for ratings 1-5", () => {
    expect(calculateDifficultyScore(ratings(1, 1, 1, 1) as never)).toBeLessThanOrEqual(MAX_SCORE);
  });
});

describe("classifyScore boundaries (inclusive): 0-24, 25-44, 45-64, 65-100", () => {
  it.each([
    [0, "easy"], [24, "easy"],
    [25, "medium"], [44, "medium"],
    [45, "hard"], [64, "hard"],
    [65, "sicko"], [100, "sicko"],
  ])("score %i is %s", (score, tier) => {
    expect(classifyScore(score)).toBe(tier);
  });

  it.each([-1, 101, 24.5, NaN, Infinity])("rejects score %s", (score) => {
    expect(() => classifyScore(score)).toThrow(RangeError);
  });
});

describe("validateRatings and scoreDifficulty", () => {
  it("accepts every combination of 1-5", () => {
    for (let n = 1; n <= 5; n++) for (let r = 1; r <= 5; r++) for (let a = 1; a <= 5; a++) for (let c = 1; c <= 5; c++) {
      const result = scoreDifficulty(ratings(n, r, a, c));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Number.isInteger(result.difficultyScore)).toBe(true);
        expect(result.difficultyScore).toBeGreaterThanOrEqual(0);
        expect(result.difficultyScore).toBeLessThanOrEqual(100);
      }
    }
  });

  it.each([0, 6, -1, 2.5, NaN, Infinity, "3", true, null, undefined])("rejects invalid rating %s", (bad) => {
    const result = scoreDifficulty({ ...ratings(3, 3, 3, 3), collegeRecognition: bad });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("collegeRecognition");
  });

  it("reports every missing factor and non-object input", () => {
    expect(validateRatings({})).toHaveLength(4);
    expect(validateRatings(null)).toHaveLength(1);
    expect(validateRatings("x")).toHaveLength(1);
  });
});

const school = (rating: 1 | 2 | 3 | 4 | 5, confidence: "confident" | "unsure" = "confident"): CollegeRecognitionEntry => ({ rating, evidence: "test", confidence });
const entry = (over: Partial<PlayerRatingEntry> = {}): PlayerRatingEntry => ({
  id: "p-1", playerNotoriety: 3, collegeAssociation: 3, collegePathComplexity: 1,
  collegesAttended: ["A"], canonicalCollege: "A", canonicalConfirmed: true,
  rationale: "test", sources: ["https://example.com"], confidence: "confident", ...over,
});
const base = { id: "p-1", name: "Test Player", college: "A" };

describe("evaluatePlayer", () => {
  it("classifies a fully rated, reviewed record with no review flag", () => {
    const record = evaluatePlayer(base, { A: school(3) }, entry());
    expect(record.difficultyScore).toBe(14 + 16 + 6 + 8);
    expect(record.difficulty).toBe("medium");
    expect(record.needsReview).toBe(false);
  });

  it("does not classify a player with no ratings", () => {
    const record = evaluatePlayer(base, { A: school(3) }, undefined);
    expect(record.difficulty).toBeNull();
    expect(record.difficultyScore).toBeNull();
    expect(record.needsReview).toBe(true);
  });

  it("does not classify when the school has no recognition rating", () => {
    const record = evaluatePlayer(base, {}, entry());
    expect(record.difficulty).toBeNull();
    expect(record.needsReview).toBe(true);
    expect(record.reviewReasons.join(" ")).toContain("No college recognition rating");
  });

  it("flags unsure school ratings and unsure player ratings but still shows the score", () => {
    expect(evaluatePlayer(base, { A: school(3, "unsure") }, entry()).needsReview).toBe(true);
    const unsure = evaluatePlayer(base, { A: school(3) }, entry({ confidence: "unsure" }));
    expect(unsure.needsReview).toBe(true);
    expect(unsure.difficulty).toBe("medium");
  });

  it("flags multi-school players whose canonical answer is not confirmed", () => {
    const record = evaluatePlayer(base, { A: school(3) }, entry({ collegesAttended: ["B", "A"], canonicalConfirmed: false }));
    expect(record.needsReview).toBe(true);
    expect(record.collegesAttended).toEqual(["B", "A"]);
  });

  it("flags a canonical college outside collegesAttended or different from players.json", () => {
    expect(evaluatePlayer(base, { A: school(3) }, entry({ collegesAttended: ["B"] })).needsReview).toBe(true);
    expect(evaluatePlayer({ ...base, college: "Z" }, { A: school(3) }, entry()).needsReview).toBe(true);
  });

  it("flags missing sources and invalid ratings instead of guessing", () => {
    expect(evaluatePlayer(base, { A: school(3) }, entry({ sources: [] })).needsReview).toBe(true);
    const bad = evaluatePlayer(base, { A: school(3) }, entry({ playerNotoriety: 9 as never }));
    expect(bad.difficulty).toBeNull();
    expect(bad.needsReview).toBe(true);
  });
});

describe("calibration players (ratings carry source links, none are tuned to hit a target)", () => {
  const players = playersData as Player[];
  const records = buildDifficultyRecords(players);
  const byName = (name: string) => records.find((r) => r.name === name);

  it.each([
    ["Justin Jefferson", "easy"],
    ["Joe Burrow", "easy"],
    // Kupp scores 45 (7*1 + 8*3 + 3*2 + 2*4): one point over the new medium/hard line. The original
    // 49 cutoff put him in medium. The ratings were not changed to force either result.
    ["Cooper Kupp", "hard"],
    ["Carson Wentz", "medium"],
  ])("%s scores %s", (name, tier) => {
    expect(byName(name)?.difficulty).toBe(tier);
  });

  it("scores Joe Flacco medium with his documented history (Pittsburgh, then Delaware)", () => {
    // Flacco was drafted in 2008, before the game's 2011 cutoff, so he is not in players.json.
    // Facts: Wikipedia lists Pitt 2003-2004 (3 games) and Delaware 2005-2007; 2012 Super Bowl MVP.
    const record = evaluatePlayer(
      { id: "joe-flacco-2008", name: "Joe Flacco", college: "Delaware" },
      collegeRecognition,
      entry({
        id: "joe-flacco-2008", playerNotoriety: 4, collegeAssociation: 3, collegePathComplexity: 3,
        collegesAttended: ["Pittsburgh", "Delaware"], canonicalCollege: "Delaware",
      }),
    );
    expect(record.difficultyScore).toBe(7 + 16 + 6 + 4);
    expect(record.difficulty).toBe("medium");
  });

  it("does not flag the hand-checked calibration records", () => {
    for (const name of ["Justin Jefferson", "Joe Burrow", "Cooper Kupp", "Carson Wentz"]) {
      expect(byName(name)?.needsReview).toBe(false);
    }
  });

  it("always flags multi-school players whose canonical answer is unconfirmed", () => {
    const flagged = records.filter((r) => r.collegesAttended.length > 1 && !playerRatingEntries.find((e) => e.id === r.id)?.canonicalConfirmed);
    expect(flagged.length).toBeGreaterThan(0);
    expect(flagged.every((r) => r.needsReview)).toBe(true);
  });
});

describe("data files", () => {
  const players = playersData as Player[];
  const ids = new Set(players.map((p) => p.id));

  it("every rated player exists, once, with valid ratings and matching colleges", () => {
    const seen = new Set<string>();
    for (const e of playerRatingEntries) {
      expect(ids.has(e.id)).toBe(true);
      expect(seen.has(e.id)).toBe(false);
      seen.add(e.id);
      expect(validateRatings({ ...e, collegeRecognition: 3 })).toEqual([]);
      const player = players.find((p) => p.id === e.id);
      const canonical = e.canonicalCollege ?? player?.college ?? "";
      expect(e.collegesAttended ?? [player?.college]).toContain(canonical);
      expect(canonical).toBe(player?.college);
      expect(collegeRecognition[canonical]).toBeDefined();
    }
  });

  it("every school rating is an integer 1-5 with evidence", () => {
    for (const [name, s] of Object.entries(collegeRecognition)) {
      expect(Number.isInteger(s.rating) && s.rating >= 1 && s.rating <= 5, name).toBe(true);
      expect(s.evidence.length, name).toBeGreaterThan(0);
    }
  });

  it("covers every school in players.json", () => {
    for (const p of players) expect(collegeRecognition[p.college], p.college).toBeDefined();
  });

  it("rates every player, with a valid tier and score matching the formula", () => {
    const records = buildDifficultyRecords(players);
    expect(records).toHaveLength(players.length);
    for (const r of records) {
      expect(r.difficulty !== null).toBe(true);
      expect(r.difficultyScore).toBe(
        7 * (5 - r.playerNotoriety!) + 8 * (5 - r.collegeRecognition!) + 3 * (5 - r.collegeAssociation!) + 2 * (5 - r.collegePathComplexity!),
      );
    }
  });

  it("never marks a record reviewed-clean when it is unsure", () => {
    const unsure = new Set(playerRatingEntries.filter((e) => e.confidence !== "confident").map((e) => e.id));
    const records = buildDifficultyRecords(players);
    expect(records.filter((r) => unsure.has(r.id)).every((r) => r.needsReview)).toBe(true);
  });
});
