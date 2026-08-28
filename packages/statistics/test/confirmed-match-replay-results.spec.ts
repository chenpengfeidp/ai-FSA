import { describe, expect, it } from "vitest";
import {
  CONFIRMED_MATCH_REPLAY_RESULTS,
  CONFIRMED_MATCH_REPLAY_RESULTS_DATASET_VERSION,
} from "../src/evaluation/confirmed-match-replay-results.js";
import { goalRangeBucket } from "../src/evaluation/evaluate-prediction.js";

function actualBtts(homeGoals: number, awayGoals: number): boolean {
  return homeGoals > 0 && awayGoals > 0;
}

function actualOver25(totalGoals: number): boolean {
  return totalGoals >= 3;
}

describe("confirmed match replay actual-result dataset", () => {
  it("contains four immutable outcome-only samples", () => {
    expect(CONFIRMED_MATCH_REPLAY_RESULTS_DATASET_VERSION).toBe(
      "confirmed-match-replay-results.v1",
    );
    expect(CONFIRMED_MATCH_REPLAY_RESULTS).toHaveLength(4);
    expect(Object.isFrozen(CONFIRMED_MATCH_REPLAY_RESULTS)).toBe(true);

    for (const result of CONFIRMED_MATCH_REPLAY_RESULTS) {
      expect(Object.isFrozen(result)).toBe(true);
      expect(result.matchStatus).toBe("FINISHED");
      expect(result.totalGoals).toBe(result.homeGoals + result.awayGoals);
      expect("predictionSnapshot" in result).toBe(false);
      expect("evaluation" in result).toBe(false);
    }
  });

  it("preserves the confirmed FT outcomes and deterministic labels", () => {
    expect(
      CONFIRMED_MATCH_REPLAY_RESULTS.map((result) => ({
        matchId: result.matchId,
        score: `${String(result.homeGoals)}-${String(result.awayGoals)}`,
        winner: result.winner,
        goalBand: goalRangeBucket(result.totalGoals),
        btts: actualBtts(result.homeGoals, result.awayGoals),
        over25: actualOver25(result.totalGoals),
      })),
    ).toEqual([
      {
        matchId: "replay:2026-08-27:anderlecht:kairat-almaty",
        score: "3-0",
        winner: "home",
        goalBand: "range23",
        btts: false,
        over25: true,
      },
      {
        matchId: "replay:2026-08-27:celta-vigo:osasuna",
        score: "1-2",
        winner: "away",
        goalBand: "range23",
        btts: true,
        over25: true,
      },
      {
        matchId: "replay:2026-08-27:barcelona:athletic-club",
        score: "2-0",
        winner: "home",
        goalBand: "range23",
        btts: false,
        over25: false,
      },
      {
        matchId: "replay:2026-08-27:omonia:sint-truiden",
        score: "4-2",
        winner: "home",
        goalBand: "range4Plus",
        btts: true,
        over25: true,
      },
    ]);
  });

  it("keeps result provenance attached to every sample", () => {
    for (const result of CONFIRMED_MATCH_REPLAY_RESULTS) {
      expect(result.providerId).toBe("evaluation:curated-result");
      expect(result.providerSourceId).toMatch(/^https:\/\//);
      expect(result.providerMethod).toMatch(
        /^(authoritative-web-verification|curated-result-verification)$/,
      );
      expect(result.observedAt).toBe("2026-08-28T02:47:00.000Z");
    }
  });
});
