import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const collectedAt = "2026-07-22T12:00:00.000Z";

function baseShape(options?: {
  readonly expectedGoals?: readonly Record<string, unknown>[];
}): Record<string, unknown> {
  return {
    matchId: "football:xg-1",
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
      },
      {
        teamSide: "away",
        windowMatches: 5,
        shotsForPerMatch: 10,
        shotsAgainstPerMatch: 11,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
      },
    ],
    ...(options?.expectedGoals === undefined
      ? {}
      : { expectedGoals: options.expectedGoals }),
  };
}

describe("F1.3A EXPECTED_GOALS Evidence normalization", () => {
  it("preserves provider xG metrics with provenance", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        expectedGoals: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            competitionId: "292",
            competitionName: "K League 1",
            season: "2026",
            window: "overall",
            metrics: {
              xg: 1.48,
              xga: 1.12,
              expectedGoalDifference: 0.36,
            },
            observedAt: "2026-08-01T10:00:00.000Z",
            providerSource: "api-football",
            providerSourceId: "api-football:1:xg:home:overall",
            providerMethod: "recorded-snapshot",
          },
        ],
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const xg = result.value.find((item) => item.type === "EXPECTED_GOALS");
    expect(xg?.payload).toMatchObject({
      teamSide: "home",
      window: "overall",
      competitionName: "K League 1",
      season: "2026",
      metrics: {
        xg: 1.48,
        xga: 1.12,
        expectedGoalDifference: 0.36,
      },
    });
    expect(xg?.source).toBe("api-football");
    expect(xg?.provenance.method).toBe("recorded-snapshot");
  });

  it("keeps honest absence when expectedGoals is omitted", () => {
    const result = normalizeFixtureEvidenceSet(baseShape(), { collectedAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "EXPECTED_GOALS")).toBe(false);
  });

  it("rejects empty metrics objects", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        expectedGoals: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            window: "fixture",
            metrics: {},
            observedAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(false);
  });

  it("rejects invalid window values", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        expectedGoals: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            window: "season",
            metrics: { xg: 1 },
            observedAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(false);
  });
});
