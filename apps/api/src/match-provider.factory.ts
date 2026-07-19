import type { OddsProviderConfig } from "@fas/config";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  CompositeMatchProvider,
  LiveTheOddsApiOddsSource,
  type MatchLookup,
  NoopOddsSnapshotPrimer,
  type OddsSnapshotPrimer,
  RecordedOddsSnapshotSource,
} from "@fas/provider-odds";

export interface MatchProviderWiring {
  readonly matchProvider: MatchLookup;
  readonly oddsPrimer: OddsSnapshotPrimer;
}

export function createMatchProviderWiring(
  oddsProvider: OddsProviderConfig,
): MatchProviderWiring {
  const fixtureProvider = new FixtureProvider();

  if (oddsProvider.mode === "fixture") {
    return Object.freeze({
      matchProvider: fixtureProvider,
      oddsPrimer: new NoopOddsSnapshotPrimer(),
    });
  }

  if (oddsProvider.mode === "live") {
    const apiKey = oddsProvider.apiKey;

    if (apiKey === undefined) {
      throw new Error(
        "THE_ODDS_API_KEY is required when ODDS_PROVIDER_MODE is live.",
      );
    }

    const liveSource = new LiveTheOddsApiOddsSource({
      apiKey,
      baseUrl: oddsProvider.baseUrl,
    });

    return Object.freeze({
      matchProvider: new CompositeMatchProvider(fixtureProvider, liveSource),
      oddsPrimer: liveSource,
    });
  }

  const recordedSource = new RecordedOddsSnapshotSource();

  return Object.freeze({
    matchProvider: new CompositeMatchProvider(fixtureProvider, recordedSource),
    oddsPrimer: new NoopOddsSnapshotPrimer(),
  });
}
