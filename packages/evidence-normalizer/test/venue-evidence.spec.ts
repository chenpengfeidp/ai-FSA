import { describe, expect, it } from "vitest";
import { normalizeFixtureEvidenceSet } from "../src/index.js";

describe("VENUE evidence (F1.1B-1)", () => {
  it("normalizes venue into VENUE evidence with provider metadata", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "football:100001",
        home: "FC Seoul",
        away: "Ulsan Hyundai FC",
        kickoff: "2026-07-19T10:30:00+00:00",
        providerSource: "api-football",
        providerSourceId: "api-football:100001:match",
        providerMethod: "recorded-snapshot",
        venue: {
          venueId: "1960",
          name: "Seoul World Cup Stadium",
          city: "Seoul",
          providerSource: "api-football",
          providerSourceId: "api-football:100001:venue",
          providerMethod: "recorded-snapshot",
        },
        teamForm: [
          {
            teamSide: "home",
            window: 1,
            results: ["W"],
            goalsFor: [1],
            goalsAgainst: [0],
            providerSource: "api-football",
            providerSourceId: "api-football:100001:form:home",
            providerMethod: "recorded-snapshot",
          },
          {
            teamSide: "away",
            window: 1,
            results: ["L"],
            goalsFor: [0],
            goalsAgainst: [1],
            providerSource: "api-football",
            providerSourceId: "api-football:100001:form:away",
            providerMethod: "recorded-snapshot",
          },
        ],
        statistics: [
          {
            teamSide: "home",
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
            teamSide: "away",
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
      },
      { collectedAt: "2026-07-17T10:00:00Z" },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const venue = result.value.find((item) => item.type === "VENUE");
    expect(venue).toBeDefined();
    expect(venue?.providerId).toBe("football:api-sports");
    expect(venue?.payload).toEqual({
      name: "Seoul World Cup Stadium",
      city: "Seoul",
      venueId: "1960",
    });
    expect(venue?.provenance.category).toBe("football");
  });

  it("allows evidence sets without venue (honest absence)", () => {
    const result = normalizeFixtureEvidenceSet(
      {
        matchId: "match-no-venue",
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

    expect(result.value.some((item) => item.type === "VENUE")).toBe(false);
  });
});
