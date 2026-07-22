import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const collectedAt = "2026-07-22T12:00:00.000Z";

function baseShape(options?: {
  readonly advancedHome?: Record<string, unknown>;
  readonly advancedAway?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    matchId: "football:stats-1",
    home: "Home FC",
    away: "Away FC",
    kickoff: "2026-08-01T10:00:00.000Z",
    teamForm: [
      {
        teamSide: "home",
        window: 1,
        results: ["W"],
        goalsFor: [1],
        goalsAgainst: [0],
      },
      {
        teamSide: "away",
        window: 1,
        results: ["L"],
        goalsFor: [0],
        goalsAgainst: [1],
      },
    ],
    statistics: [
      {
        teamSide: "home",
        windowMatches: 5,
        shotsForPerMatch: 12,
        shotsAgainstPerMatch: 9,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
        ...(options?.advancedHome === undefined
          ? {}
          : { advanced: options.advancedHome }),
      },
      {
        teamSide: "away",
        windowMatches: 5,
        shotsForPerMatch: 10,
        shotsAgainstPerMatch: 11,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
        ...(options?.advancedAway === undefined
          ? {}
          : { advanced: options.advancedAway }),
      },
    ],
  };
}

describe("F1.2a advanced STATISTICS Evidence normalization", () => {
  it("preserves provider advanced metrics with provenance", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        advancedHome: {
          scope: "fixture",
          shotsTotal: 14,
          shotsOnTarget: 6,
          possessionPct: 54,
          corners: 7,
          yellowCards: 2,
        },
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const home = result.value.find(
      (item) => item.type === "STATISTICS" && item.payload.teamSide === "home",
    );
    expect(home?.payload.advanced).toEqual({
      scope: "fixture",
      shotsTotal: 14,
      shotsOnTarget: 6,
      possessionPct: 54,
      corners: 7,
      yellowCards: 2,
    });
    expect(home?.provenance.collector).toBe("@fas/evidence-normalizer");
  });

  it("keeps honest absence when advanced is omitted", () => {
    const result = normalizeFixtureEvidenceSet(baseShape(), { collectedAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const home = result.value.find(
      (item) => item.type === "STATISTICS" && item.payload.teamSide === "home",
    );
    expect(home?.payload.advanced).toBeUndefined();
  });

  it("rejects invalid advanced scope", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        advancedHome: {
          scope: "expected",
          shotsTotal: 1,
        },
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(false);
  });
});
