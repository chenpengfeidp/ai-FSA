import type { FootballMatchBundle } from "../domain/football-models.js";
import type { FootballMatchCatalog } from "../domain/ports.js";
import { mapApiFootballFixtureItem } from "../mapper/map-api-football-fixture.js";
import { mapApiFootballTeamForm } from "../mapper/map-api-football-form.js";
import { mapApiFootballH2H } from "../mapper/map-api-football-h2h.js";
import { mapApiFootballInjuriesResponse } from "../mapper/map-api-football-injuries.js";
import { mapApiFootballSquadResponse } from "../mapper/map-api-football-squad.js";
import { mapApiFootballStandings } from "../mapper/map-api-football-standings.js";
import { mapApiFootballTeamStats } from "../mapper/map-api-football-stats.js";
import { statsFromFormGoals } from "../mapper/stats-from-form.js";
import { FootballProviderError } from "./football-provider-error.js";
import { API_SPORTS_FOOTBALL_BASE_URL } from "./live-api-sports-football-source.js";
import { fetchFootballJson, type FootballHttpFetch } from "./live-football-http.js";

export interface LiveApiSportsMatchCatalogOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: FootballHttpFetch;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFixtureId(matchId: string): string | undefined {
  const prefix = "football:";

  if (!matchId.startsWith(prefix)) {
    return undefined;
  }

  const id = matchId.slice(prefix.length).trim();
  return id.length > 0 ? id : undefined;
}

/**
 * Live MatchLookup catalog: fetches fixture + form + stats + H2H (+ optional standings),
 * maps each response into FAS domain models before any Evidence hand-off.
 * Transport / incomplete-required failures throw FootballProviderError.
 */
export class LiveApiSportsMatchCatalog implements FootballMatchCatalog {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetchImpl: FootballHttpFetch;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #cache = new Map<string, FootballMatchBundle>();

  constructor(options: LiveApiSportsMatchCatalogOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? API_SPORTS_FOOTBALL_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#maxRetries = options.maxRetries ?? 2;
  }

  getMatchBundle(matchId: string): FootballMatchBundle | undefined {
    return this.#cache.get(matchId);
  }

