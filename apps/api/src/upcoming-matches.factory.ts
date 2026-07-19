import type { OddsProviderConfig } from "@fas/config";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  buildFormAndStatsForMatch,
  DEFAULT_MATCH_CENTER_SPORT_KEYS,
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

export interface UpcomingBoardResult {
  readonly rows: readonly UpcomingFixture[];
  readonly usedRecordedFallback: boolean;
}

export interface UpcomingMatchesBoard {
  listUpcoming(): Promise<UpcomingBoardResult>;
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

  const recordedFallback = new RecordedUpcomingFixturesSource();

  return Object.freeze({
    async listUpcoming(): Promise<UpcomingBoardResult> {
      await deps.scoresPrimer.ensureScores();
      let oddsRows: readonly UpcomingFixture[];
      let usedRecordedFallback = false;

      try {
        oddsRows = await oddsSource.listUpcoming();
      } catch (error) {
        // Live quota / rate-limit storms: keep Match Center usable offline.
        if (oddsProvider.mode !== "live") {
          throw error;
        }

        oddsRows = await recordedFallback.listUpcoming();
        usedRecordedFallback = true;
      }

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

      return Object.freeze({
        usedRecordedFallback,
        rows: Object.freeze(
          merged.map((row) => {
            const fixtureBacked =
              fixtureProvider.getMatch(row.matchId) !== undefined;
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
        ),
      });
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
      sportKeys: oddsProvider.sportKeys ?? DEFAULT_MATCH_CENTER_SPORT_KEYS,
    });
  }

  return new RecordedUpcomingFixturesSource();
}
