import { normalizeFixtureEvidenceSet } from "@fas/evidence-normalizer";
import { describe, expect, it, vi } from "vitest";
import {
  AsyncFootballMatchProvider,
  FootballProviderError,
  LiveApiSportsMatchCatalog,
  toEvidenceMatchShape,
} from "../src/index.js";

function fixtureItem(options: {
  readonly id: number;
  readonly homeId: number;
  readonly awayId: number;
  readonly status?: string;
  readonly homeGoals?: number;
  readonly awayGoals?: number;
}): Record<string, unknown> {
  return {
    fixture: {
      id: options.id,
      date: "2026-07-20T10:00:00+00:00",
      status: { short: options.status ?? "NS" },
      venue: { id: 1, name: "Live Stadium", city: "City" },
    },
    league: {
      id: 292,
      name: "K League 1",
      season: 2026,
      type: "League",
      round: "Regular Season - 1",
    },
    teams: {
      home: { id: options.homeId, name: "Home FC" },
      away: { id: options.awayId, name: "Away FC" },
    },
    goals: {
      home: options.homeGoals ?? null,
      away: options.awayGoals ?? null,
    },
  };
}

function formFixtures(teamId: number, opponentId: number): unknown {
  const dates = [
    "2026-07-14T10:00:00+00:00",
    "2026-07-10T10:00:00+00:00",
    "2026-07-06T10:00:00+00:00",
    "2026-07-02T10:00:00+00:00",
    "2026-06-28T10:00:00+00:00",
  ] as const;

  return {
    response: [
      {
        ...fixtureItem({
          id: 9001,
          homeId: teamId,
          awayId: opponentId,
          status: "FT",
          homeGoals: 2,
          awayGoals: 0,
        }),
        fixture: {
          id: 9001,
          date: dates[0],
          status: { short: "FT" },
          venue: { id: 1, name: "Live Stadium", city: "City" },
        },
      },
      {
        ...fixtureItem({
          id: 9002,
          homeId: opponentId,
          awayId: teamId,
          status: "FT",
          homeGoals: 1,
          awayGoals: 1,
        }),
        fixture: {
          id: 9002,
          date: dates[1],
          status: { short: "FT" },
          venue: { id: 1, name: "Live Stadium", city: "City" },
        },
      },
      {
        ...fixtureItem({
          id: 9003,
          homeId: teamId,
          awayId: opponentId,
          status: "FT",
          homeGoals: 1,
          awayGoals: 0,
        }),
        fixture: {
          id: 9003,
          date: dates[2],
          status: { short: "FT" },
          venue: { id: 1, name: "Live Stadium", city: "City" },
        },
      },
      {
        ...fixtureItem({
          id: 9004,
          homeId: teamId,
          awayId: opponentId,
          status: "FT",
          homeGoals: 0,
          awayGoals: 2,
        }),
        fixture: {
          id: 9004,
          date: dates[3],
          status: { short: "FT" },
          venue: { id: 1, name: "Live Stadium", city: "City" },
        },
      },
      {
        ...fixtureItem({
          id: 9005,
          homeId: opponentId,
          awayId: teamId,
          status: "FT",
          homeGoals: 0,
          awayGoals: 3,
        }),
        fixture: {
          id: 9005,
          date: dates[4],
          status: { short: "FT" },
          venue: { id: 1, name: "Live Stadium", city: "City" },
        },
      },
    ],
  };
}

function nextFixtures(teamId: number, opponentId: number): unknown {
  return {
    response: [
      {
        ...fixtureItem({
          id: 9101,
          homeId: teamId,
          awayId: opponentId,
          status: "NS",
        }),
        fixture: {
          id: 9101,
          date: "2026-07-24T10:00:00+00:00",
          status: { short: "NS" },
          venue: { id: 1, name: "Live Stadium", city: "City" },
        },
      },
    ],
  };
}

