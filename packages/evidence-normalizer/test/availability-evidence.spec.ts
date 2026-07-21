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
    },
    {
      teamSide: "away" as const,
      window: 1,
      results: ["L" as const],
      goalsFor: [0],
      goalsAgainst: [1],
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
    },
    {
      teamSide: "away" as const,
      windowMatches: 1,
      shotsForPerMatch: 9,
      shotsAgainstPerMatch: 11,
      xgForPerMatch: 0,
      xgAgainstPerMatch: 0,
    },
  ],
};

describe("Availability evidence (F1.1D)", () => {
  it("normalizes injury and suspension absences into distinct Evidence types", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan Hyundai FC",
        kickoff: "2026-07-19T10:30:00+00:00",
        providerSource: "api-football",
        providerSourceId: "api-football:100001:match",
        providerMethod: "recorded-snapshot",
        availabilityAbsences: [
          {
            playerId: "1000012",
            playerName: "FC Seoul Forward",
            teamId: "2766",
            teamName: "FC Seoul",
            teamSide: "home",
            kind: "injury",
            reason: "Hamstring Strain",
            providerSource: "api-football",
            providerSourceId: "api-football:100001:availability:injury:1000012",
            providerMethod: "recorded-snapshot",
          },
          {
            playerId: "1000014",
            playerName: "Ulsan Defender",
            teamId: "2765",
            teamName: "Ulsan Hyundai FC",
            teamSide: "away",
            kind: "suspension",
            reason: "Suspended 1 match",
            providerSource: "api-football",
            providerSourceId: "api-football:100001:availability:suspension:1000014",
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

    const injuries = result.value.filter((item) => item.type === "INJURY");
    const suspensions = result.value.filter((item) => item.type === "SUSPENSION");

    expect(injuries).toHaveLength(1);
    expect(suspensions).toHaveLength(1);
    expect(injuries[0]?.providerId).toBe("football:api-sports");
    expect(injuries[0]?.payload).toEqual({
      playerId: "1000012",
      playerName: "FC Seoul Forward",
      teamId: "2766",
      teamName: "FC Seoul",
      teamSide: "home",
      kind: "injury",
      reason: "Hamstring Strain",
    });
    expect(suspensions[0]?.payload.kind).toBe("suspension");
    expect(suspensions[0]?.payload.reason).toBe("Suspended 1 match");
  });

  it("allows evidence sets without availability (honest absence)", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "match-no-availability",
        home: "Home",
        away: "Away",
        kickoff: "2026-08-01T19:30:00Z",
        ...baseFormsAndStats,
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.some((item) => item.type === "INJURY")).toBe(false);
    expect(result.value.some((item) => item.type === "SUSPENSION")).toBe(false);
  });
});
