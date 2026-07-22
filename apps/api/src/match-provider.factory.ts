import type { FootballDataProviderConfig, OddsProviderConfig } from "@fas/config";
import {
  AsyncFootballMatchProvider,
  CompositeFootballFirstLookup,
  FootballMatchProvider,
  LiveApiSportsMatchCatalog,
  PrimedFootballMatchProvider,
  RecordedFootballCatalog,
} from "@fas/provider-football";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  CompositeMatchProvider,
  DEFAULT_MATCH_CENTER_SPORT_KEYS,
  EnrichedMatchProvider,
  LiveTheOddsApiOddsSource,
  LiveTheOddsApiScoresSource,
  type MatchLookup,
  NoopOddsSnapshotPrimer,
  type OddsSnapshotPrimer,
  RecordedOddsSnapshotSource,
  RecordedScoresSnapshotSource,
  type ScoresSnapshotPrimer,
  UpcomingEventStore,
} from "@fas/provider-odds";
import type { FootballMatchPrimer } from "./football-match-primer.bridge.js";

export interface MatchProviderWiring {
  readonly matchProvider: MatchLookup;
  readonly oddsPrimer: OddsSnapshotPrimer;
  readonly scoresPrimer: ScoresSnapshotPrimer;
  readonly eventStore: UpcomingEventStore;
  readonly scoresSource: RecordedScoresSnapshotSource | LiveTheOddsApiScoresSource;
  readonly footballPrimer: FootballMatchPrimer;
}

const noopFootballPrimer: FootballMatchPrimer = Object.freeze({
  async ensureMatch(): Promise<void> {
    // Recorded / disabled football modes need no network priming.
  },
});

export function createMatchProviderWiring(
  oddsProvider: OddsProviderConfig,
  footballProvider: FootballDataProviderConfig,
): MatchProviderWiring {
  const oddsWiring = createOddsMatchProviderWiring(oddsProvider);
  const football = createFootballLookup(footballProvider);

  return Object.freeze({
    matchProvider: new CompositeFootballFirstLookup(
      football.lookup,
      oddsWiring.matchProvider,
    ),
    oddsPrimer: oddsWiring.oddsPrimer,
    scoresPrimer: oddsWiring.scoresPrimer,
    eventStore: oddsWiring.eventStore,
    scoresSource: oddsWiring.scoresSource,
    footballPrimer: football.primer,
  });
}

function createFootballLookup(footballProvider: FootballDataProviderConfig): {
  readonly lookup: MatchLookup;
  readonly primer: FootballMatchPrimer;
} {
  if (footballProvider.mode === "fixture") {
    return Object.freeze({
      lookup: Object.freeze({
        getMatch(): undefined {
          return undefined;
        },
      }),
      primer: noopFootballPrimer,
    });
  }

  if (footballProvider.mode === "live") {
    const apiKey = footballProvider.apiKey;

    if (apiKey === undefined) {
      throw new Error(
        "API_FOOTBALL_KEY is required when FOOTBALL_DATA_PROVIDER_MODE is live.",
      );
    }

    const catalog = new LiveApiSportsMatchCatalog({
      apiKey,
      baseUrl: footballProvider.baseUrl,
      timeoutMs: footballProvider.timeoutMs,
      maxRetries: footballProvider.maxRetries,
    });
    const asyncProvider = new AsyncFootballMatchProvider(catalog);

    return Object.freeze({
      lookup: new PrimedFootballMatchProvider(asyncProvider),
      primer: Object.freeze({
        async ensureMatch(matchId: string): Promise<void> {
          if (!matchId.startsWith("football:")) {
            return;
          }

          await asyncProvider.ensureMatch(matchId);
        },
      }),
    });
  }

  const catalog = new RecordedFootballCatalog();

  return Object.freeze({
    lookup: new FootballMatchProvider(catalog),
    primer: noopFootballPrimer,
  });
}

function createOddsMatchProviderWiring(oddsProvider: OddsProviderConfig): Omit<
  MatchProviderWiring,
  "footballPrimer" | "matchProvider"
> & {
  readonly matchProvider: MatchLookup;
} {
  const fixtureProvider = new FixtureProvider();
  const eventStore = new UpcomingEventStore();

  if (oddsProvider.mode === "fixture") {
    const scores = new RecordedScoresSnapshotSource();

    return Object.freeze({
      matchProvider: new EnrichedMatchProvider(
        fixtureProvider,
        eventStore,
        scores,
        () => scores.providerMethod(),
      ),
      oddsPrimer: new NoopOddsSnapshotPrimer(),
      scoresPrimer: scores,
      eventStore,
      scoresSource: scores,
    });
  }

  if (oddsProvider.mode === "live") {
    const apiKey = oddsProvider.apiKey;

    if (apiKey === undefined) {
      throw new Error(
        "THE_ODDS_API_KEY is required when ODDS_PROVIDER_MODE is live.",
      );
    }

    const sportKeys = oddsProvider.sportKeys ?? DEFAULT_MATCH_CENTER_SPORT_KEYS;
    const liveOdds = new LiveTheOddsApiOddsSource({
      apiKey,
      baseUrl: oddsProvider.baseUrl,
    });
    const liveScores = new LiveTheOddsApiScoresSource({
      apiKey,
      baseUrl: oddsProvider.baseUrl,
      sportKeys,
    });
    const withOdds = new CompositeMatchProvider(fixtureProvider, liveOdds);
    const enriched = new EnrichedMatchProvider(
      withOdds,
      eventStore,
      liveScores,
      () => liveScores.providerMethod(),
    );

    return Object.freeze({
      matchProvider: enriched,
      oddsPrimer: liveOdds,
      scoresPrimer: liveScores,
      eventStore,
      scoresSource: liveScores,
    });
  }

  const recordedOdds = new RecordedOddsSnapshotSource();
  const recordedScores = new RecordedScoresSnapshotSource();
  const withOdds = new CompositeMatchProvider(fixtureProvider, recordedOdds);
  const enriched = new EnrichedMatchProvider(
    withOdds,
    eventStore,
    recordedScores,
    () => recordedScores.providerMethod(),
  );

  return Object.freeze({
    matchProvider: enriched,
    oddsPrimer: new NoopOddsSnapshotPrimer(),
    scoresPrimer: recordedScores,
    eventStore,
    scoresSource: recordedScores,
  });
}
