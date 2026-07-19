import { DEFAULT_MATCH_CENTER_SPORT_KEYS } from "../catalog/match-center-sport-keys.js";
import type {
  UpcomingFixture,
  UpcomingFixturesSource,
} from "../domain/upcoming-fixture.js";
import type { OddsHttpFetch } from "./live-the-odds-api-odds-source.js";
import { mapPool } from "./map-pool.js";
import { mapTheOddsApiOddsList } from "../mapper/map-the-odds-api-odds-list.js";

/** Keep live fan-out polite; The Odds API rate-limits burst parallel sport calls. */
const DEFAULT_SPORT_CONCURRENCY = 3;

export interface LiveTheOddsApiUpcomingFixturesSourceOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  /** Prefer multi-sport list; falls back to single `sportKey` or Match Center defaults. */
  readonly sportKeys?: readonly string[];
  /** @deprecated Prefer `sportKeys`. Kept for single-sport callers/tests. */
  readonly sportKey?: string;
  readonly concurrency?: number;
  readonly fetchImpl?: OddsHttpFetch;
}

interface SportListResult {
  readonly rows: readonly UpcomingFixture[];
  readonly failed: boolean;
}

/** Lists upcoming events across one or more sports (one Odds API credit stack per sport). */
export class LiveTheOddsApiUpcomingFixturesSource implements UpcomingFixturesSource {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #sportKeys: readonly string[];
  readonly #concurrency: number;
  readonly #fetchImpl: OddsHttpFetch;

  constructor(options: LiveTheOddsApiUpcomingFixturesSourceOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#sportKeys = resolveSportKeys(options);
    this.#concurrency = options.concurrency ?? DEFAULT_SPORT_CONCURRENCY;
    this.#fetchImpl = options.fetchImpl ?? fetch;
  }

  async listUpcoming(): Promise<readonly UpcomingFixture[]> {
    const settled = await mapPool(this.#sportKeys, this.#concurrency, (sportKey) =>
      this.#listSport(sportKey),
    );

    const rows: UpcomingFixture[] = [];
    let failures = 0;

    for (const result of settled) {
      if (result.failed) {
        failures += 1;
      } else {
        rows.push(...result.rows);
      }
    }

    if (rows.length === 0 && failures === this.#sportKeys.length) {
      throw new Error(
        "The Odds API upcoming fixtures request failed for all configured sports.",
      );
    }

    return Object.freeze(
      [...rows].sort((left, right) => left.kickoff.localeCompare(right.kickoff)),
    );
  }

  async #listSport(sportKey: string): Promise<SportListResult> {
    const url = new URL(`${this.#baseUrl}/v4/sports/${sportKey}/odds`);
    url.searchParams.set("apiKey", this.#apiKey);
    // One region → fewer credits per sport on board refresh.
    url.searchParams.set("regions", "eu");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");

    try {
      const response = await this.#fetchImpl(url.toString(), {
        method: "GET",
        headers: Object.freeze({ Accept: "application/json" }),
      });

      if (!response.ok) {
        return Object.freeze({ rows: Object.freeze([]), failed: true });
      }

      const body: unknown = await response.json();
      return Object.freeze({
        rows: mapTheOddsApiOddsList(body, {
          providerMethod: "http-live",
          defaultSportKey: sportKey,
        }),
        failed: false,
      });
    } catch {
      return Object.freeze({ rows: Object.freeze([]), failed: true });
    }
  }
}

function resolveSportKeys(
  options: LiveTheOddsApiUpcomingFixturesSourceOptions,
): readonly string[] {
  if (options.sportKeys !== undefined && options.sportKeys.length > 0) {
    return Object.freeze([...options.sportKeys]);
  }

  if (typeof options.sportKey === "string" && options.sportKey.trim().length > 0) {
    return Object.freeze([options.sportKey.trim()]);
  }

  return DEFAULT_MATCH_CENTER_SPORT_KEYS;
}
