import { describe, expect, it } from "vitest";
import {
  applyAvailabilityAndSquadStatus,
  mergePlayerSeasonStats,
  selectPlayerStatsCandidates,
} from "../src/mapper/enrich-player-intelligence.js";
import { mapApiFootballPlayerStatsResponse } from "../src/mapper/map-api-football-player-stats.js";
import type {
  FootballAvailabilityAbsence,
  FootballPlayer,
  FootballTeamLineup,
} from "../src/domain/football-models.js";

function basePlayer(overrides: Partial<FootballPlayer>): FootballPlayer {
  return {
    playerId: "1",
    name: "Player One",
    teamId: "10",
    teamName: "Home FC",
    teamSide: "home",
    position: undefined,
    number: undefined,
    age: undefined,
    nationality: undefined,
    photoUrl: undefined,
    captain: undefined,
    availabilityStatus: undefined,
    matchSquadStatus: undefined,
    seasonStats: undefined,
    providerMethod: "recorded-snapshot",
    ...overrides,
  };
}

describe("mapApiFootballPlayerStatsResponse", () => {
  it("maps age, captain, and season stats for the requested team", () => {
    const body = {
      response: [
        {
          player: { id: 1, name: "Player One", age: 27 },
          statistics: [
            {
              team: { id: 10 },
              league: { id: 292, season: 2026 },
              games: {
                appearences: 18,
                lineups: 16,
                minutes: 1440,
                rating: "7.166667",
                captain: true,
              },
              goals: { total: 9, assists: 4, saves: null, conceded: null },
              cards: { yellow: 3, red: 0 },
            },
          ],
        },
      ],
    };

    const enrichment = mapApiFootballPlayerStatsResponse(body, {
      teamId: "10",
      competitionId: "292",
    });

    expect(enrichment?.age).toBe(27);
    expect(enrichment?.captain).toBe(true);
    expect(enrichment?.seasonStats).toEqual({
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
      saves: undefined,
      goalsConceded: undefined,
    });
  });

  it("maps goalkeeper saves and goals conceded", () => {
    const body = {
      response: [
        {
          player: { id: 2, age: 30 },
          statistics: [
            {
              team: { id: 10 },
              league: { id: 292, season: 2026 },
              games: { appearences: 10, minutes: 900, captain: false },
              goals: { saves: 32, conceded: 8 },
              cards: {},
            },
          ],
        },
      ],
    };

    const enrichment = mapApiFootballPlayerStatsResponse(body, { teamId: "10" });

    expect(enrichment?.seasonStats?.saves).toBe(32);
    expect(enrichment?.seasonStats?.goalsConceded).toBe(8);
  });

  it("never guesses a different team's statistics (honest absence)", () => {
    const body = {
      response: [
        {
          player: { id: 3 },
          statistics: [{ team: { id: 999 }, league: { id: 292 }, games: {} }],
        },
      ],
    };

    const enrichment = mapApiFootballPlayerStatsResponse(body, { teamId: "10" });

    expect(enrichment).toBeUndefined();
  });

  it("returns undefined for empty responses", () => {
    expect(
      mapApiFootballPlayerStatsResponse({ response: [] }, { teamId: "10" }),
    ).toBeUndefined();
    expect(
      mapApiFootballPlayerStatsResponse(null, { teamId: "10" }),
    ).toBeUndefined();
  });

  it("prefers the statistics entry matching the requested competition", () => {
    const body = {
      response: [
        {
          player: { id: 4 },
          statistics: [
            {
              team: { id: 10 },
              league: { id: 999 },
              games: { appearences: 30, rating: "8.0" },
            },
            {
              team: { id: 10 },
              league: { id: 292 },
              games: { appearences: 5, rating: "6.0" },
            },
          ],
        },
      ],
    };

    const enrichment = mapApiFootballPlayerStatsResponse(body, {
      teamId: "10",
      competitionId: "292",
    });

    expect(enrichment?.seasonStats?.rating).toBe(6.0);
  });
});

