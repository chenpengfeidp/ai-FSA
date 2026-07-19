import type { LiveApiSportsMatchCatalog } from "../live/live-api-sports-match-catalog.js";
import { toEvidenceMatchShape } from "../mapper/to-evidence-match.js";
import type { FootballMatchLookup } from "../domain/ports.js";

/**
 * Live match lookup that may await enrichment. API wiring adapts this
 * behind a sync MatchLookup by priming on upcoming list / analyze path.
 */
export class AsyncFootballMatchProvider {
  readonly #catalog: LiveApiSportsMatchCatalog;

  constructor(catalog: LiveApiSportsMatchCatalog) {
    this.#catalog = catalog;
  }

  getMatch(matchId: string): unknown {
    const cached = this.#catalog.getMatchBundle(matchId);

    if (cached === undefined) {
      return undefined;
    }

    return toEvidenceMatchShape(cached);
  }

  async ensureMatch(matchId: string): Promise<unknown> {
    const bundle = await this.#catalog.ensureMatchBundle(matchId);

    if (bundle === undefined) {
      return undefined;
    }

    return toEvidenceMatchShape(bundle);
  }
}

/** Sync façade over a live catalog that was primed (or recorded-only). */
export class PrimedFootballMatchProvider implements FootballMatchLookup {
  readonly #inner: AsyncFootballMatchProvider;

  constructor(inner: AsyncFootballMatchProvider) {
    this.#inner = inner;
  }

  getMatch(matchId: string): unknown {
    return this.#inner.getMatch(matchId);
  }
}
