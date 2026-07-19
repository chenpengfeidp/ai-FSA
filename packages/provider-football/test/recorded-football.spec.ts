import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it } from "vitest";
import {
  FootballMatchProvider,
  mapApiFootballFixturesResponse,
  RecordedFootballCatalog,
  toEvidenceMatchShape,
} from "../src/index.js";

describe("RecordedFootballCatalog", () => {
  it("lists cassette board rows without network", async () => {
    const catalog = new RecordedFootballCatalog();
    const rows = await catalog.listUpcoming();

    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.every((row) => row.providerSource === "api-football")).toBe(true);
    expect(rows.every((row) => row.analyzable)).toBe(true);
    expect(rows.some((row) => row.matchId === "football:100001")).toBe(true);
  });

  it("filters by local date window", async () => {
    const catalog = new RecordedFootballCatalog();
    const rows = await catalog.listUpcoming({
      fromDate: "2026-07-19",
      toDate: "2026-07-19",
    });

    expect(rows.every((row) => row.kickoff.startsWith("2026-07-19"))).toBe(true);
    expect(rows.some((row) => row.matchId === "football:100003")).toBe(false);
  });

  it("maps bundles to Evidence-ready shape that normalizes", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");

    expect(bundle).toBeDefined();

    if (bundle === undefined) {
      throw new Error("expected bundle");
    }

    const shape = toEvidenceMatchShape(bundle) as {
      readonly teamForm: readonly { readonly providerSource: string }[];
      readonly statistics: readonly {
        readonly providerSource: string;
        readonly statsBasis: string;
      }[];
      readonly fixture?: unknown;
      readonly response?: unknown;
    };

    expect(shape.teamForm).toHaveLength(2);
    expect(shape.statistics.every((row) => row.statsBasis === "shots")).toBe(true);
    expect(shape.fixture).toBeUndefined();
    expect(shape.response).toBeUndefined();

    const provider = new FootballMatchProvider(catalog);
    const result = normalizeFixtureEvidenceSet(
      provider.getMatch("football:100001"),
      {
        collectedAt: "2026-07-17T10:00:00Z",
      },
    );

    expect(result.ok).toBe(true);
  });
});

describe("mapApiFootballFixturesResponse", () => {
  it("maps vendor fixtures into FAS domain only", () => {
    const mapped = mapApiFootballFixturesResponse(
      {
        response: [
          {
            fixture: {
              id: 42,
              date: "2026-07-20T10:00:00+00:00",
              status: { short: "NS" },
            },
            league: { id: 292, name: "K League 1", season: 2026 },
            teams: {
              home: { id: 1, name: "Home FC" },
              away: { id: 2, name: "Away FC" },
            },
          },
        ],
      },
      "http-live",
    );

    expect(mapped).toEqual([
      {
        fixtureId: "42",
        matchId: "football:42",
        competitionId: "292",
        competitionName: "K League 1",
        season: 2026,
        kickoff: "2026-07-20T10:00:00+00:00",
        homeTeamId: "1",
        homeTeamName: "Home FC",
        awayTeamId: "2",
        awayTeamName: "Away FC",
        status: "SCHEDULED",
        providerMethod: "http-live",
      },
    ]);
    expect(JSON.stringify(mapped[0])).not.toContain('"response"');
  });
});
