import type { OddsProviderConfig } from "@fas/config";
import { FixtureProvider } from "@fas/provider-fixture";
import {
  LiveTheOddsApiUpcomingFixturesSource,
  mergeUpcomingMatchBoard,
  RecordedUpcomingFixturesSource,
  type UpcomingFixture,
  type UpcomingFixturesSource,
} from "@fas/provider-odds";

export interface UpcomingMatchesBoard {
  listUpcoming(): Promise<readonly UpcomingFixture[]>;
}

export function createUpcomingMatchesBoard(
  oddsProvider: OddsProviderConfig,
): UpcomingMatchesBoard {
  const fixtureProvider = new FixtureProvider();
  const fixtureSeeds = fixtureProvider.listMatchSummaries();
  const oddsSource = createOddsUpcomingSource(oddsProvider);

  return Object.freeze({
    async listUpcoming(): Promise<readonly UpcomingFixture[]> {
      const oddsRows = await oddsSource.listUpcoming();
      return mergeUpcomingMatchBoard(oddsRows, fixtureSeeds);
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

  // recorded and fixture modes both use the offline cassette for the calendar.
  return new RecordedUpcomingFixturesSource();
}
