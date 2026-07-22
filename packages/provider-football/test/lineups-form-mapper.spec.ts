import { describe, expect, it } from "vitest";

import { mapApiFootballTeamForm } from "../src/mapper/map-api-football-form.js";
import { mapApiFootballLineupsResponse } from "../src/mapper/map-api-football-lineups.js";
import { mapApiFootballFixtureItem } from "../src/mapper/map-api-football-fixture.js";
import { RecordedFootballCatalog } from "../src/recorded/recorded-football-catalog.js";
import { toEvidenceMatchShape } from "../src/mapper/to-evidence-match.js";
import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";

describe("F1.1E provider lineup / referee / form mappers", () => {
  it("maps confirmed lineups and ignores empty sheets", () => {
    const lineups = mapApiFootballLineupsResponse(
      {
        response: [
          {
            team: { id: 10, name: "Home FC" },
            formation: "4-3-3",
            startXI: [
              { player: { id: 1, name: "A", number: 1, pos: "G", grid: "1:1" } },
            ],
            substitutes: [],
          },
          {
            team: { id: 20, name: "Away FC" },
            formation: "4-4-2",
            startXI: [],
            substitutes: [],
          },
        ],
      },
      {
        homeTeamId: "10",
        awayTeamId: "20",
        providerMethod: "http-live",
      },
    );

    expect(lineups).toHaveLength(1);
    expect(lineups[0]?.teamSide).toBe("home");
    expect(lineups[0]?.startXI[0]?.name).toBe("A");
  });

  it("maps referee identity from fixture string and form venue splits", () => {
    const fixture = mapApiFootballFixtureItem(
      {
        fixture: {
          id: 99,
          date: "2026-08-01T10:00:00+00:00",
          referee: "Kim Jong-hyeok",
          status: { short: "NS" },
          venue: { id: 1, name: "Stadium", city: "Seoul" },
        },
        league: { id: 292, name: "K League 1", season: 2026 },
        teams: {
          home: { id: 10, name: "Home FC" },
          away: { id: 20, name: "Away FC" },
        },
      },
      "http-live",
    );

    expect(fixture?.referee).toEqual({
      name: "Kim Jong-hyeok",
      country: undefined,
      league: undefined,
      statistics: undefined,
    });

    const form = mapApiFootballTeamForm(
      {
        response: [
          {
            fixture: {
              id: 1,
              date: "2026-07-20T10:00:00+00:00",
              status: { short: "FT" },
            },
            league: { id: 292, name: "K League 1", season: 2026 },
            teams: {
              home: { id: 10, name: "Home FC" },
              away: { id: 30, name: "Other" },
            },
            goals: { home: 2, away: 0 },
          },
          {
            fixture: {
              id: 2,
              date: "2026-07-15T10:00:00+00:00",
              status: { short: "FT" },
            },
            league: { id: 292, name: "K League 1", season: 2026 },
            teams: {
              home: { id: 40, name: "Other2" },
              away: { id: 10, name: "Home FC" },
            },
            goals: { home: 1, away: 0 },
          },
        ],
      },
      {
        teamId: "10",
        teamName: "Home FC",
        teamSide: "home",
        providerMethod: "http-live",
      },
    );

    expect(form?.homeSplit?.window).toBe(1);
    expect(form?.awaySplit?.window).toBe(1);
    expect(form?.goalsScoredPerMatch).toBe(1);
    expect(form?.goalsConcededPerMatch).toBe(0.5);
  });

  it("loads recorded cassette with lineup + referee into Evidence", () => {
    const catalog = new RecordedFootballCatalog();
    const bundle = catalog.getMatchBundle("football:100001");

    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.fixture.referee?.name).toBe("Kim Jong-hyeok");
    expect(bundle.lineups.length).toBe(2);
    expect(bundle.homeForm.homeSplit).toBeDefined();

    const shape = toEvidenceMatchShape(bundle);
    const normalized = normalizeFixtureEvidenceSet(shape, {
      collectedAt: "2026-07-22T12:00:00.000Z",
    });

    expect(normalized.ok).toBe(true);

    if (!normalized.ok) {
      return;
    }

    expect(normalized.value.some((item) => item.type === "LINEUP")).toBe(true);
    expect(
      normalized.value.some(
        (item) =>
          item.type === "MATCH_INFO" &&
          typeof item.payload.referee === "object" &&
          item.payload.referee !== null,
      ),
    ).toBe(true);
  });
});
