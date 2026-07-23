import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const collectedAt = "2026-07-23T12:00:00.000Z";

function baseShape(options?: {
  readonly clubIntelligence?: readonly Record<string, unknown>[];
}): Record<string, unknown> {
  return {
    matchId: "football:club-1",
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
    ...(options?.clubIntelligence === undefined
      ? {}
      : { clubIntelligence: options.clubIntelligence }),
  };
}

describe("L1A CLUB_INTELLIGENCE Evidence normalization", () => {
  it("preserves provider club metrics with provenance", () => {
    const result = normalizeFixtureEvidenceSet(
      baseShape({
        clubIntelligence: [
          {
            teamId: "10",
            teamName: "Home FC",
            teamSide: "home",
            competitionId: "292",
            competitionName: "K League 1",
            season: "2026",
            window: "season",
            metrics: {
              leagueRank: 4,
              leaguePoints: 36,
              goalDifference: 7,
              wins: 10,
              draws: 6,
              losses: 6,
              currentForm: "WDWLW",
              managerName: "Kim Gi-dong",
            },
            observedAt: "2026-08-01T10:00:00.000Z",
            providerSource: "api-football",
            providerSourceId: "api-football:1:club:home:season",
            providerMethod: "recorded-snapshot",
          },
        ],
      }),
      { collectedAt },
    );

    if (!result.ok) {
      throw new Error(JSON.stringify(result.error));
    }

    const club = result.value.find((item) => item.type === "CLUB_INTELLIGENCE");
    expect(club?.payload).toMatchObject({
      teamSide: "home",
      window: "season",
      competitionName: "K League 1",
      season: "2026",
      metrics: {
        leagueRank: 4,
        leaguePoints: 36,
        currentForm: "WDWLW",
        managerName: "Kim Gi-dong",
      },
    });
    expect(club?.source).toBe("api-football");
    expect(club?.provenance.method).toBe("recorded-snapshot");
  });

  it("omits Club Intelligence when array is absent (honest absence)", () => {
    const result = normalizeFixtureEvidenceSet(baseShape(), { collectedAt });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "CLUB_INTELLIGENCE")).toBe(
      false,
    );
  });
});
