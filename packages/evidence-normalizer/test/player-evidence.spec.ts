import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const baseFormsAndStats = {
  teamForm: [
    {
      teamSide: "home" as const,
      window: 1,
      results: ["W" as const],
      goalsFor: [1],
      goalsAgainst: [0],
      providerSource: "api-football",
      providerSourceId: "api-football:100001:form:home",
      providerMethod: "recorded-snapshot",
    },
    {
      teamSide: "away" as const,
      window: 1,
      results: ["L" as const],
      goalsFor: [0],
      goalsAgainst: [1],
      providerSource: "api-football",
      providerSourceId: "api-football:100001:form:away",
      providerMethod: "recorded-snapshot",
    },
  ],
  statistics: [
    {
      teamSide: "home" as const,
      windowMatches: 1,
      shotsForPerMatch: 10,
      shotsAgainstPerMatch: 8,
      xgForPerMatch: 0,
      xgAgainstPerMatch: 0,
      providerSource: "api-football",
      providerSourceId: "api-football:100001:stats:home:shots",
      providerMethod: "recorded-snapshot",
      statsBasis: "shots",
    },
    {
      teamSide: "away" as const,
      windowMatches: 1,
      shotsForPerMatch: 9,
      shotsAgainstPerMatch: 11,
      xgForPerMatch: 0,
      xgAgainstPerMatch: 0,
      providerSource: "api-football",
      providerSourceId: "api-football:100001:stats:away:shots",
      providerMethod: "recorded-snapshot",
      statsBasis: "shots",
    },
  ],
};

describe("PLAYER evidence (F1.1C-1)", () => {
  it("normalizes players into PLAYER evidence with basic identity only", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan Hyundai FC",
        kickoff: "2026-07-19T10:30:00+00:00",
        providerSource: "api-football",
        providerSourceId: "api-football:100001:match",
        providerMethod: "recorded-snapshot",
        players: [
          {
            playerId: "1000011",
            name: "FC Seoul Keeper",
            teamId: "2766",
            teamName: "FC Seoul",
            teamSide: "home",
            position: "Goalkeeper",
            number: 1,
            nationality: "Korea Republic",
            photo: "https://media.api-sports.io/football/players/1000011.png",
            providerSource: "api-football",
            providerSourceId: "api-football:100001:player:1000011",
            providerMethod: "recorded-snapshot",
          },
          {
            playerId: "1000013",
            name: "Ulsan Midfielder",
            teamId: "2765",
            teamName: "Ulsan Hyundai FC",
            teamSide: "away",
            position: "Midfielder",
            number: 8,
            providerSource: "api-football",
            providerSourceId: "api-football:100001:player:1000013",
            providerMethod: "recorded-snapshot",
          },
        ],
        ...baseFormsAndStats,
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const players = result.value.filter((item) => item.type === "PLAYER");
    expect(players).toHaveLength(2);
    expect(players[0]?.providerId).toBe("football:api-sports");
    expect(players[0]?.payload).toEqual({
      playerId: "1000011",
      name: "FC Seoul Keeper",
      teamId: "2766",
      teamName: "FC Seoul",
      teamSide: "home",
      position: "Goalkeeper",
      number: 1,
      nationality: "Korea Republic",
      photo: "https://media.api-sports.io/football/players/1000011.png",
    });
    expect(players[1]?.payload).toEqual({
      playerId: "1000013",
      name: "Ulsan Midfielder",
      teamId: "2765",
      teamName: "Ulsan Hyundai FC",
      teamSide: "away",
      position: "Midfielder",
      number: 8,
    });
    expect(players[0]?.provenance.category).toBe("football");
  });

  it("normalizes P1A player intelligence: age, captain, availability, squad status, season stats", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan Hyundai FC",
        kickoff: "2026-07-19T10:30:00+00:00",
        providerSource: "api-football",
        providerSourceId: "api-football:100001:match",
        providerMethod: "recorded-snapshot",
        players: [
          {
            playerId: "1000012",
            name: "FC Seoul Forward",
            teamId: "2766",
            teamName: "FC Seoul",
            teamSide: "home",
            position: "Attacker",
            number: 9,
            age: 27,
            captain: true,
            availabilityStatus: "injury",
            matchSquadStatus: "bench",
            seasonStats: {
              competitionId: "292",
              season: 2026,
              appearances: 18,
              starts: 16,
              minutesPlayed: 1440,
              rating: 7.17,
              goals: 9,
              assists: 4,
              yellowCards: 3,
              redCards: 0,
            },
            providerSource: "api-football",
            providerSourceId: "api-football:100001:player:1000012",
            providerMethod: "recorded-snapshot",
          },
        ],
        ...baseFormsAndStats,
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const players = result.value.filter((item) => item.type === "PLAYER");
    expect(players).toHaveLength(1);
    expect(players[0]?.payload).toEqual({
      playerId: "1000012",
      name: "FC Seoul Forward",
      teamId: "2766",
      teamName: "FC Seoul",
      teamSide: "home",
      position: "Attacker",
      number: 9,
      age: 27,
      captain: true,
      availabilityStatus: "injury",
      matchSquadStatus: "bench",
      seasonStats: {
        competitionId: "292",
        season: 2026,
        appearances: 18,
        starts: 16,
        minutesPlayed: 1440,
        rating: 7.17,
        goals: 9,
        assists: 4,
        yellowCards: 3,
        redCards: 0,
      },
    });
  });

  it("rejects an invalid availabilityStatus value on PLAYER evidence", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan Hyundai FC",
        kickoff: "2026-07-19T10:30:00+00:00",
        players: [
          {
            playerId: "1",
            name: "Player One",
            teamId: "2766",
            teamName: "FC Seoul",
            teamSide: "home",
            availabilityStatus: "doubtful",
          },
        ],
        ...baseFormsAndStats,
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(false);
  });

  it("keeps PLAYER evidence honestly absent of season stats when the provider supplies none", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan Hyundai FC",
        kickoff: "2026-07-19T10:30:00+00:00",
        players: [
          {
            playerId: "1000014",
            name: "Ulsan Hyundai FC Defender",
            teamId: "2765",
            teamName: "Ulsan Hyundai FC",
            teamSide: "away",
            position: "Defender",
            number: 4,
          },
        ],
        ...baseFormsAndStats,
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const player = result.value.find((item) => item.type === "PLAYER");
    expect(player?.payload.seasonStats).toBeUndefined();
    expect(player?.payload.age).toBeUndefined();
    expect(player?.payload.availabilityStatus).toBeUndefined();
    expect(player?.payload.matchSquadStatus).toBeUndefined();
  });

  it("allows evidence sets without players (honest absence)", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "match-no-players",
        home: "Home",
        away: "Away",
        kickoff: "2026-08-01T19:30:00Z",
        teamForm: [
          {
            teamSide: "home",
            window: 1,
            results: ["D"],
            goalsFor: [1],
            goalsAgainst: [1],
          },
          {
            teamSide: "away",
            window: 1,
            results: ["D"],
            goalsFor: [1],
            goalsAgainst: [1],
          },
        ],
        statistics: [
          {
            teamSide: "home",
            windowMatches: 1,
            shotsForPerMatch: 1,
            shotsAgainstPerMatch: 1,
            xgForPerMatch: 0,
            xgAgainstPerMatch: 0,
          },
          {
            teamSide: "away",
            windowMatches: 1,
            shotsForPerMatch: 1,
            shotsAgainstPerMatch: 1,
            xgForPerMatch: 0,
            xgAgainstPerMatch: 0,
          },
        ],
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "PLAYER")).toBe(false);
  });
});
