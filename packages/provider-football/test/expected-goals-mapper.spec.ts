import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it } from "vitest";
import { mapApiFootballFixtureExpectedGoals } from "../src/mapper/map-api-football-expected-goals.js";
import { RecordedFootballCatalog } from "../src/recorded/recorded-football-catalog.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";

describe("F1.3A Expected Goals provider mapping", () => {
  it("maps fixture expected_goals without inventing xGA", () => {
    const mapped = mapApiFootballFixtureExpectedGoals(
      {
        response: [
          {
            team: { id: 10, name: "Home" },
            statistics: [
              { type: "expected_goals", value: "1.72" },
              { type: "Total Shots", value: 14 },
            ],
          },
          {
            team: { id: 20, name: "Away" },
            statistics: [{ type: "Expected Goals", value: 1.39 }],
          },
        ],
      },
      {
        homeTeamId: "10",
        homeTeamName: "Home",
        awayTeamId: "20",
        awayTeamName: "Away",
        competitionId: "292",
        competitionName: "K League 1",
        season: 2026,
        observedAt: "2026-07-19T10:30:00.000Z",
        providerMethod: "http-live",
      },
    );

    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      teamSide: "home",
      window: "fixture",
      metrics: { xg: 1.72 },
      competitionId: "292",
      season: "2026",
    });
    expect(mapped[0]?.metrics.xga).toBeUndefined();
    expect(mapped[1]).toMatchObject({
      teamSide: "away",
      window: "fixture",
      metrics: { xg: 1.39 },
    });
  });

  it("returns honest absence when expected goals are missing", () => {
    const mapped = mapApiFootballFixtureExpectedGoals(
      {
        response: [
          {
            team: { id: 10, name: "Home" },
            statistics: [{ type: "Total Shots", value: 14 }],
          },
        ],
      },
      {
        homeTeamId: "10",
        homeTeamName: "Home",
        awayTeamId: "20",
        awayTeamName: "Away",
        observedAt: "2026-07-19T10:30:00.000Z",
        providerMethod: "http-live",
      },
    );

    expect(mapped).toEqual([]);
  });

  it("loads recorded Expected Goals into Evidence without Features", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");

    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.expectedGoals.length).toBeGreaterThan(0);
    expect(bundle.homeStats.xgForPerMatch).toBe(0);
    expect(bundle.awayStats.xgAgainstPerMatch).toBe(0);

    const overallHome = bundle.expectedGoals.find(
      (item) => item.teamSide === "home" && item.window === "overall",
    );
    expect(overallHome?.metrics.xg).toBe(1.48);
    expect(overallHome?.metrics.xga).toBe(1.12);
    expect(overallHome?.metrics.nonPenaltyXg).toBe(1.31);

    const normalized = normalizeFixtureEvidenceSet(toEvidenceMatchShape(bundle), {
      collectedAt: "2026-07-22T12:00:00.000Z",
    });

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) {
      return;
    }

    const xgEvidence = normalized.value.filter(
      (item) => item.type === "EXPECTED_GOALS",
    );
    expect(xgEvidence.length).toBe(bundle.expectedGoals.length);
    expect(xgEvidence[0]?.provenance.collector).toBe("@fas/evidence-normalizer");
    expect(xgEvidence.some((item) => item.payload.window === "last5")).toBe(true);
  });
});
