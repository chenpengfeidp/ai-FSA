import { describe, expect, it } from "vitest";
import { mapApiFootballFixtureItem } from "../src/mapper/map-api-football-fixture.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";
import type { FootballMatchBundle } from "../src/domain/football-models.js";

describe("A1 completed score → matchResult mapping", () => {
  it("maps FT goals into FootballFixture.completedScore", () => {
    const fixture = mapApiFootballFixtureItem(
      {
        fixture: {
          id: 900001,
          date: "2026-07-19T10:30:00+00:00",
          status: { short: "FT" },
          venue: { id: 1, name: "Stadium", city: "City" },
        },
        league: { id: 292, name: "K League 1", season: 2026 },
        teams: {
          home: { id: 1, name: "Home FC" },
          away: { id: 2, name: "Away FC" },
        },
        goals: { home: 2, away: 1 },
      },
      "recorded-snapshot",
    );

    expect(fixture?.status).toBe("FINISHED");
    expect(fixture?.completedScore).toEqual({ homeGoals: 2, awayGoals: 1 });
  });

  it("emits matchResult shape only for finished fixtures with scores", () => {
    const bundle = {
      fixture: {
        fixtureId: "900001",
        matchId: "football:900001",
        competitionId: "292",
        competitionName: "K League 1",
        season: 2026,
        kickoff: "2026-07-19T10:30:00.000Z",
        homeTeamId: "1",
        homeTeamName: "Home FC",
        awayTeamId: "2",
        awayTeamName: "Away FC",
        status: "FINISHED" as const,
        completedScore: Object.freeze({ homeGoals: 2, awayGoals: 1 }),
        venue: undefined,
        referee: undefined,
        providerMethod: "recorded-snapshot" as const,
      },
      homeForm: {
        teamId: "1",
        teamName: "Home FC",
        teamSide: "home" as const,
        window: 5,
        results: ["W", "W", "D", "L", "W"] as const,
        goalsFor: [1, 1, 1, 0, 2],
        goalsAgainst: [0, 0, 1, 1, 1],
        homeSplit: undefined,
        awaySplit: undefined,
        recentShort: undefined,
        goalsScoredPerMatch: 1,
        goalsConcededPerMatch: 0.6,
        providerMethod: "recorded-snapshot" as const,
      },
      awayForm: {
        teamId: "2",
        teamName: "Away FC",
        teamSide: "away" as const,
        window: 5,
        results: ["L", "D", "W", "L", "D"] as const,
        goalsFor: [0, 1, 2, 0, 1],
        goalsAgainst: [1, 1, 1, 2, 1],
        homeSplit: undefined,
        awaySplit: undefined,
        recentShort: undefined,
        goalsScoredPerMatch: 0.8,
        goalsConcededPerMatch: 1.2,
        providerMethod: "recorded-snapshot" as const,
      },
      homeStats: {
        teamId: "1",
        teamName: "Home FC",
        teamSide: "home" as const,
        windowMatches: 5,
        shotsForPerMatch: 12,
        shotsAgainstPerMatch: 8,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
        providerMethod: "recorded-snapshot" as const,
        statsBasis: "shots" as const,
        advanced: undefined,
      },
      awayStats: {
        teamId: "2",
        teamName: "Away FC",
        teamSide: "away" as const,
        windowMatches: 5,
        shotsForPerMatch: 10,
        shotsAgainstPerMatch: 11,
        xgForPerMatch: 0,
        xgAgainstPerMatch: 0,
        providerMethod: "recorded-snapshot" as const,
        statsBasis: "shots" as const,
        advanced: undefined,
      },
      headToHead: {
        homeTeamId: "1",
        awayTeamId: "2",
        sampleSize: 0,
        meetings: Object.freeze([]),
        providerMethod: "recorded-snapshot" as const,
      },
      players: Object.freeze([]),
      availabilityAbsences: Object.freeze([]),
      lineups: Object.freeze([]),
      expectedGoals: Object.freeze([]),
      matchContext: Object.freeze([]),
      standings: undefined,
    } satisfies FootballMatchBundle;

    const shape = toEvidenceMatchShape(bundle) as {
      matchResult?: Readonly<{
        homeGoals: number;
        awayGoals: number;
        winner: string;
        totalGoals: number;
      }>;
    };

    expect(shape.matchResult).toEqual({
      homeGoals: 2,
      awayGoals: 1,
      winner: "home",
      totalGoals: 3,
      competitionId: "292",
      competitionName: "K League 1",
      matchStatus: "FINISHED",
      providerSource: "api-football",
      providerSourceId: "api-football:900001:result",
      providerMethod: "recorded-snapshot",
      observedAt: "2026-07-19T10:30:00.000Z",
    });
  });
});
