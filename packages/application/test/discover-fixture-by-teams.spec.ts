import { describe, expect, it } from "vitest";
import { normalizeTeamName } from "../src/fixture/normalize-team-name.js";
import { discoverFixtureByTeams } from "../src/fixture/discover-fixture-by-teams.js";

const sampleFixtures = [
  {
    matchId: "football:100001",
    homeTeam: "FC Seoul",
    awayTeam: "Ulsan Hyundai FC",
    kickoff: "2026-08-21T11:00:00Z",
    competition: "K League 1",
    analyzable: true,
    providerSource: "api-football",
  },
  {
    matchId: "football:244001",
    homeTeam: "IFK Mariehamn",
    awayTeam: "FC Lahti",
    kickoff: "2026-08-22T15:00:00Z",
    competition: "Veikkausliiga",
    analyzable: true,
    providerSource: "api-football",
  },
] as const;

describe("normalizeTeamName", () => {
  it("normalizes whitespace, case, and punctuation", () => {
    expect(normalizeTeamName("  FC Seoul ")).toBe("seoul");
    expect(normalizeTeamName("Ulsan Hyundai FC")).toBe("ulsan");
    expect(normalizeTeamName("IFK Mariehamn")).toBe("ifk mariehamn");
  });
});

describe("discoverFixtureByTeams", () => {
  it("resolves an exact team match", () => {
    const result = discoverFixtureByTeams({
      homeTeam: "FC Seoul",
      awayTeam: "Ulsan Hyundai FC",
      fixtures: sampleFixtures,
      scheduleSource: "football-data",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected fixture resolution.");
    }

    expect(result.value.resolvedMatchId).toBe("football:100001");
    expect(result.value.homeAwaySwapped).toBe(false);
  });

  it("resolves normalized team names", () => {
    const result = discoverFixtureByTeams({
      homeTeam: "seoul",
      awayTeam: "ulsan",
      fixtures: sampleFixtures,
      scheduleSource: "football-data",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected fixture resolution.");
    }

    expect(result.value.resolvedMatchId).toBe("football:100001");
  });

  it("resolves swapped home/away ordering", () => {
    const result = discoverFixtureByTeams({
      homeTeam: "Ulsan Hyundai FC",
      awayTeam: "FC Seoul",
      fixtures: sampleFixtures,
      scheduleSource: "football-data",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected fixture resolution.");
    }

    expect(result.value.resolvedMatchId).toBe("football:100001");
    expect(result.value.homeAwaySwapped).toBe(true);
  });

  it("filters by optional date", () => {
    const result = discoverFixtureByTeams({
      homeTeam: "FC Seoul",
      awayTeam: "Ulsan Hyundai FC",
      date: "2026-08-21",
      fixtures: sampleFixtures,
      scheduleSource: "football-data",
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      throw new Error("Expected fixture resolution.");
    }

    expect(result.value.resolvedMatchId).toBe("football:100001");
  });

  it("returns not found when no fixture matches", () => {
    const result = discoverFixtureByTeams({
      homeTeam: "Rosenborg",
      awayTeam: "Fredrikstad",
      fixtures: sampleFixtures,
      scheduleSource: "football-data",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.objectContaining({
        code: "FIXTURE_NOT_FOUND",
      }),
    });
  });

  it("returns not found when date does not match", () => {
    const result = discoverFixtureByTeams({
      homeTeam: "FC Seoul",
      awayTeam: "Ulsan Hyundai FC",
      date: "2026-01-01",
      fixtures: sampleFixtures,
      scheduleSource: "football-data",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected not found.");
    }

    expect(result.error.code).toBe("FIXTURE_NOT_FOUND");
  });

  it("returns ambiguous when multiple fixtures share the same kickoff", () => {
    const duplicates = [
      ...sampleFixtures,
      {
        matchId: "football:100002",
        homeTeam: "FC Seoul",
        awayTeam: "Ulsan Hyundai FC",
        kickoff: "2026-08-21T11:00:00Z",
        competition: "K League 1",
        analyzable: true,
        providerSource: "api-football",
      },
    ];

    const result = discoverFixtureByTeams({
      homeTeam: "FC Seoul",
      awayTeam: "Ulsan Hyundai FC",
      fixtures: duplicates,
      scheduleSource: "football-data",
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      throw new Error("Expected ambiguity.");
    }

    expect(result.error.code).toBe("FIXTURE_AMBIGUOUS");
    expect(result.error.candidates?.length).toBe(2);
  });
});
