import { DEFAULT_MATCH_CENTER_SPORT_KEYS } from "../catalog/match-center-sport-keys.js";
import type {
  CompletedScoreline,
  ScoresSnapshotPrimer,
  ScoresSnapshotSource,
} from "../domain/scores.js";
import { mapTheOddsApiScores } from "../mapper/map-the-odds-api-scores.js";
import type { OddsHttpFetch } from "./live-the-odds-api-odds-source.js";
import { mapPool } from "./map-pool.js";

const DEFAULT_SPORT_CONCURRENCY = 3;

export interface LiveTheOddsApiScoresSourceOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  /** Prefer multi-sport list; falls back to single `sportKey` or Match Center defaults. */
  readonly sportKeys?: readonly string[];
  /** @deprecated Prefer `sportKeys`. Kept for single-sport callers/tests. */
  readonly sportKey?: string;
  readonly daysFrom?: 1 | 2 | 3;
  readonly concurrency?: number;
  readonly fetchImpl?: OddsHttpFetch;
}

export class LiveTheOddsApiScoresSource
  implements ScoresSnapshotSource, ScoresSnapshotPrimer
{
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #sportKeys: readonly string[];
  readonly #daysFrom: 1 | 2 | 3;
  readonly #concurrency: number;
  readonly #fetchImpl: OddsHttpFetch;
  #scorelines: readonly CompletedScoreline[] | undefined;
  #primed = false;

  constructor(options: LiveTheOddsApiScoresSourceOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#sportKeys = resolveSportKeys(options);
    this.#daysFrom = options.daysFrom ?? 3;
    this.#concurrency = options.concurrency ?? DEFAULT_SPORT_CONCURRENCY;
    this.#fetchImpl = options.fetchImpl ?? fetch;
  }

  getCompletedScorelines(): readonly CompletedScoreline[] {
    return this.#scorelines ?? Object.freeze([]);
  }

  providerMethod(): "http-live" {
    return "http-live";
  }

  async ensureScores(): Promise<void> {
    if (this.#primed) {
      return;
    }

    this.#primed = true;

    const batches = await mapPool(this.#sportKeys, this.#concurrency, (sportKey) =>
      this.#fetchSport(sportKey),
    );

    const byEventId = new Map<string, CompletedScoreline>();

    for (const rows of batches) {
      for (const row of rows) {
        byEventId.set(row.eventId, row);
      }
    }

    this.#scorelines = Object.freeze(
      [...byEventId.values()].sort((left, right) =>
        right.commenceTime.localeCompare(left.commenceTime),
      ),
    );
  }

  async #fetchSport(sportKey: string): Promise<readonly CompletedScoreline[]> {
    const url = new URL(`${this.#baseUrl}/v4/sports/${sportKey}/scores`);
    url.searchParams.set("apiKey", this.#apiKey);
    url.searchParams.set("daysFrom", String(this.#daysFrom));
    url.searchParams.set("dateFormat", "iso");

    try {
      const response = await this.#fetchImpl(url.toString(), {
        method: "GET",
        headers: Object.freeze({ Accept: "application/json" }),
      });

      if (!response.ok) {
        return Object.freeze([]);
      }

      const body: unknown = await response.json();
      return mapTheOddsApiScores(body, "http-live");
    } catch {
      return Object.freeze([]);
    }
  }
}

function resolveSportKeys(
  options: LiveTheOddsApiScoresSourceOptions,
): readonly string[] {
  if (options.sportKeys !== undefined && options.sportKeys.length > 0) {
    return Object.freeze([...options.sportKeys]);
  }

  if (typeof options.sportKey === "string" && options.sportKey.trim().length > 0) {
    return Object.freeze([options.sportKey.trim()]);
  }

  return DEFAULT_MATCH_CENTER_SPORT_KEYS;
}
