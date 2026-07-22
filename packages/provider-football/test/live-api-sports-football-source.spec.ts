import { describe, expect, it, vi } from "vitest";
import { LiveApiSportsFootballSource } from "../src/index.js";

describe("LiveApiSportsFootballSource", () => {
  it("lists upcoming fixtures from live HTTP responses", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            response: [
              {
                fixture: {
                  id: 77,
                  date: "2026-07-22T12:00:00+00:00",
                  status: { short: "NS" },
                },
                league: { id: 292, name: "K League 1", season: 2026 },
                teams: {
                  home: { id: 1, name: "Home FC" },
                  away: { id: 2, name: "Away FC" },
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );

    const source = new LiveApiSportsFootballSource({
      apiKey: "test-key",
      leagueIds: [292],
      season: 2026,
      fetchImpl,
      maxRetries: 0,
    });

    const rows = await source.listUpcoming({
      fromDate: "2026-07-22",
      toDate: "2026-07-22",
    });

    expect(rows).toEqual([
      expect.objectContaining({
        matchId: "football:77",
        homeTeam: "Home FC",
        awayTeam: "Away FC",
        providerSource: "api-football",
        analyzable: false,
      }),
    ]);
  });

  it("throws typed failure instead of returning empty on HTTP error", async () => {
    const source = new LiveApiSportsFootballSource({
      apiKey: "test-key",
      leagueIds: [292],
      season: 2026,
      fetchImpl: vi.fn(async () => new Response("down", { status: 500 })),
      maxRetries: 0,
    });

    await expect(
      source.listUpcoming({
        fromDate: "2026-07-22",
        toDate: "2026-07-22",
      }),
    ).rejects.toMatchObject({ code: "HTTP_ERROR", status: 500 });
  });
});
