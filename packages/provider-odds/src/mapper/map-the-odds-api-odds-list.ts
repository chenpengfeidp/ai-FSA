import { findDemoOddsCatalogEntryByEventId } from "../catalog/demo-odds-catalog.js";
import type {
  UpcomingFixture,
  UpcomingFixtureProviderMethod,
} from "../domain/upcoming-fixture.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function competitionLabel(sportKey: string, sportTitle: string | undefined): string {
  if (typeof sportTitle === "string" && sportTitle.trim().length > 0) {
    return sportTitle.trim();
  }

  if (sportKey === "soccer_epl") {
    return "EPL";
  }

  return sportKey;
}

/**
 * Maps a The Odds API `/v4/sports/{sport}/odds` array into Match Center rows.
 * Catalog-mapped events keep FAS demo match ids and are analyzable.
 */
export function mapTheOddsApiOddsList(
  body: unknown,
  options: {
    readonly providerMethod: UpcomingFixtureProviderMethod;
    readonly defaultSportKey: string;
  },
): readonly UpcomingFixture[] {
  if (!Array.isArray(body)) {
    return Object.freeze([]);
  }

  const rows: UpcomingFixture[] = [];

  for (const item of body) {
    if (!isRecord(item)) {
      continue;
    }

    const eventId = typeof item.id === "string" ? item.id.trim() : "";
    const homeTeam = typeof item.home_team === "string" ? item.home_team.trim() : "";
    const awayTeam = typeof item.away_team === "string" ? item.away_team.trim() : "";
    const kickoff =
      typeof item.commence_time === "string" ? item.commence_time.trim() : "";
    const sportKey =
      typeof item.sport_key === "string" && item.sport_key.trim().length > 0
        ? item.sport_key.trim()
        : options.defaultSportKey;
    const sportTitle =
      typeof item.sport_title === "string" ? item.sport_title : undefined;

    if (
      eventId.length === 0 ||
      homeTeam.length === 0 ||
      awayTeam.length === 0 ||
      kickoff.length === 0
    ) {
      continue;
    }

    const catalog = findDemoOddsCatalogEntryByEventId(eventId);
    const analyzable = catalog !== undefined;
    const matchId = catalog?.matchId ?? `odds:${eventId}`;

    rows.push(
      Object.freeze({
        matchId,
        eventId,
        sportKey,
        competition: competitionLabel(sportKey, sportTitle),
        homeTeam,
        awayTeam,
        kickoff,
        analyzable,
        providerSource: "the-odds-api",
        providerMethod: options.providerMethod,
      }),
    );
  }

  return Object.freeze(rows);
}
