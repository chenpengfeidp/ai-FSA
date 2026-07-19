import type {
  OddsProviderMethod,
  PreMatchOddsOverlay,
} from "../domain/pre-match-odds.js";

/**
 * Maps vendor JSON via `unknown` + structural checks.
 * The Odds API event shape is intentionally not a public FAS contract.
 */

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

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

interface AsianHandicapSlice {
  readonly asianHandicapLine: number;
  readonly asianHandicapHomeOdds: number;
  readonly asianHandicapAwayOdds: number;
  readonly lastUpdate?: string;
}

function parseSpreadsMarket(
  market: Record<string, unknown>,
  homeTeam: string,
  awayTeam: string,
): AsianHandicapSlice | undefined {
  if (!Array.isArray(market.outcomes)) {
    return undefined;
  }

  let homeOdds: number | undefined;
  let awayOdds: number | undefined;
  let homeLine: number | undefined;

  for (const outcome of market.outcomes) {
    if (!isRecord(outcome) || typeof outcome.name !== "string") {
      continue;
    }

    const price = asFiniteOdds(outcome.price);
    const point = asFiniteNumber(outcome.point);

    if (price === undefined || point === undefined) {
      continue;
    }

    if (outcome.name === homeTeam) {
      homeOdds = price;
      homeLine = point;
    } else if (outcome.name === awayTeam) {
      awayOdds = price;
    }
  }

  if (homeOdds === undefined || awayOdds === undefined || homeLine === undefined) {
    return undefined;
  }

  const lastUpdate =
    typeof market.last_update === "string" ? market.last_update : undefined;

  return Object.freeze({
    asianHandicapLine: homeLine,
    asianHandicapHomeOdds: homeOdds,
    asianHandicapAwayOdds: awayOdds,
    ...(lastUpdate === undefined ? {} : { lastUpdate }),
  });
}

/**
 * Maps a The Odds API–shaped event odds document to a FAS pre-match overlay.
 * Prefers a bookmaker with h2h; attaches spreads AH when present on that bookmaker.
 */
export function mapTheOddsApiH2h(
  input: unknown,
  options: MapTheOddsApiH2hOptions,
): PreMatchOddsOverlay | undefined {
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

    const markets = bookmaker.markets.filter(isRecord);
    const h2h = markets.find((market) => market.key === "h2h");

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

    const spreads = markets.find((market) => market.key === "spreads");
    const asian =
      spreads === undefined
        ? undefined
        : parseSpreadsMarket(spreads, homeTeam, awayTeam);

    const observedAtCandidate =
      (typeof h2h.last_update === "string" && h2h.last_update) ||
      asian?.lastUpdate ||
      (typeof bookmaker.last_update === "string" && bookmaker.last_update) ||
      (typeof input.commence_time === "string" && input.commence_time) ||
      undefined;

    if (
      observedAtCandidate === undefined ||
      Number.isNaN(Date.parse(observedAtCandidate))
    ) {
      continue;
    }

    const marketSuffix = asian === undefined ? "h2h" : "h2h+spreads";

    return Object.freeze({
      homeOdds,
      drawOdds,
      awayOdds,
      observedAt: observedAtCandidate,
      providerSource: "the-odds-api",
      providerSourceId: `${eventId}:${bookmakerKey}:${marketSuffix}`,
      providerMethod: options.providerMethod,
      ...(asian === undefined
        ? {}
        : {
            asianHandicapLine: asian.asianHandicapLine,
            asianHandicapHomeOdds: asian.asianHandicapHomeOdds,
            asianHandicapAwayOdds: asian.asianHandicapAwayOdds,
          }),
    });
  }

  return undefined;
}
