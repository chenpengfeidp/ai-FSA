import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it } from "vitest";
import { mapApiFootballFixtureStatistics } from "../src/mapper/map-api-football-fixture-statistics.js";
import { mapApiFootballTeamStats } from "../src/mapper/map-api-football-stats.js";
import { RecordedFootballCatalog } from "../src/recorded/recorded-football-catalog.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";

describe("F1.2a advanced STATISTICS mappers", () => {
  it("maps fixture statistics metrics without fabricating missing ones", () => {
    const mapped = mapApiFootballFixtureStatistics(
      {
        response: [
          {
            team: { id: 10, name: "Home" },
            statistics: [
              { type: "Total Shots", value: 14 },
              { type: "Shots on Goal", value: 6 },
              { type: "Shots off Goal", value: 5 },
              { type: "Ball Possession", value: "54%" },
              { type: "Corner Kicks", value: 7 },
              { type: "Yellow Cards", value: 2 },
              { type: "Red Cards", value: null },
              { type: "Dangerous Attacks", value: 52 },
              { type: "Goalkeeper Saves", value: 3 },
              { type: "Passes %", value: "82%" },
            ],
          },
          {
            team: { id: 20, name: "Away" },
            statistics: [{ type: "Total Shots", value: 9 }],
          },
        ],
      },
      { homeTeamId: "10", awayTeamId: "20" },
    );

    expect(mapped?.home?.scope).toBe("fixture");
    expect(mapped?.home?.shotsTotal).toBe(14);
    expect(mapped?.home?.shotsOnTarget).toBe(6);
    expect(mapped?.home?.possessionPct).toBe(54);
    expect(mapped?.home?.corners).toBe(7);
    expect(mapped?.home?.dangerousAttacks).toBe(52);
    expect(mapped?.home?.redCards).toBeUndefined();
    expect(mapped?.away?.shotsTotal).toBe(9);
    expect(mapped?.away?.possessionPct).toBeUndefined();
  });

  it("maps season cards into season-average advanced when team statistics supply them", () => {
    const stats = mapApiFootballTeamStats(
      {
        response: {
          fixtures: { played: { total: 5 } },
          shots: {
            on: { total: 20 },
            total: { total: 50 },
            against: { total: 40 },
          },
          cards: {
            yellow: { total: 10 },
            red: { total: 1 },
          },
        },
      },
      {
        teamId: "10",
        teamName: "Home",
        teamSide: "home",
        providerMethod: "http-live",
        windowMatches: 5,
      },
    );

    expect(stats?.shotsForPerMatch).toBe(10);
    expect(stats?.advanced?.scope).toBe("season-average");
    expect(stats?.advanced?.yellowCards).toBe(2);
    expect(stats?.advanced?.redCards).toBe(0.2);
    expect(stats?.advanced?.shotsOnTarget).toBe(4);
    expect(stats?.advanced?.possessionPct).toBeUndefined();
  });

  it("returns honest absence for empty fixture statistics", () => {
    expect(
      mapApiFootballFixtureStatistics(
        { response: [] },
        { homeTeamId: "10", awayTeamId: "20" },
      ),
    ).toBeUndefined();
  });

  it("loads recorded advanced STATISTICS into Evidence", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");

    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.homeStats.advanced?.shotsOnTarget).toBe(6);
    expect(bundle.awayStats.advanced?.possessionPct).toBe(46);

    const normalized = normalizeFixtureEvidenceSet(toEvidenceMatchShape(bundle), {
      collectedAt: "2026-07-22T12:00:00.000Z",
    });

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const homeStats = normalized.value.find(
      (item) => item.type === "STATISTICS" && item.payload.teamSide === "home",
    );
    expect(homeStats?.payload.advanced).toMatchObject({
      scope: "fixture",
      shotsOnTarget: 6,
      corners: 7,
      dangerousAttacks: 52,
    });
  });
});
