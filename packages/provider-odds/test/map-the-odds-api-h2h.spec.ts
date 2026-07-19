import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapTheOddsApiH2h } from "../src/index.js";

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("mapTheOddsApiH2h", () => {
  it("maps a recorded home-favored cassette to 1X2 and Asian handicap", () => {
    const raw = JSON.parse(
      readFileSync(join(fixturesDir, "match-example.json"), "utf8"),
    ) as unknown;

    expect(mapTheOddsApiH2h(raw, { providerMethod: "recorded-snapshot" })).toEqual({
      homeOdds: 1.55,
      drawOdds: 4.2,
      awayOdds: 5.8,
      observedAt: "2026-07-18T12:00:00Z",
      providerSource: "the-odds-api",
      providerSourceId: "evt_match_example_liverpool_chelsea:pinnacle:h2h+spreads",
      providerMethod: "recorded-snapshot",
      asianHandicapLine: -0.75,
      asianHandicapHomeOdds: 1.75,
      asianHandicapAwayOdds: 2.2,
    });
  });

  it("maps the conflict cassette to away-favored 1X2 and AH", () => {
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
  });

  it("returns 1X2-only when spreads are absent", () => {
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
    expect(overlay?.providerSourceId).toBe("evt_x:pinnacle:h2h");
  });

  it("returns undefined for malformed payloads", () => {
    expect(
      mapTheOddsApiH2h({ id: "x" }, { providerMethod: "http-live" }),
    ).toBeUndefined();
  });
});