function createLiveFetch(): typeof fetch {
  return vi.fn(async (input: string) => {
    const url = String(input);

    if (url.includes("/fixtures?id=")) {
      return new Response(
        JSON.stringify({
          response: [fixtureItem({ id: 555001, homeId: 10, awayId: 20 })],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.includes("/fixtures?team=10&last=10")) {
      return new Response(JSON.stringify(formFixtures(10, 99)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/fixtures?team=20&last=10")) {
      return new Response(JSON.stringify(formFixtures(20, 98)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/fixtures?team=10&next=5")) {
      return new Response(JSON.stringify(nextFixtures(10, 99)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/fixtures?team=20&next=5")) {
      return new Response(JSON.stringify(nextFixtures(20, 98)), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/teams/statistics")) {
      return new Response(
        JSON.stringify({
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
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.includes("/fixtures/statistics")) {
      return new Response(
        JSON.stringify({
          response: [
            {
              team: { id: 10, name: "Home FC" },
              statistics: [
                { type: "Total Shots", value: 12 },
                { type: "Shots on Goal", value: 5 },
                { type: "Ball Possession", value: "58%" },
                { type: "Corner Kicks", value: 6 },
              ],
            },
            {
              team: { id: 20, name: "Away FC" },
              statistics: [
                { type: "Total Shots", value: 8 },
                { type: "Shots on Goal", value: 2 },
                { type: "Ball Possession", value: "42%" },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.includes("/fixtures/headtohead")) {
      return new Response(
        JSON.stringify({
          response: [
            fixtureItem({
              id: 8001,
              homeId: 10,
              awayId: 20,
              status: "FT",
              homeGoals: 2,
              awayGoals: 1,
            }),
            fixtureItem({
              id: 8002,
              homeId: 20,
              awayId: 10,
              status: "FT",
              homeGoals: 0,
              awayGoals: 0,
            }),
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    if (url.includes("/standings")) {
      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/players/squads")) {
      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/injuries")) {
      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/fixtures/lineups")) {
      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.includes("/coachs")) {
      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("not found", { status: 404 });
  }) as unknown as typeof fetch;
}

describe("LiveApiSportsMatchCatalog", () => {
  it("builds an Evidence-ready live bundle without fabricating failures", async () => {
    const catalog = new LiveApiSportsMatchCatalog({
      apiKey: "test-key",
      fetchImpl: createLiveFetch(),
      maxRetries: 0,
    });

    const bundle = await catalog.ensureMatchBundle("football:555001");
    expect(bundle).toBeDefined();
    if (bundle === undefined) {
      return;
    }

    expect(bundle.fixture.matchId).toBe("football:555001");
    expect(bundle.homeForm.window).toBeGreaterThan(0);
    expect(bundle.awayForm.window).toBeGreaterThan(0);
    expect(bundle.homeStats.advanced?.scope).toBe("fixture");
    expect(bundle.homeStats.advanced?.shotsOnTarget).toBe(5);
    expect(bundle.homeStats.advanced?.possessionPct).toBe(58);
    expect(bundle.matchContext).toHaveLength(2);
    expect(bundle.matchContext[0]?.metrics.restDays).toBeGreaterThan(0);
    expect(bundle.matchContext[0]?.metrics.competitionKind).toBe("league");

    const normalized = normalizeFixtureEvidenceSet(toEvidenceMatchShape(bundle), {
      collectedAt: "2026-07-17T10:00:00Z",
    });
    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(normalized.value.some((item) => item.type === "MATCH_CONTEXT")).toBe(
        true,
      );
    }
  });

  it("returns undefined for unknown fixture ids without fabricating Evidence", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ response: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const catalog = new LiveApiSportsMatchCatalog({
      apiKey: "test-key",
      fetchImpl,
      maxRetries: 0,
    });

    await expect(catalog.ensureMatchBundle("football:999999")).resolves.toBe(
      undefined,
    );
  });

  it("throws typed HTTP_ERROR when live transport fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 500 }));
    const catalog = new LiveApiSportsMatchCatalog({
      apiKey: "test-key",
      fetchImpl,
      maxRetries: 0,
    });

    await expect(catalog.ensureMatchBundle("football:555001")).rejects.toMatchObject(
      {
        name: "FootballProviderError",
        code: "HTTP_ERROR",
        status: 500,
      },
    );
  });

  it("throws INCOMPLETE_RESPONSE when required form cannot be mapped", async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      const url = String(input);

      if (url.includes("/fixtures?id=")) {
        return new Response(
          JSON.stringify({
            response: [fixtureItem({ id: 555001, homeId: 10, awayId: 20 })],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ response: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    const catalog = new LiveApiSportsMatchCatalog({
      apiKey: "test-key",
      fetchImpl,
      maxRetries: 0,
    });

    await expect(catalog.ensureMatchBundle("football:555001")).rejects.toMatchObject(
      {
        code: "INCOMPLETE_RESPONSE",
      },
    );
  });

  it("propagates provider failures through AsyncFootballMatchProvider.ensureMatch", async () => {
    const catalog = new LiveApiSportsMatchCatalog({
      apiKey: "test-key",
      fetchImpl: vi.fn(async () => new Response("down", { status: 503 })),
      maxRetries: 0,
    });
    const provider = new AsyncFootballMatchProvider(catalog);

    await expect(provider.ensureMatch("football:555001")).rejects.toBeInstanceOf(
      FootballProviderError,
    );
  });
});
