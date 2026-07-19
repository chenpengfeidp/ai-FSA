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
  headToHead: {
    sampleSize: 1,
    meetings: [
      {
        playedAt: "2025-12-01T15:00:00Z",
        homeGoals: 1,
        awayGoals: 0,
      },
    ],
  },
};

describe("ODDS provenance overlay", () => {
  it("keeps fixture provenance when overlay metadata is absent", () => {
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

    expect(odds?.source).toBe("fixture");
    expect(odds?.provenance.method).toBe("fixture");
  });

  it("applies external provenance when overlay metadata is complete", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
          providerSource: "the-odds-api",
          providerSourceId: "evt:pinnacle:h2h",
          providerMethod: "recorded-snapshot",
        },
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error(result.error.message);
    }

    const odds = result.value.find((evidence) => evidence.type === "ODDS");

    expect(odds?.source).toBe("the-odds-api");
    expect(odds?.sourceId).toBe("evt:pinnacle:h2h");
    expect(odds?.id).toBe("evidence-the-odds-api-match-example-odds");
    expect(odds?.provenance.method).toBe("recorded-snapshot");
    expect(odds?.payload).toEqual({
      homeOdds: 1.55,
      drawOdds: 4.2,
      awayOdds: 5.8,
      observedAt: "2026-07-18T12:00:00Z",
    });
  });

  it("normalizes Asian handicap fields when all three are present", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
          asianHandicapLine: -0.75,
          asianHandicapHomeOdds: 1.75,
          asianHandicapAwayOdds: 2.2,
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
      asianHandicapLine: -0.75,
      asianHandicapHomeOdds: 1.75,
      asianHandicapAwayOdds: 2.2,
    });
  });

  it("rejects partial Asian handicap fields", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        ...baseMatch,
        odds: {
          homeOdds: 1.55,
          drawOdds: 4.2,
          awayOdds: 5.8,
          observedAt: "2026-07-18T12:00:00Z",
          asianHandicapLine: -0.75,
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
});
