import { describe, expect, it } from "vitest";

import { normalizeFixtureEvidenceSet } from "../src/index.js";

const collectedAt = "2026-07-22T10:00:00.000Z";

describe("F1.1E lineup / referee / form decomposition normalization", () => {
  it("emits confirmed LINEUP Evidence and MATCH_INFO referee when supplied", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan",
        kickoff: "2026-08-01T10:00:00.000Z",
        providerSource: "api-football",
        providerSourceId: "api-football:100001:match",
        providerMethod: "recorded-snapshot",
        referee: {
          name: "Kim Jong-hyeok",
          country: "South Korea",
          league: "K League 1",
          statistics: {
            appearances: 12,
            yellowCardsPerMatch: 3.2,
          },
        },
        teamForm: [
          {
            teamSide: "home",
            window: 3,
            results: ["W", "D", "W"],
            goalsFor: [2, 1, 2],
            goalsAgainst: [0, 1, 1],
            homeSplit: {
              window: 2,
              results: ["W", "W"],
              goalsFor: [2, 2],
              goalsAgainst: [0, 1],
            },
            goalsScoredPerMatch: 1.67,
            goalsConcededPerMatch: 0.67,
            recentShort: {
              window: 3,
              results: ["W", "D", "W"],
              goalsFor: [2, 1, 2],
              goalsAgainst: [0, 1, 1],
            },
          },
          {
            teamSide: "away",
            window: 3,
            results: ["L", "W", "D"],
            goalsFor: [0, 2, 1],
            goalsAgainst: [1, 1, 1],
            awaySplit: {
              window: 2,
              results: ["L", "D"],
              goalsFor: [0, 1],
              goalsAgainst: [1, 1],
            },
            goalsScoredPerMatch: 1,
            goalsConcededPerMatch: 1,
          },
        ],
        statistics: [
          {
            teamSide: "home",
            windowMatches: 3,
            shotsForPerMatch: 12,
            shotsAgainstPerMatch: 10,
            xgForPerMatch: 1.2,
            xgAgainstPerMatch: 1.1,
          },
          {
            teamSide: "away",
            windowMatches: 3,
            shotsForPerMatch: 11,
            shotsAgainstPerMatch: 12,
            xgForPerMatch: 1.1,
            xgAgainstPerMatch: 1.3,
          },
        ],
        lineups: [
          {
            teamId: "2766",
            teamName: "FC Seoul",
            teamSide: "home",
            formation: "4-3-3",
            status: "confirmed",
            startXI: [
              { playerId: "1", name: "Keeper", number: 1, position: "G" },
              { playerId: "2", name: "Defender", number: 2, position: "D" },
            ],
            substitutes: [{ playerId: "12", name: "Bench", number: 12 }],
            providerSource: "api-football",
            providerSourceId: "api-football:100001:lineup:home",
            providerMethod: "recorded-snapshot",
          },
        ],
      },
      { collectedAt },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    const matchInfo = result.value.find((item) => item.type === "MATCH_INFO");
    const lineup = result.value.find((item) => item.type === "LINEUP");
    const homeForm = result.value.find(
      (item) => item.type === "TEAM_FORM" && item.payload.teamSide === "home",
    );

    expect(matchInfo?.payload.referee).toMatchObject({
      name: "Kim Jong-hyeok",
      country: "South Korea",
      league: "K League 1",
    });
    expect(lineup?.payload).toMatchObject({
      status: "confirmed",
      teamSide: "home",
      formation: "4-3-3",
    });
    expect(homeForm?.payload.homeSplit).toMatchObject({ window: 2 });
    expect(homeForm?.payload.goalsScoredPerMatch).toBe(1.67);
  });

  it("keeps honest absence when lineups and referee are omitted", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100002",
        home: "A",
        away: "B",
        kickoff: "2026-08-01T10:00:00.000Z",
        teamForm: [
          {
            teamSide: "home",
            window: 2,
            results: ["W", "L"],
            goalsFor: [1, 0],
            goalsAgainst: [0, 2],
          },
          {
            teamSide: "away",
            window: 2,
            results: ["D", "W"],
            goalsFor: [1, 2],
            goalsAgainst: [1, 1],
          },
        ],
        statistics: [
          {
            teamSide: "home",
            windowMatches: 2,
            shotsForPerMatch: 10,
            shotsAgainstPerMatch: 10,
            xgForPerMatch: 1,
            xgAgainstPerMatch: 1,
          },
          {
            teamSide: "away",
            windowMatches: 2,
            shotsForPerMatch: 10,
            shotsAgainstPerMatch: 10,
            xgForPerMatch: 1,
            xgAgainstPerMatch: 1,
          },
        ],
      },
      { collectedAt },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "LINEUP")).toBe(false);
    const matchInfo = result.value.find((item) => item.type === "MATCH_INFO");
    expect(matchInfo).toBeDefined();
    expect(
      (matchInfo?.payload as { referee?: unknown } | undefined)?.referee,
    ).toBeUndefined();
  });

  it("rejects non-confirmed lineup status", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100003",
        home: "A",
        away: "B",
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
            windowMatches: 1,
            shotsForPerMatch: 10,
            shotsAgainstPerMatch: 10,
            xgForPerMatch: 1,
            xgAgainstPerMatch: 1,
          },
          {
            teamSide: "away",
            windowMatches: 1,
            shotsForPerMatch: 10,
            shotsAgainstPerMatch: 10,
            xgForPerMatch: 1,
            xgAgainstPerMatch: 1,
          },
        ],
        lineups: [
          {
            teamId: "1",
            teamName: "A",
            teamSide: "home",
            status: "expected",
            startXI: [{ playerId: "1", name: "P" }],
          },
        ],
      },
      { collectedAt },
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.message).toContain("confirmed");
  });
});
