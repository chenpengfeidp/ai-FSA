import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapTheOddsApiH2h } from "../src/index.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("mapTheOddsApiH2h", () => {
  it("maps a recorded cassette to 1X2, AH, O/U, depth, and markets", () => {
    const raw = JSON.parse(
      readFileSync(join(fixturesDir, "match-example.json"), "utf8"),
    ) as unknown;

    const overlay = mapTheOddsApiH2h(raw, {
      providerMethod: "recorded-snapshot",
    });

    expect(overlay).toMatchObject({
      homeOdds: 1.55,
      drawOdds: 4.2,
      awayOdds: 5.8,
      observedAt: "2026-07-18T12:00:00Z",
      providerSource: "the-odds-api",
      providerSourceId:
        "evt_match_example_liverpool_chelsea:pinnacle:h2h+spreads+totals",
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
      closingDrawOdds: 4.3,
      closingAwayOdds: 6.0,
      oddsMovementHome: -0.15,
      oddsMovementDraw: 0.3,
      oddsMovementAway: 0.8,
      asianHandicapOpeningLine: -0.5,
      handicapMovement: -0.25,
      overUnderOpeningLine: 2.5,
      overUnderLineMovement: 0,
      publicBettingHomePct: 62,
      publicBettingDrawPct: 18,
      publicBettingAwayPct: 20,
      bettingVolume: 1250000,
      sharpMoneyIndicator: true,
    });
    expect(overlay?.markets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          marketType: "european_1x2",
          selection: "home",
          currentValue: 1.55,
          openingValue: 1.7,
          closingValue: 1.5,
          movement: -0.15,
        }),
        expect.objectContaining({
          marketType: "asian_handicap",
          selection: "asian_home",
          line: -0.75,
          currentValue: 1.75,
        }),
        expect.objectContaining({
          marketType: "over_under",
          selection: "over",
          line: 2.5,
          currentValue: 1.9,
        }),
      ]),
    );
  });

  it("maps the conflict cassette to away-favored 1X2 and AH without inventing depth", () => {
    const raw = JSON.parse(
      readFileSync(join(fixturesDir, "match-example-1.json"), "utf8"),
    ) as unknown;

    const overlay = mapTheOddsApiH2h(raw, {
      providerMethod: "recorded-snapshot",
    });

    expect(overlay?.awayOdds).toBe(2.05);
    expect(overlay?.asianHandicapLine).toBe(0.5);
    expect(overlay?.asianHandicapAwayOdds).toBe(1.8);
    expect(overlay?.providerSourceId).toContain("h2h+spreads");
    expect(overlay?.openingHomeOdds).toBeUndefined();
    expect(overlay?.publicBettingHomePct).toBeUndefined();
    expect(overlay?.overUnderLine).toBeUndefined();
    expect(overlay?.markets?.some((row) => row.marketType === "european_1x2")).toBe(
      true,
    );
  });

  it("returns 1X2-only when spreads and totals are absent", () => {
    const overlay = mapTheOddsApiH2h(
      {
        id: "evt_x",
        home_team: "Home",
        away_team: "Away",
        commence_time: "2026-08-01T19:30:00Z",
        bookmakers: [
          {
            key: "pinnacle",
            markets: [
              {
                key: "h2h",
                last_update: "2026-07-18T12:00:00Z",
                outcomes: [
                  { name: "Home", price: 2.1 },
                  { name: "Draw", price: 3.3 },
                  { name: "Away", price: 3.4 },
                ],
              },
            ],
          },
        ],
      },
      { providerMethod: "recorded-snapshot" },
    );

    expect(overlay?.asianHandicapLine).toBeUndefined();
    expect(overlay?.overUnderLine).toBeUndefined();
    expect(overlay?.openingHomeOdds).toBeUndefined();
    expect(overlay?.providerSourceId).toBe("evt_x:pinnacle:h2h");
    expect(overlay?.markets).toHaveLength(3);
  });

  it("returns undefined for malformed payloads", () => {
    expect(
      mapTheOddsApiH2h({ id: "x" }, { providerMethod: "http-live" }),
    ).toBeUndefined();
  });
});
