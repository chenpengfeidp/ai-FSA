import type {
  OddsProviderMethod,
  PreMatch1x2OddsOverlay,
} from "../domain/pre-match-1x2.js";

export interface TheOddsApiOutcome {
  readonly name: string;
  readonly price: number;
}

export interface TheOddsApiMarket {
  readonly key: string;
  readonly last_update?: string;
  readonly outcomes: readonly TheOddsApiOutcome[];
}

export interface TheOddsApiBookmaker {
  readonly key: string;
  readonly title?: string;
  readonly last_update?: string;
  readonly markets: readonly TheOddsApiMarket[];
}

/** Real-shaped The Odds API event payload (subset used for pre-match h2h). */
export interface TheOddsApiEventOdds {
  readonly id: string;
  readonly home_team: string;
  readonly away_team: string;
  readonly commence_time?: string;
  readonly bookmakers: readonly TheOddsApiBookmaker[];
}

export interface MapTheOddsApiH2hOptions {
  readonly providerMethod: OddsProviderMethod;
  readonly preferredBookmakerKey?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteOdds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 1
    ? value
    : undefined;
}

/**
 * Maps a The Odds API–shaped event odds document to a FAS 1X2 overlay.
 * Picks the preferred bookmaker when present; otherwise the first bookmaker with h2h.
 */
export function mapTheOddsApiH2h(
  input: unknown,
  options: MapTheOddsApiH2hOptions,
): PreMatch1x2OddsOverlay | undefined {
  if (!isRecord(input)) {
    return undefined;
  }

  const eventId = typeof input.id === "string" ? input.id.trim() : "";
  const homeTeam = typeof input.home_team === "string" ? input.home_team.trim() : "";
  const awayTeam = typeof input.away_team === "string" ? input.away_team.trim() : "";

  if (eventId.length === 0 || homeTeam.length === 0 || awayTeam.length === 0) {
    return undefined;
  }

  if (!Array.isArray(input.bookmakers) || input.bookmakers.length === 0) {
    return undefined;
  }

  const bookmakers = input.bookmakers.filter(isRecord);
  const preferredKey = options.preferredBookmakerKey;
  const ordered =
    preferredKey === undefined
      ? bookmakers
      : [
          ...bookmakers.filter((bookmaker) => bookmaker.key === preferredKey),
          ...bookmakers.filter((bookmaker) => bookmaker.key !== preferredKey),
        ];

  for (const bookmaker of ordered) {
    const bookmakerKey =
      typeof bookmaker.key === "string" ? bookmaker.key.trim() : "";

    if (bookmakerKey.length === 0 || !Array.isArray(bookmaker.markets)) {
      continue;
    }

    const h2h = bookmaker.markets
      .filter(isRecord)
      .find((market) => market.key === "h2h");

    if (h2h === undefined || !Array.isArray(h2h.outcomes)) {
      continue;
    }

    let homeOdds: number | undefined;
    let drawOdds: number | undefined;
    let awayOdds: number | undefined;

    for (const outcome of h2h.outcomes) {
      if (!isRecord(outcome) || typeof outcome.name !== "string") {
        continue;
      }

      const price = asFiniteOdds(outcome.price);

      if (price === undefined) {
        continue;
      }

      if (outcome.name === homeTeam) {
        homeOdds = price;
      } else if (outcome.name === awayTeam) {
        awayOdds = price;
      } else if (outcome.name === "Draw") {
        drawOdds = price;
      }
    }

    if (homeOdds === undefined || drawOdds === undefined || awayOdds === undefined) {
      continue;
    }

    const observedAtCandidate =
      (typeof h2h.last_update === "string" && h2h.last_update) ||
      (typeof bookmaker.last_update === "string" && bookmaker.last_update) ||
      (typeof input.commence_time === "string" && input.commence_time) ||
      undefined;

    if (
      observedAtCandidate === undefined ||
      Number.isNaN(Date.parse(observedAtCandidate))
    ) {
      continue;
    }

    return Object.freeze({
      homeOdds,
      drawOdds,
      awayOdds,
      observedAt: observedAtCandidate,
      providerSource: "the-odds-api",
      providerSourceId: `${eventId}:${bookmakerKey}:h2h`,
      providerMethod: options.providerMethod,
    });
  }

  return undefined;
}