describe("selectPlayerStatsCandidates", () => {
  it("selects the squad goalkeeper and attackers, capped", () => {
    const players = [
      basePlayer({ playerId: "gk", position: "Goalkeeper" }),
      basePlayer({ playerId: "d1", position: "Defender" }),
      basePlayer({ playerId: "a1", position: "Attacker" }),
      basePlayer({ playerId: "a2", position: "Attacker" }),
      basePlayer({ playerId: "a3", position: "Attacker" }),
    ];

    const candidates = selectPlayerStatsCandidates(players, 3);

    expect(candidates.map((player) => player.playerId)).toEqual(["gk", "a1", "a2"]);
  });

  it("returns an empty list when no goalkeeper or attacker is present", () => {
    const players = [basePlayer({ playerId: "d1", position: "Defender" })];
    expect(selectPlayerStatsCandidates(players)).toEqual([]);
  });
});

describe("mergePlayerSeasonStats", () => {
  it("overlays enrichment only onto matching players", () => {
    const players = [
      basePlayer({ playerId: "1" }),
      basePlayer({ playerId: "2", teamId: "20", teamSide: "away" }),
    ];
    const enrichmentByPlayerId = new Map([
      [
        "1",
        {
          age: 24,
          captain: true,
          seasonStats: {
            competitionId: "292",
            season: 2026,
            appearances: 10,
            starts: undefined,
            minutesPlayed: undefined,
            rating: undefined,
            goals: 3,
            assists: undefined,
            yellowCards: undefined,
            redCards: undefined,
            saves: undefined,
            goalsConceded: undefined,
          },
        },
      ],
    ]);

    const merged = mergePlayerSeasonStats(players, enrichmentByPlayerId);

    expect(merged[0]?.age).toBe(24);
    expect(merged[0]?.captain).toBe(true);
    expect(merged[0]?.seasonStats?.goals).toBe(3);
    expect(merged[1]?.age).toBeUndefined();
    expect(merged[1]?.seasonStats).toBeUndefined();
  });
});

describe("applyAvailabilityAndSquadStatus", () => {
  it("cross-references injuries/suspensions and confirmed lineups by playerId", () => {
    const players = [
      basePlayer({ playerId: "1" }),
      basePlayer({ playerId: "2" }),
      basePlayer({ playerId: "3" }),
    ];
    const absences: readonly FootballAvailabilityAbsence[] = [
      {
        playerId: "2",
        playerName: "Player Two",
        teamId: "10",
        teamName: "Home FC",
        teamSide: "home",
        kind: "injury",
        reason: undefined,
        providerMethod: "recorded-snapshot",
      },
    ];
    const lineups: readonly FootballTeamLineup[] = [
      {
        teamId: "10",
        teamName: "Home FC",
        teamSide: "home",
        formation: "4-4-2",
        startXI: [
          {
            playerId: "1",
            name: "Player One",
            number: 1,
            position: "G",
            grid: "1:1",
          },
        ],
        substitutes: [
          {
            playerId: "3",
            name: "Player Three",
            number: 12,
            position: "G",
            grid: undefined,
          },
        ],
        providerMethod: "recorded-snapshot",
      },
    ];

    const result = applyAvailabilityAndSquadStatus(players, absences, lineups);

    expect(result[0]?.matchSquadStatus).toBe("starting");
    expect(result[0]?.availabilityStatus).toBeUndefined();
    expect(result[1]?.availabilityStatus).toBe("injury");
    expect(result[1]?.matchSquadStatus).toBeUndefined();
    expect(result[2]?.matchSquadStatus).toBe("bench");
  });

  it("leaves players unchanged when no absence or lineup facts are known (honest absence)", () => {
    const players = [basePlayer({ playerId: "1" })];
    const result = applyAvailabilityAndSquadStatus(players, [], []);

    expect(result[0]?.availabilityStatus).toBeUndefined();
    expect(result[0]?.matchSquadStatus).toBeUndefined();
    expect(result[0]).toEqual(players[0]);
  });
});
