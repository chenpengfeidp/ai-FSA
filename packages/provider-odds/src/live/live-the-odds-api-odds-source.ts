import { findDemoOddsCatalogEntry } from "../catalog/demo-odds-catalog.js";
import type {
  OddsSnapshotPrimer,
  OddsSnapshotSource,
  PreMatchOddsOverlay,
} from "../domain/pre-match-odds.js";
import { mapTheOddsApiH2h } from "../mapper/map-the-odds-api-h2h.js";

export type OddsHttpFetch = (input: string, init?: RequestInit) => Promise<Response>;

export interface LiveTheOddsApiOddsSourceOptions {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly fetchImpl?: OddsHttpFetch;
  readonly preferredBookmakerKey?: string;
}

export class LiveTheOddsApiOddsSource
  implements OddsSnapshotSource, OddsSnapshotPrimer
{
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetchImpl: OddsHttpFetch;
  readonly #preferredBookmakerKey: string | undefined;
  readonly #cache = new Map<string, PreMatchOddsOverlay | undefined>();

  constructor(options: LiveTheOddsApiOddsSourceOptions) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.#fetchImpl = options.fetchImpl ?? fetch;
    this.#preferredBookmakerKey = options.preferredBookmakerKey;
  }

  getPreMatch1x2(matchId: string): PreMatchOddsOverlay | undefined {
    return this.#cache.get(matchId);
  }

  async ensurePreMatch1x2(matchId: string): Promise<void> {
    if (this.#cache.has(matchId)) {
      return;
    }

    const entry = findDemoOddsCatalogEntry(matchId);

    if (entry === undefined) {
      this.#cache.set(matchId, undefined);
      return;
    }

    const url = new URL(
      `${this.#baseUrl}/v4/sports/${entry.sportKey}/events/${entry.eventId}/odds`,
    );
    url.searchParams.set("apiKey", this.#apiKey);
    url.searchParams.set("regions", "uk");
    url.searchParams.set("markets", "h2h,spreads");
    url.searchParams.set("oddsFormat", "decimal");

    const response = await this.#fetchImpl(url.toString(), {
      method: "GET",
      headers: Object.freeze({ Accept: "application/json" }),
    });

    if (!response.ok) {
      this.#cache.set(matchId, undefined);
      return;
    }

    const body: unknown = await response.json();
    const overlay = mapTheOddsApiH2h(body, {
      providerMethod: "http-live",
      preferredBookmakerKey: this.#preferredBookmakerKey ?? "pinnacle",
    });

    this.#cache.set(matchId, overlay);
  }
}
