import type { FootballDataProviderConfig, OddsProviderConfig } from "@fas/config";
import {
  LiveApiSportsFootballSource,
  mapBoardRowToUpcomingFixture,
  RecordedFootballCatalog,
  type FootballBoardRow,
  type FootballFixturesSource,
} from "@fas/provider-football";
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
  readonly scheduleSource: "football-data" | "odds";
}

export interface UpcomingMatchesBoard {
  listUpcoming(): Promise<UpcomingBoardResult>;
}

export function createUpcomingMatchesBoard(
  footballProvider: FootballDataProviderConfig,
  oddsProvider: OddsProviderConfig,
  deps: {
    readonly eventStore: UpcomingEventStore;
    readonly scoresSource: ScoresSnapshotSource;
    readonly scoresPrimer: ScoresSnapshotPrimer;
    readonly scoresMethod: () => ScoresProviderMethod;
  },
): UpcomingMatchesBoard {
  if (footballProvider.mode !== "fixture") {
    return createFootballPrimaryBoard(footballProvider, deps);
  }

  return createOddsPrimaryBoard(oddsProvider, deps);
}

function createFootballPrimaryBoard(
  footballProvider: FootballDataProviderConfig,
  deps: {
    readonly eventStore: UpcomingEventStore;
    readonly scoresPrimer: ScoresSnapshotPrimer;
  },
): UpcomingMatchesBoard {
  const fixtureProvider = new FixtureProvider();
  const fixtureSeeds = fixtureProvider.listMatchSummaries();
  const liveSource =
    footballProvider.mode === "live"
      ? createLiveFootballSource(footballProvider)
      : undefined;
  const recordedCatalog = new RecordedFootballCatalog();
  const recordedSource: FootballFixturesSource = recordedCatalog;
  // Shell priming stays on recorded Odds cassette so Football Data primary never
  // burns Odds credits just to keep odds:* analyze available offline.
  const oddsShellSource = new RecordedUpcomingFixturesSource();

  return Object.freeze({
    async listUpcoming(): Promise<UpcomingBoardResult> {
      let footballRows: readonly FootballBoardRow[];
      let usedRecordedFallback = false;

      if (liveSource !== undefined) {
        try {
          footballRows = await liveSource.listUpcoming();
        } catch {
          footballRows = await recordedSource.listUpcoming();
          usedRecordedFallback = true;
        }

        // Soft-empty live responses still fall back so Match Center stays usable.
        if (footballRows.length === 0) {
          footballRows = await recordedSource.listUpcoming();
          usedRecordedFallback = true;
        }
      } else {
        footballRows = await recordedSource.listUpcoming();
      }

      const mapped = footballRows.map(mapBoardRowToUpcomingFixture);
      const merged = mergeUpcomingMatchBoard(mapped, fixtureSeeds);

      // Prime odds-event shells for odds:* analyze without putting Odds cassette
      // rows on the Football Data schedule.
      await deps.scoresPrimer.ensureScores();
      const oddsShells = await oddsShellSource.listUpcoming();

      const boardIds = new Set(merged.map((row) => row.matchId));
      const shells = [
        ...merged.map((row) =>
          Object.freeze({
            matchId: row.matchId,
            eventId: row.eventId,
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            kickoff: row.kickoff,
            competition: row.competition,
          }),
        ),
        ...oddsShells
          .filter((row) => !boardIds.has(row.matchId))
          .map((row) =>
            Object.freeze({
              matchId: row.matchId,
              eventId: row.eventId,
              homeTeam: row.homeTeam,
              awayTeam: row.awayTeam,
              kickoff: row.kickoff,
              competition: row.competition,
            }),
          ),
      ];

      deps.eventStore.replaceAll(Object.freeze(shells));

      return Object.freeze({
        usedRecordedFallback,
        scheduleSource: "football-data" as const,
        rows: Object.freeze(
          merged.map((row) => {
            if (row.providerSource === "api-football") {
              return row;
            }

            const fixtureBacked =
              fixtureProvider.getMatch(row.matchId) !== undefined;

            return Object.freeze({
              ...row,
              analyzable: fixtureBacked,
            });
          }),
        ),
      });
    },
  });
}

function createOddsPrimaryBoard(
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
        scheduleSource: "odds" as const,
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

function createLiveFootballSource(
  footballProvider: FootballDataProviderConfig,
): LiveApiSportsFootballSource {
  const apiKey = footballProvider.apiKey;

  if (apiKey === undefined) {
    throw new Error(
      "API_FOOTBALL_KEY is required when FOOTBALL_DATA_PROVIDER_MODE is live.",
    );
  }

  return new LiveApiSportsFootballSource({
    apiKey,
    baseUrl: footballProvider.baseUrl,
    ...(footballProvider.leagueIds !== undefined
      ? { leagueIds: footballProvider.leagueIds }
      : {}),
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
