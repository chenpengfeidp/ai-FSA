import { DEFAULT_FOOTBALL_LEAGUE_IDS } from "../catalog/default-league-ids.js";
import type {
  FootballBoardRow,
  FootballFixture,
} from "../domain/football-models.js";
import type { FootballFixturesSource } from "../domain/ports.js";
import { mapApiFootballFixturesResponse } from "../mapper/map-api-football-fixture.js";
import { FootballProviderError } from "./football-provider-error.js";
import { fetchFootballJson, type FootballHttpFetch } from "./live-football-http.js";

export type { FootballHttpFetch } from "./live-football-http.js";

export interface LiveApiSportsFootballSourceOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly leagueIds?: readonly number[];
  readonly season?: number;
  readonly fetchImpl?: FootballHttpFetch;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

/** API-Sports official host (not RapidAPI). Auth: `x-apisports-key`. */
export const API_SPORTS_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";

/**
 * Live upcoming fixtures. Maps vendor JSON → FootballFixture/BoardRow only;
 * raw response bodies never leave this adapter.
 * Transport failures throw FootballProviderError (never empty success).
 */
export class LiveApiSportsFootballSource implements FootballFixturesSource {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #leagueIds: readonly number[];
  readonly #season: number;
  readonly #fetchImpl: FootballHttpFetch;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;

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
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#maxRetries = options.maxRetries ?? 2;
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

    const body = await fetchFootballJson(url.toString(), {
      apiKey: this.#apiKey,
      fetchImpl: this.#fetchImpl,
      timeoutMs: this.#timeoutMs,
      maxRetries: this.#maxRetries,
    });

    if (body === null || typeof body !== "object") {
      throw new FootballProviderError(
        "INVALID_RESPONSE",
        `Live football fixtures response was invalid for league ${String(leagueId)}.`,
      );
    }

    return mapApiFootballFixturesResponse(body, "http-live");
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