  listBundles(): readonly FootballMatchBundle[] {
    return Object.freeze([...this.#cache.values()]);
  }

  async ensureMatchBundle(
    matchId: string,
  ): Promise<FootballMatchBundle | undefined> {
    const cached = this.#cache.get(matchId);

    if (cached !== undefined) {
      return cached;
    }

    const fixtureId = parseFixtureId(matchId);

    if (fixtureId === undefined) {
      return undefined;
    }

    const fixtureBody = await this.#getJson(
      `/fixtures?id=${encodeURIComponent(fixtureId)}`,
    );

    if (!isRecord(fixtureBody) || !Array.isArray(fixtureBody.response)) {
      throw new FootballProviderError(
        "INVALID_RESPONSE",
        `Live football fixture response was invalid for "${matchId}".`,
      );
    }

    if (fixtureBody.response.length === 0) {
      return undefined;
    }

    const fixture = mapApiFootballFixtureItem(fixtureBody.response[0], "http-live");

    if (fixture === undefined) {
      throw new FootballProviderError(
        "INVALID_RESPONSE",
        `Live football fixture mapping failed for "${matchId}".`,
      );
    }

    const [
      homeFormBody,
      awayFormBody,
      homeStatsBody,
      awayStatsBody,
      h2hBody,
      standingsBody,
      homeSquadBody,
      awaySquadBody,
      injuriesBody,
    ] = await Promise.all([
      this.#getJson(
        `/fixtures?team=${encodeURIComponent(fixture.homeTeamId)}&last=5`,
      ),
      this.#getJson(
        `/fixtures?team=${encodeURIComponent(fixture.awayTeamId)}&last=5`,
      ),
      this.#getJson(
        `/teams/statistics?league=${encodeURIComponent(fixture.competitionId)}&season=${String(fixture.season)}&team=${encodeURIComponent(fixture.homeTeamId)}`,
      ),
      this.#getJson(
        `/teams/statistics?league=${encodeURIComponent(fixture.competitionId)}&season=${String(fixture.season)}&team=${encodeURIComponent(fixture.awayTeamId)}`,
      ),
      this.#getJson(
        `/fixtures/headtohead?h2h=${encodeURIComponent(`${fixture.homeTeamId}-${fixture.awayTeamId}`)}&last=5`,
      ),
      this.#getJson(
        `/standings?league=${encodeURIComponent(fixture.competitionId)}&season=${String(fixture.season)}`,
      ),
      this.#getJson(
        `/players/squads?team=${encodeURIComponent(fixture.homeTeamId)}`,
      ),
      this.#getJson(
        `/players/squads?team=${encodeURIComponent(fixture.awayTeamId)}`,
      ),
      this.#getJson(`/injuries?fixture=${encodeURIComponent(fixture.fixtureId)}`),
    ]);

    const homeForm = mapApiFootballTeamForm(homeFormBody, {
      teamId: fixture.homeTeamId,
      teamName: fixture.homeTeamName,
      teamSide: "home",
      providerMethod: "http-live",
    });
    const awayForm = mapApiFootballTeamForm(awayFormBody, {
      teamId: fixture.awayTeamId,
      teamName: fixture.awayTeamName,
      teamSide: "away",
      providerMethod: "http-live",
    });
    const headToHead = mapApiFootballH2H(h2hBody, {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      providerMethod: "http-live",
    });

    if (
      homeForm === undefined ||
      awayForm === undefined ||
      headToHead === undefined
    ) {
      throw new FootballProviderError(
        "INCOMPLETE_RESPONSE",
        `Live football match "${matchId}" is missing required form or H2H Evidence inputs.`,
      );
    }

    const mappedHomeStats = mapApiFootballTeamStats(homeStatsBody, {
      teamId: fixture.homeTeamId,
      teamName: fixture.homeTeamName,
      teamSide: "home",
      providerMethod: "http-live",
      windowMatches: homeForm.window,
    });
    const mappedAwayStats = mapApiFootballTeamStats(awayStatsBody, {
      teamId: fixture.awayTeamId,
      teamName: fixture.awayTeamName,
      teamSide: "away",
      providerMethod: "http-live",
      windowMatches: awayForm.window,
    });

    const homeStats = mappedHomeStats ?? statsFromFormGoals(homeForm);
    const awayStats = mappedAwayStats ?? statsFromFormGoals(awayForm);

    const standings = mapApiFootballStandings(standingsBody, {
      competitionId: fixture.competitionId,
      competitionName: fixture.competitionName,
      season: fixture.season,
      providerMethod: "http-live",
    });

    const homePlayers = mapApiFootballSquadResponse(homeSquadBody, {
      teamId: fixture.homeTeamId,
      teamName: fixture.homeTeamName,
      teamSide: "home",
      providerMethod: "http-live",
      maxPlayers: 12,
    });
    const awayPlayers = mapApiFootballSquadResponse(awaySquadBody, {
      teamId: fixture.awayTeamId,
      teamName: fixture.awayTeamName,
      teamSide: "away",
      providerMethod: "http-live",
      maxPlayers: 12,
    });

    // Empty injuries → honest absence (not “all available”).
    const availabilityAbsences = mapApiFootballInjuriesResponse(injuriesBody, {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      providerMethod: "http-live",
    });

    const bundle: FootballMatchBundle = Object.freeze({
      fixture,
      homeForm,
      awayForm,
      homeStats,
      awayStats,
      headToHead,
      standings,
      players: Object.freeze([...homePlayers, ...awayPlayers]),
      availabilityAbsences,
    });

    this.#cache.set(matchId, bundle);
    return bundle;
  }

  async #getJson(path: string): Promise<unknown> {
    return fetchFootballJson(`${this.#baseUrl}${path}`, {
      apiKey: this.#apiKey,
      fetchImpl: this.#fetchImpl,
      timeoutMs: this.#timeoutMs,
      maxRetries: this.#maxRetries,
    });
  }
}
