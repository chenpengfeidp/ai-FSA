import { describe, expect, it, vi } from "vitest";
import {
  buildFormAndStatsForMatch,
  buildTeamFormFromScores,
  EnrichedMatchProvider,
  LiveTheOddsApiScoresSource,
  mapTheOddsApiScores,
  RecordedScoresSnapshotSource,
  UpcomingEventStore,
} from "../src/index.js";

describe("mapTheOddsApiScores", () => {
  it("keeps only completed games with numeric scores", () => {
    const rows = mapTheOddsApiScores(
      [
        {
          id: "a",
          completed: true,
          commence_time: "2026-07-18T14:00:00Z",
          home_team: "Arsenal",
          away_team: "Brighton and Hove Albion",
          scores: [
            { name: "Arsenal", score: "2" },
            { name: "Brighton and Hove Albion", score: "0" },
          ],
        },
        {
          id: "b",
          completed: false,
          commence_time: "2026-08-01T14:00:00Z",
          home_team: "Liverpool",
          away_team: "Chelsea",
          scores: null,
        },
      ],
      "recorded-snapshot",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      homeTeam: "Arsenal",
      homeGoals: 2,
      awayGoals: 0,
    });
  });
});

describe("buildTeamFormFromScores", () => {
  it("builds most-recent-first W/D/L windows", () => {
    const form = buildTeamFormFromScores(
      "Arsenal",
      "home",
      [
        {
          eventId: "1",
          commenceTime: "2026-07-18T14:00:00Z",
          homeTeam: "Arsenal",
          awayTeam: "X",
          homeGoals: 2,
          awayGoals: 0,
        },
        {
          eventId: "2",
          commenceTime: "2026-07-15T19:00:00Z",
          homeTeam: "Y",
          awayTeam: "Arsenal",
          homeGoals: 1,
          awayGoals: 2,
        },
      ],
      { providerMethod: "recorded-snapshot" },
    );

    expect(form).toMatchObject({
      window: 2,
      results: ["W", "W"],
      goalsFor: [2, 2],
      providerMethod: "recorded-snapshot",
    });
  });
});

describe("RecordedScoresSnapshotSource + EnrichedMatchProvider", () => {
  it("makes an odds-event shell analyzable from scores cassette", () => {
    const scores = new RecordedScoresSnapshotSource();
    const events = new UpcomingEventStore();
    events.replaceAll([
      {
        matchId: "odds:evt_epl_unmapped_tottenham_everton",
        eventId: "evt_epl_unmapped_tottenham_everton",
        homeTeam: "Tottenham Hotspur",
        awayTeam: "Everton",
        kickoff: "2026-08-22T14:00:00Z",
        competition: "EPL",
      },
    ]);
    const provider = new EnrichedMatchProvider(
      { getMatch: () => undefined },
      events,
      scores,
      () => scores.providerMethod(),
    );
    const match = provider.getMatch("odds:evt_epl_unmapped_tottenham_everton") as {
      teamForm: readonly { results: readonly string[] }[];
      statistics: readonly { providerMethod: string }[];
    };

    expect(match.teamForm).toHaveLength(2);
    expect(match.statistics[0]?.providerMethod).toBe("scores-goals-proxy");
    expect(
      buildFormAndStatsForMatch({
        homeTeam: "Tottenham Hotspur",
        awayTeam: "Everton",
        scorelines: scores.getCompletedScorelines(),
        providerMethod: "recorded-snapshot",
      }),
    ).toBeDefined();
  });
});

describe("LiveTheOddsApiScoresSource", () => {
  it("primes completed scorelines from HTTP", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json([
        {
          id: "x",
          completed: true,
          commence_time: "2026-07-18T14:00:00Z",
          home_team: "Arsenal",
          away_team: "Brighton and Hove Albion",
          scores: [
            { name: "Arsenal", score: "2" },
            { name: "Brighton and Hove Albion", score: "0" },
          ],
        },
      ]),
    );
    const source = new LiveTheOddsApiScoresSource({
      apiKey: "test-key",
      baseUrl: "https://api.the-odds-api.com",
      fetchImpl,
    });

    await source.ensureScores();
    expect(source.getCompletedScorelines()).toHaveLength(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("/scores");
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain("daysFrom=3");
  });
});
