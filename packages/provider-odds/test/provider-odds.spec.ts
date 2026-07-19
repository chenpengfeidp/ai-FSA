import { describe, expect, it, vi } from "vitest";
import {
  CompositeMatchProvider,
  LiveTheOddsApiOddsSource,
  RecordedOddsSnapshotSource,
} from "../src/index.js";

describe("RecordedOddsSnapshotSource", () => {
  it("loads demo cassettes by match id", () => {
    const source = new RecordedOddsSnapshotSource();

    expect(source.getPreMatch1x2("match-example")?.homeOdds).toBe(1.55);
    expect(source.getPreMatch1x2("match-example-1")?.awayOdds).toBe(2.05);
    expect(source.getPreMatch1x2("match-unknown")).toBeUndefined();
  });
});

describe("CompositeMatchProvider", () => {
  it("overlays external odds metadata onto a fixture match", () => {
    const inner = {
      getMatch(matchId: string): unknown {
        if (matchId !== "match-example") {
          return undefined;
        }

        return Object.freeze({
          matchId,
          home: "Liverpool",
          away: "Chelsea",
          kickoff: "2026-08-01T19:30:00Z",
          odds: Object.freeze({
            homeOdds: 9.9,
            drawOdds: 9.9,
            awayOdds: 9.9,
            observedAt: "2026-01-01T00:00:00Z",
          }),
        });
      },
    };
    const provider = new CompositeMatchProvider(
      inner,
      new RecordedOddsSnapshotSource(),
    );
    const match = provider.getMatch("match-example") as {
      odds: {
        homeOdds: number;
        providerSource: string;
        providerMethod: string;
        asianHandicapLine: number;
        asianHandicapHomeOdds: number;
        asianHandicapAwayOdds: number;
      };
    };

    expect(match.odds.homeOdds).toBe(1.55);
    expect(match.odds.providerSource).toBe("the-odds-api");
    expect(match.odds.providerMethod).toBe("recorded-snapshot");
    expect(match.odds).toMatchObject({
      asianHandicapLine: -0.75,
      asianHandicapHomeOdds: 1.75,
      asianHandicapAwayOdds: 2.2,
    });
  });

  it("keeps the inner match when no odds overlay exists", () => {
    const innerMatch = Object.freeze({ matchId: "match-example-2", odds: null });
    const provider = new CompositeMatchProvider(
      {
        getMatch: () => innerMatch,
      },
      new RecordedOddsSnapshotSource(),
    );

    expect(provider.getMatch("match-example-2")).toBe(innerMatch);
  });
});

describe("LiveTheOddsApiOddsSource", () => {
  it("primes cache from a mocked HTTP response", async () => {
    const cassette = {
      id: "evt_match_example_liverpool_chelsea",
      home_team: "Liverpool",
      away_team: "Chelsea",
      bookmakers: [
        {
          key: "pinnacle",
          last_update: "2026-07-19T10:00:00Z",
          markets: [
            {
              key: "h2h",
              last_update: "2026-07-19T10:00:00Z",
              outcomes: [
                { name: "Liverpool", price: 1.6 },
                { name: "Draw", price: 4.0 },
                { name: "Chelsea", price: 5.5 },
              ],
            },
          ],
        },
      ],
    };
    const fetchImpl = vi.fn(async () => Response.json(cassette, { status: 200 }));
    const source = new LiveTheOddsApiOddsSource({
      apiKey: "test-key",
      baseUrl: "https://api.the-odds-api.com",
      fetchImpl,
    });

    expect(source.getPreMatch1x2("match-example")).toBeUndefined();
    await source.ensurePreMatch1x2("match-example");
    expect(source.getPreMatch1x2("match-example")?.homeOdds).toBe(1.6);
    expect(source.getPreMatch1x2("match-example")?.providerMethod).toBe("http-live");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
