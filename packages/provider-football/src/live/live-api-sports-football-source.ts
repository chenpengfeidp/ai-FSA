import { DEFAULT_FOOTBALL_LEAGUE_IDS } from "../catalog/default-league-ids.js";
import type {
  FootballBoardRow,
  FootballFixture,
} from "../domain/football-models.js";
import type { FootballFixturesSource } from "../domain/ports.js";
import { mapApiFootballFixturesResponse } from "../mapper/map-api-football-fixture.js";

export type FootballHttpFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface LiveApiSportsFootballSourceOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly leagueIds?: readonly number[];
  readonly season?: number;
  readonly fetchImpl?: FootballHttpFetch;
}

/** API-Sports official host (not RapidAPI). Auth: `x-apisports-key`. */
export const API_SPORTS_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

/**
 * Live upcoming fixtures. Maps vendor JSON → FootballFixture/BoardRow only;
 * raw response bodies never leave this adapter.
 */
export class LiveApiSportsFootballSource implements FootballFixturesSource {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #leagueIds: readonly number[];
  readonly #season: number;
  readonly #fetchImpl: FootballHttpFetch;

  constructor(options: LiveApiSportsFootballSourceOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? API_SPORTS_FOOTBALL_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.#leagueIds =
      options.leagueIds !== undefined && options.leagueIds.length > 0
        ? Object.freeze([...options.leagueIds])
        : DEFAULT_FOOTBALL_LEAGUE_IDS;
    this.#season = options.season ?? new Date().getUTCFullYear();
    this.#fetchImpl = options.fetchImpl ?? fetch;
  }

  async listUpcoming(options?: {
    readonly fromDate?: string;
    readonly toDate?: string;
  }): Promise<readonly FootballBoardRow[]> {
    const fromDate = options?.fromDate ?? utcDateOffset(0);
    const toDate = options?.toDate ?? utcDateOffset(3);
    const fixtures: FootballFixture[] = [];

    for (const leagueId of this.#leagueIds) {
      const batch = await this.#fetchLeagueFixtures(leagueId, fromDate, toDate);
      fixtures.push(...batch);
    }

    const rows = fixtures
      .map(
        (fixture): FootballBoardRow =>
          Object.freeze({
            matchId: fixture.matchId,
            fixtureId: fixture.fixtureId,
            competitionId: fixture.competitionId,
            competition: fixture.competitionName,
            homeTeam: fixture.homeTeamName,
            awayTeam: fixture.awayTeamName,
            kickoff: fixture.kickoff,
            // Live list alone is not enough for analyzable; enrichment is a follow-up.
            analyzable: false,
            providerSource: "api-football" as const,
            providerMethod: fixture.providerMethod,
          }),
      )
      .sort((left, right) => left.kickoff.localeCompare(right.kickoff));

    return Object.freeze(rows);
  }

  async #fetchLeagueFixtures(
    leagueId: number,
    fromDate: string,
    toDate: string,
  ): Promise<readonly FootballFixture[]> {
    const url = new URL(`${this.#baseUrl}/fixtures`);
    url.searchParams.set("league", String(leagueId));
    url.searchParams.set("season", String(this.#season));
    url.searchParams.set("from", fromDate);
    url.searchParams.set("to", toDate);

    try {
      const response = await this.#fetchImpl(url.toString(), {
        method: "GET",
        headers: Object.freeze({
          Accept: "application/json",
          "x-apisports-key": this.#apiKey,
        }),
      });

      if (!response.ok) {
        return Object.freeze([]);
      }

      const body: unknown = await response.json();
      return mapApiFootballFixturesResponse(body, "http-live");
    } catch {
      return Object.freeze([]);
    }
  }
}

function utcDateOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  const year = String(date.getUTCFullYear());
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
