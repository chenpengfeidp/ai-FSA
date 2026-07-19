import type { FootballMatchCatalog, FootballMatchLookup } from "../domain/ports.js";
import { toEvidenceMatchShape } from "../mapper/to-evidence-match.js";

/** MatchLookup over FAS FootballMatchBundle catalog (Evidence-ready shape). */
export class FootballMatchProvider implements FootballMatchLookup {
  readonly #catalog: FootballMatchCatalog;

  constructor(catalog: FootballMatchCatalog) {
    this.#catalog = catalog;
  }

  getMatch(matchId: string): unknown {
    const bundle = this.#catalog.getMatchBundle(matchId);

    if (bundle === undefined) {
      return undefined;
    }

    return toEvidenceMatchShape(bundle);
  }
}

/** Prefer football catalog, then fall back to another MatchLookup. */
export class CompositeFootballFirstLookup implements FootballMatchLookup {
  readonly #football: FootballMatchLookup;
  readonly #fallback: FootballMatchLookup;

  constructor(football: FootballMatchLookup, fallback: FootballMatchLookup) {
    this.#football = football;
    this.#fallback = fallback;
  }

  getMatch(matchId: string): unknown {
    return this.#football.getMatch(matchId) ?? this.#fallback.getMatch(matchId);
  }
}
