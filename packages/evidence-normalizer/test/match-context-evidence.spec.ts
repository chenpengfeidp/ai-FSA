import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const collectedAt = "2026-07-22T12:00:00.000Z";

function baseShape(options?: {
  readonly matchContext?: readonly Record<string, unknown>[];
}): Record<string, unknown> {
  return {
    matchId: "football:context-1",
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
    ...(options?.matchContext === undefined
      ? {}
      : { matchContext: options.matchContext }),
  };
}

describe("I1A MATCH_CONTEXT Evidence normalization", () => {
  it("preserves provider Context metrics with provenance", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        matchContext: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            matchId: "football:context-1",
            competitionId: "292",
            competitionName: "K League 1",
            season: "2026",
            metrics: {
              restDays: 6,
              daysSinceLastMatch: 6,
              matchesInLast7Days: 1,
              fixtureCongestion: 1,
              homeAwayContext: "home",
              travelContext: "home",
              venueCity: "Seoul",
              competitionKind: "league",
              competitionTypeLabel: "League",
              isKnockout: false,
              roundLabel: "Regular Season - 24",
            },
            observedAt: "2026-08-01T10:00:00.000Z",
            providerSource: "api-football",
            providerSourceId: "api-football:1:context:home",
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

    const context = result.value.find((item) => item.type === "MATCH_CONTEXT");
    expect(context?.payload).toMatchObject({
      teamSide: "home",
      contextType: "match_context",
      competitionName: "K League 1",
      season: "2026",
      metrics: {
        restDays: 6,
        fixtureCongestion: 1,
        competitionKind: "league",
        isKnockout: false,
      },
    });
    expect(context?.source).toBe("api-football");
    expect(context?.provenance.method).toBe("recorded-snapshot");
  });

  it("keeps honest absence when matchContext is omitted", () => {
    const result = normalizeFixtureEvidenceSet(baseShape(), { collectedAt });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "MATCH_CONTEXT")).toBe(false);
  });

  it("rejects empty metrics objects", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        matchContext: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            metrics: {},
            observedAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(false);
  });

  it("rejects invented travel distance fields", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        matchContext: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            metrics: {
              homeAwayContext: "home",
              restDays: -1,
            },
            observedAt: "2026-08-01T10:00:00.000Z",
          },
        ],
      }),
      { collectedAt },
    );

    expect(result.ok).toBe(false);
  });
});
