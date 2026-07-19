import { buildFormAndStatsForMatch } from "../scores/build-team-form-from-scores.js";
import type {
  ScoresProviderMethod,
  ScoresSnapshotSource,
} from "../domain/scores.js";
import type { UpcomingEventStore } from "../domain/upcoming-event-store.js";
import type { MatchLookup } from "./composite-match-provider.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Resolves fixture matches or odds-event shells, overlaying scores-backed
 * TEAM_FORM + goals-proxy STATISTICS when both sides have completed results.
 */
export class EnrichedMatchProvider implements MatchLookup {
  readonly #inner: MatchLookup;
  readonly #events: UpcomingEventStore;
  readonly #scores: ScoresSnapshotSource;
  readonly #scoresMethod: () => ScoresProviderMethod;

  constructor(
    inner: MatchLookup,
    events: UpcomingEventStore,
    scores: ScoresSnapshotSource,
    scoresMethod: () => ScoresProviderMethod,
  ) {
    this.#inner = inner;
    this.#events = events;
    this.#scores = scores;
    this.#scoresMethod = scoresMethod;
  }

  getMatch(matchId: string): unknown {
    const fixtureOrComposite = this.#inner.getMatch(matchId);

    if (fixtureOrComposite !== undefined && isRecord(fixtureOrComposite)) {
      return this.#overlayScores(matchId, fixtureOrComposite);
    }

    const shell = this.#events.get(matchId);

    if (shell === undefined) {
      return undefined;
    }

    const football = buildFormAndStatsForMatch({
      homeTeam: shell.homeTeam,
      awayTeam: shell.awayTeam,
      scorelines: this.#scores.getCompletedScorelines(),
      providerMethod: this.#scoresMethod(),
    });

    if (football === undefined) {
      return undefined;
    }

    return Object.freeze({
      matchId: shell.matchId,
      home: shell.homeTeam,
      away: shell.awayTeam,
      kickoff: shell.kickoff,
      teamForm: football.teamForm,
      statistics: football.statistics,
    });
  }

  #overlayScores(
    matchId: string,
    match: Record<string, unknown>,
  ): Record<string, unknown> {
    const home = typeof match.home === "string" ? match.home : undefined;
    const away = typeof match.away === "string" ? match.away : undefined;

    if (home === undefined || away === undefined) {
      return match;
    }

    const football = buildFormAndStatsForMatch({
      homeTeam: home,
      awayTeam: away,
      scorelines: this.#scores.getCompletedScorelines(),
      providerMethod: this.#scoresMethod(),
    });

    if (football === undefined) {
      return match;
    }

    return Object.freeze({
      ...match,
      matchId,
      teamForm: football.teamForm,
      statistics: football.statistics,
    });
  }
}
