import type {
  CompletedScoreline,
  ScoresSnapshotPrimer,
  ScoresSnapshotSource,
} from "../domain/scores.js";
import { mapTheOddsApiScores } from "../mapper/map-the-odds-api-scores.js";
import type { OddsHttpFetch } from "./live-the-odds-api-odds-source.js";

export interface LiveTheOddsApiScoresSourceOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly sportKey?: string;
  readonly daysFrom?: 1 | 2 | 3;
  readonly fetchImpl?: OddsHttpFetch;
}

export class LiveTheOddsApiScoresSource
  implements ScoresSnapshotSource, ScoresSnapshotPrimer
{
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #sportKey: string;
  readonly #daysFrom: 1 | 2 | 3;
  readonly #fetchImpl: OddsHttpFetch;
  #scorelines: readonly CompletedScoreline[] | undefined;
  #primed = false;

  constructor(options: LiveTheOddsApiScoresSourceOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#sportKey = options.sportKey ?? "soccer_epl";
    this.#daysFrom = options.daysFrom ?? 3;
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

    const url = new URL(`${this.#baseUrl}/v4/sports/${this.#sportKey}/scores`);
    url.searchParams.set("apiKey", this.#apiKey);
    url.searchParams.set("daysFrom", String(this.#daysFrom));
    url.searchParams.set("dateFormat", "iso");

    const response = await this.#fetchImpl(url.toString(), {
      method: "GET",
      headers: Object.freeze({ Accept: "application/json" }),
    });

    if (!response.ok) {
      this.#scorelines = Object.freeze([]);
      return;
    }

    const body: unknown = await response.json();
    this.#scorelines = mapTheOddsApiScores(body, "http-live");
  }
}
