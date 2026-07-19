import type { OddsProviderConfig } from "@fas/config";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  CompositeMatchProvider,
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

export interface MatchProviderWiring {
  readonly matchProvider: MatchLookup;
  readonly oddsPrimer: OddsSnapshotPrimer;
  readonly scoresPrimer: ScoresSnapshotPrimer;
  readonly eventStore: UpcomingEventStore;
  readonly scoresSource: RecordedScoresSnapshotSource | LiveTheOddsApiScoresSource;
}

export function createMatchProviderWiring(
  oddsProvider: OddsProviderConfig,
): MatchProviderWiring {
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

    const liveOdds = new LiveTheOddsApiOddsSource({
      apiKey,
      baseUrl: oddsProvider.baseUrl,
    });
    const liveScores = new LiveTheOddsApiScoresSource({
      apiKey,
      baseUrl: oddsProvider.baseUrl,
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
