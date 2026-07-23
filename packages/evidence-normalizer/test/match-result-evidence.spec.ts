import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/fixture/fixture-evidence-set-normalizer.js";

const baseFixture = {
  matchId: "football:900001",
  home: "Home FC",
  away: "Away FC",
  kickoff: "2026-07-19T10:30:00.000Z",
  teamForm: [
    {
      teamId: "1",
      teamName: "Home FC",
      teamSide: "home",
      window: 5,
      results: ["W", "W", "D", "L", "W"],
      goalsFor: [2, 1, 1, 0, 2],
      goalsAgainst: [0, 0, 1, 1, 1],
      goalsScoredPerMatch: 1.2,
      goalsConcededPerMatch: 0.6,
      providerSource: "api-football",
      providerSourceId: "api-football:900001:form:home",
      providerMethod: "recorded-snapshot",
    },
    {
      teamId: "2",
      teamName: "Away FC",
      teamSide: "away",
      window: 5,
      results: ["L", "D", "W", "L", "D"],
      goalsFor: [0, 1, 2, 0, 1],
      goalsAgainst: [1, 1, 1, 2, 1],
      goalsScoredPerMatch: 0.8,
      goalsConcededPerMatch: 1.2,
      providerSource: "api-football",
      providerSourceId: "api-football:900001:form:away",
      providerMethod: "recorded-snapshot",
    },
  ],
  statistics: [
    {
      teamId: "1",
      teamName: "Home FC",
      teamSide: "home",
      windowMatches: 5,
      shotsForPerMatch: 12,
      shotsAgainstPerMatch: 8,
      xgForPerMatch: 0,
      xgAgainstPerMatch: 0,
      providerSource: "api-football",
      providerSourceId: "api-football:900001:stats:home",
      providerMethod: "recorded-snapshot",
    },
    {
      teamId: "2",
      teamName: "Away FC",
      teamSide: "away",
      windowMatches: 5,
      shotsForPerMatch: 10,
      shotsAgainstPerMatch: 11,
      xgForPerMatch: 0,
      xgAgainstPerMatch: 0,
      providerSource: "api-football",
      providerSourceId: "api-football:900001:stats:away",
      providerMethod: "recorded-snapshot",
    },
  ],
};

describe("A1 MATCH_RESULT Evidence normalization", () => {
  it("emits MATCH_RESULT when matchResult is supplied", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseFixture,
        matchResult: {
          homeGoals: 2,
          awayGoals: 1,
          winner: "home",
          totalGoals: 3,
          matchStatus: "FINISHED",
          competitionId: "292",
          competitionName: "K League 1",
          providerSource: "api-football",
          providerSourceId: "api-football:900001:result",
          providerMethod: "recorded-snapshot",
          observedAt: "2026-07-19T12:30:00.000Z",
        },
      },
      { collectedAt: "2026-07-19T13:00:00.000Z" },
    );

    if (!result.ok) {
      expect.fail(
        `normalization failed: ${result.error.code} ${result.error.message}`,
      );
    }

    const matchResult = result.value.find((item) => item.type === "MATCH_RESULT");

    expect(matchResult).toBeDefined();
    expect(matchResult?.payload).toMatchObject({
      homeGoals: 2,
      awayGoals: 1,
      winner: "home",
      totalGoals: 3,
      matchStatus: "FINISHED",
      competitionName: "K League 1",
    });
  });

  it("keeps honest absence when matchResult is omitted", () => {
    const result = normalizeFixtureEvidenceSet(baseFixture, {
      collectedAt: "2026-07-19T13:00:00.000Z",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "MATCH_RESULT")).toBe(false);
  });

  it("rejects winner that does not match the scoreline", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseFixture,
        matchResult: {
          homeGoals: 2,
          awayGoals: 1,
          winner: "away",
          totalGoals: 3,
          matchStatus: "FINISHED",
          observedAt: "2026-07-19T12:30:00.000Z",
        },
      },
      { collectedAt: "2026-07-19T13:00:00.000Z" },
    );

    expect(result.ok).toBe(false);
  });
});
