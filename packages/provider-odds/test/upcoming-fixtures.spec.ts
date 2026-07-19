import { describe, expect, it, vi } from "vitest";
import {
  LiveTheOddsApiUpcomingFixturesSource,
  mapTheOddsApiOddsList,
  mergeUpcomingMatchBoard,
  RecordedUpcomingFixturesSource,
} from "../src/index.js";

describe("mapTheOddsApiOddsList", () => {
  it("maps catalog events to analyzable FAS match ids", () => {
    const rows = mapTheOddsApiOddsList(
      [
        {
          id: "eb2553d10d63dc912b99f8fd0d675721",
          sport_key: "soccer_epl",
          sport_title: "EPL",
          commence_time: "2026-08-21T19:00:00Z",
          home_team: "Arsenal",
          away_team: "Coventry City",
        },
        {
          id: "evt_unmapped",
          sport_key: "soccer_epl",
          sport_title: "EPL",
          commence_time: "2026-08-22T14:00:00Z",
          home_team: "Tottenham Hotspur",
          away_team: "Everton",
        },
      ],
      {
        providerMethod: "recorded-snapshot",
        defaultSportKey: "soccer_epl",
      },
    );

    expect(rows).toEqual([
      expect.objectContaining({
        matchId: "match-example-2",
        analyzable: true,
        providerSource: "the-odds-api",
      }),
      expect.objectContaining({
        matchId: "odds:evt_unmapped",
        analyzable: false,
      }),
    ]);
  });
});

describe("mergeUpcomingMatchBoard", () => {
  it("keeps odds rows and appends missing fixture demos", () => {
    const board = mergeUpcomingMatchBoard(
      [
        {
          matchId: "match-example-2",
          eventId: "eb2553d10d63dc912b99f8fd0d675721",
          sportKey: "soccer_epl",
          competition: "EPL",
          homeTeam: "Arsenal",
          awayTeam: "Coventry City",
          kickoff: "2026-08-21T19:00:00Z",
          analyzable: true,
          providerSource: "the-odds-api",
          providerMethod: "recorded-snapshot",
        },
      ],
      [
        {
          matchId: "match-example-2",
          homeTeam: "Arsenal",
          awayTeam: "Coventry City",
          kickoff: "2026-08-21T19:00:00Z",
          competition: "Premier League",
        },
        {
          matchId: "match-example-3",
          homeTeam: "Barcelona",
          awayTeam: "Real Madrid",
          kickoff: "2026-08-01T20:30:00Z",
          competition: "La Liga",
        },
      ],
    );

    expect(board.map((row) => row.matchId)).toEqual([
      "match-example-3",
      "match-example-2",
    ]);
    expect(board[1]?.providerSource).toBe("the-odds-api");
    expect(board[0]?.providerSource).toBe("fixture");
  });
});

describe("RecordedUpcomingFixturesSource", () => {
  it("loads the EPL cassette with mapped and unmapped rows", async () => {
    const source = new RecordedUpcomingFixturesSource();
    const rows = await source.listUpcoming();

    expect(rows.some((row) => row.matchId === "match-example-1")).toBe(true);
    expect(rows.some((row) => row.matchId === "match-example-2")).toBe(true);
    expect(rows.some((row) => row.matchId.startsWith("odds:"))).toBe(true);
  });
});

describe("LiveTheOddsApiUpcomingFixturesSource", () => {
  it("requests sport odds list and maps rows", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json([
        {
          id: "eb2553d10d63dc912b99f8fd0d675721",
          sport_key: "soccer_epl",
          sport_title: "EPL",
          commence_time: "2026-08-21T19:00:00Z",
          home_team: "Arsenal",
          away_team: "Coventry City",
        },
      ]),
    );
    const source = new LiveTheOddsApiUpcomingFixturesSource({
      apiKey: "test-key",
      baseUrl: "https://api.the-odds-api.com",
      fetchImpl,
    });

    const rows = await source.listUpcoming();
    expect(rows[0]?.matchId).toBe("match-example-2");
    expect(rows[0]?.providerMethod).toBe("http-live");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "/v4/sports/soccer_epl/odds",
    );
  });
});
