import type {
  UpcomingFixture,
  UpcomingFixturesSource,
} from "../domain/upcoming-fixture.js";
import type { OddsHttpFetch } from "./live-the-odds-api-odds-source.js";
import { mapTheOddsApiOddsList } from "../mapper/map-the-odds-api-odds-list.js";

export interface LiveTheOddsApiUpcomingFixturesSourceOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly sportKey?: string;
  readonly fetchImpl?: OddsHttpFetch;
}

/** Lists upcoming events for one sport (one Odds API credit per call). */
export class LiveTheOddsApiUpcomingFixturesSource implements UpcomingFixturesSource {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #sportKey: string;
  readonly #fetchImpl: OddsHttpFetch;

  constructor(options: LiveTheOddsApiUpcomingFixturesSourceOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#sportKey = options.sportKey ?? "soccer_epl";
    this.#fetchImpl = options.fetchImpl ?? fetch;
  }

  async listUpcoming(): Promise<readonly UpcomingFixture[]> {
    const url = new URL(`${this.#baseUrl}/v4/sports/${this.#sportKey}/odds`);
    url.searchParams.set("apiKey", this.#apiKey);
    url.searchParams.set("regions", "eu,uk");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");

    const response = await this.#fetchImpl(url.toString(), {
      method: "GET",
      headers: Object.freeze({ Accept: "application/json" }),
    });

    if (!response.ok) {
      throw new Error(
        `The Odds API upcoming fixtures request failed with status ${String(response.status)}.`,
      );
    }

    const body: unknown = await response.json();
    return mapTheOddsApiOddsList(body, {
      providerMethod: "http-live",
      defaultSportKey: this.#sportKey,
    });
  }
}
