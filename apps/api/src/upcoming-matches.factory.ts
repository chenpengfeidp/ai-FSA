import type { OddsProviderConfig } from "@fas/config";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  buildFormAndStatsForMatch,
  LiveTheOddsApiUpcomingFixturesSource,
  mergeUpcomingMatchBoard,
  RecordedUpcomingFixturesSource,
  type ScoresProviderMethod,
  type ScoresSnapshotPrimer,
  type ScoresSnapshotSource,
  type UpcomingEventStore,
  type UpcomingFixture,
  type UpcomingFixturesSource,
} from "@fas/provider-odds";

export interface UpcomingMatchesBoard {
  listUpcoming(): Promise<readonly UpcomingFixture[]>;
}

export function createUpcomingMatchesBoard(
  oddsProvider: OddsProviderConfig,
  deps: {
    readonly eventStore: UpcomingEventStore;
    readonly scoresSource: ScoresSnapshotSource;
    readonly scoresPrimer: ScoresSnapshotPrimer;
    readonly scoresMethod: () => ScoresProviderMethod;
  },
): UpcomingMatchesBoard {
  const fixtureProvider = new FixtureProvider();
  const fixtureSeeds = fixtureProvider.listMatchSummaries();
  const oddsSource = createOddsUpcomingSource(oddsProvider);

  return Object.freeze({
    async listUpcoming(): Promise<readonly UpcomingFixture[]> {
      await deps.scoresPrimer.ensureScores();
      const oddsRows = await oddsSource.listUpcoming();
      const merged = mergeUpcomingMatchBoard(oddsRows, fixtureSeeds);

      deps.eventStore.replaceAll(
        merged.map((row) =>
          Object.freeze({
            matchId: row.matchId,
            eventId: row.eventId,
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            kickoff: row.kickoff,
            competition: row.competition,
          }),
        ),
      );

      const scorelines = deps.scoresSource.getCompletedScorelines();
      const method = deps.scoresMethod();

      return Object.freeze(
        merged.map((row) => {
          const fixtureBacked = fixtureProvider.getMatch(row.matchId) !== undefined;
          const scoresBacked =
            buildFormAndStatsForMatch({
              homeTeam: row.homeTeam,
              awayTeam: row.awayTeam,
              scorelines,
              providerMethod: method,
            }) !== undefined;

          return Object.freeze({
            ...row,
            analyzable: fixtureBacked || scoresBacked,
          });
        }),
      );
    },
  });
}

function createOddsUpcomingSource(
  oddsProvider: OddsProviderConfig,
): UpcomingFixturesSource {
  if (oddsProvider.mode === "live") {
    const apiKey = oddsProvider.apiKey;

    if (apiKey === undefined) {
      throw new Error(
        "THE_ODDS_API_KEY is required when ODDS_PROVIDER_MODE is live.",
      );
    }

    return new LiveTheOddsApiUpcomingFixturesSource({
      apiKey,
      baseUrl: oddsProvider.baseUrl,
    });
  }

  return new RecordedUpcomingFixturesSource();
}
