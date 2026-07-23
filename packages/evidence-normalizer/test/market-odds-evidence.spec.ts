import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

const baseMatch = {
  matchId: "match-example",
  home: "Liverpool",
  away: "Chelsea",
  kickoff: "2026-08-01T19:30:00Z",
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
      shotsForPerMatch: 12,
      shotsAgainstPerMatch: 10,
      xgForPerMatch: 1.2,
      xgAgainstPerMatch: 1.0,
    },
    {
      teamSide: "away",
      windowMatches: 1,
      shotsForPerMatch: 10,
      shotsAgainstPerMatch: 12,
      xgForPerMatch: 1.0,
      xgAgainstPerMatch: 1.2,
    },
  ],
};

describe("ODDS Market Evidence depth (I2A)", () => {
  it("normalizes O/U, opening/closing, movement, and markets when supplied", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
          providerSource: "the-odds-api",
          providerSourceId: "evt:pinnacle:h2h+spreads+totals",
          providerMethod: "recorded-snapshot",
          marketSource: "pinnacle",
          asianHandicapLine: -0.75,
          asianHandicapHomeOdds: 1.75,
          asianHandicapAwayOdds: 2.2,
          overUnderLine: 2.5,
          overOdds: 1.9,
          underOdds: 1.95,
          openingHomeOdds: 1.7,
          openingDrawOdds: 3.9,
          openingAwayOdds: 5.0,
          closingHomeOdds: 1.5,
          oddsMovementHome: -0.15,
          handicapMovement: -0.25,
          overUnderLineMovement: 0,
          publicBettingHomePct: 62,
          bettingVolume: 1250000,
          sharpMoneyIndicator: true,
          markets: [
            {
              marketType: "european_1x2",
              selection: "home",
              currentValue: 1.55,
              openingValue: 1.7,
              movement: -0.15,
              observedAt: "2026-07-18T12:00:00Z",
              marketSource: "pinnacle",
            },
          ],
        },
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    const odds = result.value.find((evidence) => evidence.type === "ODDS");

    expect(odds?.payload).toMatchObject({
      marketSource: "pinnacle",
      overUnderLine: 2.5,
      overOdds: 1.9,
      underOdds: 1.95,
      openingHomeOdds: 1.7,
      closingHomeOdds: 1.5,
      oddsMovementHome: -0.15,
      handicapMovement: -0.25,
      publicBettingHomePct: 62,
      bettingVolume: 1250000,
      sharpMoneyIndicator: true,
      markets: [
        expect.objectContaining({
          marketType: "european_1x2",
          selection: "home",
          currentValue: 1.55,
        }),
      ],
    });
  });

  it("keeps market depth absent when not supplied", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
        },
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    const odds = result.value.find((evidence) => evidence.type === "ODDS");

    expect(odds?.payload).toEqual({
      homeOdds: 1.55,
      drawOdds: 4.2,
      awayOdds: 5.8,
      observedAt: "2026-07-18T12:00:00Z",
    });
  });

  it("rejects partial over/under fields", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
          overUnderLine: 2.5,
        },
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected normalization failure.");
    }

    expect(result.error.code).toBe("INVALID_FIELD");
  });

  it("rejects invalid market record types", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
          markets: [
            {
              marketType: "invented",
              selection: "home",
              currentValue: 1.55,
              observedAt: "2026-07-18T12:00:00Z",
            },
          ],
        },
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(false);
  });
});
