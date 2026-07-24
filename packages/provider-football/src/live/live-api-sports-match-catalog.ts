import type { FootballMatchBundle } from "../domain/football-models.js";
import type { FootballMatchCatalog } from "../domain/ports.js";
import { mapApiFootballFixtureItem } from "../mapper/map-api-football-fixture.js";
import { mapApiFootballTeamForm } from "../mapper/map-api-football-form.js";
import { mapApiFootballH2H } from "../mapper/map-api-football-h2h.js";
import type { FootballClubManagerFact } from "../domain/football-club-intelligence.js";
import {
  mapApiFootballCoachResponse,
  mapCoachNameFromLineupEntry,
} from "../mapper/map-api-football-coach.js";
import { mapClubIntelligenceFromStandings } from "../mapper/map-club-intelligence-from-standings.js";
import { mapApiFootballInjuriesResponse } from "../mapper/map-api-football-injuries.js";
import { mapApiFootballLineupsResponse } from "../mapper/map-api-football-lineups.js";
import {
  applyAvailabilityAndSquadStatus,
  mergePlayerSeasonStats,
  selectPlayerStatsCandidates,
  type PlayerStatsEnrichmentEntry,
} from "../mapper/enrich-player-intelligence.js";
import { mapApiFootballPlayerStatsResponse } from "../mapper/map-api-football-player-stats.js";
import { mapApiFootballSquadResponse } from "../mapper/map-api-football-squad.js";
import { mapApiFootballStandings } from "../mapper/map-api-football-standings.js";
import { mapApiFootballFixtureExpectedGoals } from "../mapper/map-api-football-expected-goals.js";
import { mapApiFootballFixtureStatistics } from "../mapper/map-api-football-fixture-statistics.js";
import {
  mapApiFootballMatchContext,
  readApiFootballFixtureContextMeta,
} from "../mapper/map-api-football-match-context.js";
import {
  mapApiFootballTeamStats,
  withAdvancedStats,
} from "../mapper/map-api-football-stats.js";
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

    const fixtureItem = fixtureBody.response[0];
    const fixture = mapApiFootballFixtureItem(fixtureItem, "http-live");

    if (fixture === undefined) {
      throw new FootballProviderError(
        "INVALID_RESPONSE",
        `Live football fixture mapping failed for "${matchId}".`,
      );
    }

    const fixtureContextMeta = readApiFootballFixtureContextMeta(fixtureItem);

    const [
      homeFormBody,
      awayFormBody,
      homeNextBody,
      awayNextBody,
      homeStatsBody,
      awayStatsBody,
      h2hBody,
      standingsBody,
      homeSquadBody,
      awaySquadBody,
      injuriesBody,
      lineupsBody,
      fixtureStatsBody,
      homeCoachBody,
      awayCoachBody,
    ] = await Promise.all([
      // last=10 supplies venue-split samples; overall form still caps at 5.
      this.#getJson(
        `/fixtures?team=${encodeURIComponent(fixture.homeTeamId)}&last=10`,
      ),
      this.#getJson(
        `/fixtures?team=${encodeURIComponent(fixture.awayTeamId)}&last=10`,
      ),
      // next=5 supplies days-until-next-match when the provider returns rows.
      this.#getJson(
        `/fixtures?team=${encodeURIComponent(fixture.homeTeamId)}&next=5`,
      ),
      this.#getJson(
        `/fixtures?team=${encodeURIComponent(fixture.awayTeamId)}&next=5`,
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
      this.#getJson(
        `/fixtures/lineups?fixture=${encodeURIComponent(fixture.fixtureId)}`,
      ),
      // Pre-match often empty → honest absence for advanced metrics.
      this.#getJson(
        `/fixtures/statistics?fixture=${encodeURIComponent(fixture.fixtureId)}`,
      ),
      // Optional manager facts for Club Intelligence (honest absence when empty).
      this.#getJson(`/coachs?team=${encodeURIComponent(fixture.homeTeamId)}`),
      this.#getJson(`/coachs?team=${encodeURIComponent(fixture.awayTeamId)}`),
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

    const fixtureAdvanced = mapApiFootballFixtureStatistics(fixtureStatsBody, {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
    });
    const homeStats = withAdvancedStats(
      mappedHomeStats ?? statsFromFormGoals(homeForm),
      fixtureAdvanced?.home,
    );
    const awayStats = withAdvancedStats(
      mappedAwayStats ?? statsFromFormGoals(awayForm),
      fixtureAdvanced?.away,
    );

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

    // Empty lineups → honest absence (never Expected Lineup).
    const lineups = mapApiFootballLineupsResponse(lineupsBody, {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      providerMethod: "http-live",
    });

    // P1A: capped candidate set (squad-listed goalkeeper + attackers) for a
    // second-phase per-player season-stats fetch. Quota-safe by design —
    // never fetch the full squad's individual statistics.
    const homeCandidates = selectPlayerStatsCandidates(homePlayers);
    const awayCandidates = selectPlayerStatsCandidates(awayPlayers);
    const candidates = [...homeCandidates, ...awayCandidates];

    const statsResponses = await Promise.all(
      candidates.map((candidate) =>
        this.#getJson(
          `/players?id=${encodeURIComponent(candidate.playerId)}&season=${String(fixture.season)}`,
        ),
      ),
    );

    const enrichmentByPlayerId = new Map<string, PlayerStatsEnrichmentEntry>();
    candidates.forEach((candidate, index) => {
      const enrichment = mapApiFootballPlayerStatsResponse(statsResponses[index], {
        teamId: candidate.teamId,
        competitionId: fixture.competitionId,
      });

      if (enrichment !== undefined) {
        enrichmentByPlayerId.set(candidate.playerId, enrichment);
      }
    });

    const enrichedPlayers = applyAvailabilityAndSquadStatus(
      mergePlayerSeasonStats([...homePlayers, ...awayPlayers], enrichmentByPlayerId),
      availabilityAbsences,
      lineups,
    );

    // Empty expectedGoals → honest absence (never estimate from shots).
    const expectedGoals = mapApiFootballFixtureExpectedGoals(fixtureStatsBody, {
      homeTeamId: fixture.homeTeamId,
      homeTeamName: fixture.homeTeamName,
      awayTeamId: fixture.awayTeamId,
      awayTeamName: fixture.awayTeamName,
      competitionId: fixture.competitionId,
      competitionName: fixture.competitionName,
      season: fixture.season,
      observedAt: fixture.kickoff,
      providerMethod: "http-live",
    });

    // Match Context from provider schedule samples + fixture competition meta.
    const matchContext = mapApiFootballMatchContext({
      fixture,
      homePastFixturesBody: homeFormBody,
      awayPastFixturesBody: awayFormBody,
      homeNextFixturesBody: homeNextBody,
      awayNextFixturesBody: awayNextBody,
      ...(fixtureContextMeta.competitionTypeLabel === undefined
        ? {}
        : { competitionTypeLabel: fixtureContextMeta.competitionTypeLabel }),
      ...(fixtureContextMeta.roundLabel === undefined
        ? {}
        : { roundLabel: fixtureContextMeta.roundLabel }),
      ...(fixtureContextMeta.aggregateScore === undefined
        ? {}
        : { aggregateScore: fixtureContextMeta.aggregateScore }),
      providerMethod: "http-live",
    });

    const homeCoach = mapApiFootballCoachResponse(homeCoachBody, {
      teamId: fixture.homeTeamId,
      teamSide: "home",
      observedAt: fixture.kickoff,
    });
    const awayCoach = mapApiFootballCoachResponse(awayCoachBody, {
      teamId: fixture.awayTeamId,
      teamSide: "away",
      observedAt: fixture.kickoff,
    });
    const managers = mergeClubManagers(
      homeCoach,
      awayCoach,
      lineupsBody,
      fixture.homeTeamId,
      fixture.awayTeamId,
    );

    const clubIntelligence = mapClubIntelligenceFromStandings(standings, {
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeTeamName: fixture.homeTeamName,
      awayTeamName: fixture.awayTeamName,
      observedAt: fixture.kickoff,
      providerMethod: "http-live",
      managers,
    });

    const bundle: FootballMatchBundle = Object.freeze({
      fixture,
      homeForm,
      awayForm,
      homeStats,
      awayStats,
      headToHead,
      standings,
      players: enrichedPlayers,
      availabilityAbsences,
      lineups,
      expectedGoals,
      matchContext,
      clubIntelligence,
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

function mergeClubManagers(
  homeCoach: FootballClubManagerFact | undefined,
  awayCoach: FootballClubManagerFact | undefined,
  lineupsBody: unknown,
  homeTeamId: string,
  awayTeamId: string,
): readonly FootballClubManagerFact[] {
  const byTeam = new Map<string, FootballClubManagerFact>();

  if (homeCoach !== undefined) {
    byTeam.set(homeCoach.teamId, homeCoach);
  }
  if (awayCoach !== undefined) {
    byTeam.set(awayCoach.teamId, awayCoach);
  }

  if (isRecord(lineupsBody) && Array.isArray(lineupsBody.response)) {
    for (const entry of lineupsBody.response) {
      if (!isRecord(entry)) {
        continue;
      }

      const team = isRecord(entry.team) ? entry.team : undefined;
      const teamIdNum = team?.id;
      const teamId =
        typeof teamIdNum === "number" || typeof teamIdNum === "string"
          ? String(teamIdNum)
          : undefined;
      const coachName = mapCoachNameFromLineupEntry(entry);

      if (teamId === undefined || coachName === undefined) {
        continue;
      }

      const existing = byTeam.get(teamId);
      if (existing !== undefined) {
        continue;
      }

      const teamSide =
        teamId === homeTeamId ? "home" : teamId === awayTeamId ? "away" : undefined;
      if (teamSide === undefined) {
        continue;
      }

      byTeam.set(
        teamId,
        Object.freeze({
          teamId,
          teamSide,
          managerName: coachName,
        }),
      );
    }
  }

  return Object.freeze([...byTeam.values()]);
}
