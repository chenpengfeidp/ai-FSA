import {
  createEvidence,
  type Evidence,
  EvidenceValidationError,
} from "@fas/evidence";
import { createMatchId, MatchValidationError } from "@fas/match";
import type {
  EvidenceNormalizationError,
  EvidenceNormalizationResult,
  FixtureEvidenceContext,
  Result,
} from "./fixture-evidence-normalizer.js";
import { normalizeFixtureEvidence } from "./fixture-evidence-normalizer.js";

export type EvidenceSetNormalizationResult = Result<
  readonly Evidence[],
  EvidenceNormalizationError
>;

function success<Value>(value: Value): Readonly<{ ok: true; value: Value }> {
  return Object.freeze({ ok: true, value });
}

function failure(
  code: EvidenceNormalizationError["code"],
  message: string,
  field?: string,
): Readonly<{ error: EvidenceNormalizationError; ok: false }> {
  const error =
    field === undefined
      ? Object.freeze({ code, message })
      : Object.freeze({ code, field, message });

  return Object.freeze({ error, ok: false });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTeamSide(value: unknown): "away" | "home" | undefined {
  if (value === "home" || value === "away") {
    return value;
  }

  return undefined;
}

function requireNonNegativeNumber(
  value: unknown,
  field: string,
): Result<number, EvidenceNormalizationError> {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return failure("INVALID_FIELD", `${field} must be a finite number ≥ 0.`, field);
  }

  return success(value);
}

function requireResultCodes(
  value: unknown,
  window: number,
  field: string,
): Result<readonly ("D" | "L" | "W")[], EvidenceNormalizationError> {
  if (!Array.isArray(value) || value.length !== window) {
    return failure(
      "INVALID_FIELD",
      `${field} must be an array of length ${window}.`,
      field,
    );
  }

  const results: ("D" | "L" | "W")[] = [];

  for (const entry of value) {
    if (entry !== "W" && entry !== "D" && entry !== "L") {
      return failure("INVALID_FIELD", `${field} entries must be W, D, or L.`, field);
    }

    results.push(entry);
  }

  return success(Object.freeze(results));
}

function requireNonNegativeIntArray(
  value: unknown,
  window: number,
  field: string,
): Result<readonly number[], EvidenceNormalizationError> {
  if (!Array.isArray(value) || value.length !== window) {
    return failure(
      "INVALID_FIELD",
      `${field} must be an array of length ${window}.`,
      field,
    );
  }

  const numbers: number[] = [];

  for (const entry of value) {
    if (
      typeof entry !== "number" ||
      !Number.isInteger(entry) ||
      entry < 0 ||
      !Number.isFinite(entry)
    ) {
      return failure(
        "INVALID_FIELD",
        `${field} entries must be non-negative integers.`,
        field,
      );
    }

    numbers.push(entry);
  }

  return success(Object.freeze(numbers));
}

function parseTeamForm(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): EvidenceNormalizationResult {
  if (!isRecord(value)) {
    return failure("INVALID_FIELD", "teamForm entry must be an object.", "teamForm");
  }

  const teamSide = requireTeamSide(value.teamSide);

  if (teamSide === undefined) {
    return failure("INVALID_FIELD", "teamSide must be home or away.", "teamSide");
  }

  if (
    typeof value.window !== "number" ||
    !Number.isInteger(value.window) ||
    value.window < 1 ||
    value.window > 10
  ) {
    return failure(
      "INVALID_FIELD",
      "window must be an integer between 1 and 10.",
      "window",
    );
  }

  const results = requireResultCodes(value.results, value.window, "results");

  if (!results.ok) {
    return results;
  }

  const goalsFor = requireNonNegativeIntArray(
    value.goalsFor,
    value.window,
    "goalsFor",
  );

  if (!goalsFor.ok) {
    return goalsFor;
  }

  const goalsAgainst = requireNonNegativeIntArray(
    value.goalsAgainst,
    value.window,
    "goalsAgainst",
  );

  if (!goalsAgainst.ok) {
    return goalsAgainst;
  }

  const provenanceOverlay = parseProviderProvenanceOverlay(value);

  if (!provenanceOverlay.ok) {
    return provenanceOverlay;
  }

  const provenance = provenanceOverlay.value;
  const source = provenance?.source ?? "fixture";
  const sourceId = provenance?.sourceId ?? `fixture-${matchId}-form-${teamSide}`;
  const method = provenance?.method ?? "fixture";
  const homeSplit = parseOptionalFormSplit(value.homeSplit, "homeSplit");

  if (homeSplit !== undefined && !homeSplit.ok) {
    return homeSplit;
  }

  const awaySplit = parseOptionalFormSplit(value.awaySplit, "awaySplit");

  if (awaySplit !== undefined && !awaySplit.ok) {
    return awaySplit;
  }

  const recentShort = parseOptionalFormSplit(value.recentShort, "recentShort");

  if (recentShort !== undefined && !recentShort.ok) {
    return recentShort;
  }

  const goalsScoredPerMatch = parseOptionalRate(
    value.goalsScoredPerMatch,
    "goalsScoredPerMatch",
  );

  if (goalsScoredPerMatch !== undefined && !goalsScoredPerMatch.ok) {
    return goalsScoredPerMatch;
  }

  const goalsConcededPerMatch = parseOptionalRate(
    value.goalsConcededPerMatch,
    "goalsConcededPerMatch",
  );

  if (goalsConcededPerMatch !== undefined && !goalsConcededPerMatch.ok) {
    return goalsConcededPerMatch;
  }

  try {
    return success(
      createEvidence({
        id: `evidence-${source}-${matchId}-form-${teamSide}`,
        source,
        sourceId,
        type: "TEAM_FORM",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        freshness: "fresh",
        quality: "unverified",
        confidence: source === "api-football" ? "medium" : "unknown",
        timestamp: collectedAt,
        provenance: {
          collector: "@fas/evidence-normalizer",
          method,
        },
        payload: {
          teamSide,
          window: value.window,
          results: results.value,
          goalsFor: goalsFor.value,
          goalsAgainst: goalsAgainst.value,
          ...(homeSplit === undefined || !homeSplit.ok
            ? {}
            : { homeSplit: homeSplit.value }),
          ...(awaySplit === undefined || !awaySplit.ok
            ? {}
            : { awaySplit: awaySplit.value }),
          ...(recentShort === undefined || !recentShort.ok
            ? {}
            : { recentShort: recentShort.value }),
          ...(goalsScoredPerMatch === undefined || !goalsScoredPerMatch.ok
            ? {}
            : { goalsScoredPerMatch: goalsScoredPerMatch.value }),
          ...(goalsConcededPerMatch === undefined || !goalsConcededPerMatch.ok
            ? {}
            : { goalsConcededPerMatch: goalsConcededPerMatch.value }),
        },
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "TEAM_FORM evidence normalization failed unexpectedly.",
    );
  }
}

type AdvancedStatisticsPayload = Readonly<{
  scope: "fixture" | "season-average";
  shotsTotal?: number;
  shotsOnTarget?: number;
  shotsOffTarget?: number;
  possessionPct?: number;
  corners?: number;
  yellowCards?: number;
  redCards?: number;
  attacks?: number;
  dangerousAttacks?: number;
  fouls?: number;
  saves?: number;
  passingAccuracyPct?: number;
}>;

function parseOptionalNonNegativeNumber(
  value: unknown,
  field: string,
): Result<number | undefined, EvidenceNormalizationError> {
  if (value === undefined) {
    return success(undefined);
  }

  return requireNonNegativeNumber(value, field);
}

/**
 * F1.2a: optional advanced STATISTICS measurements.
 * Absent object → honest absence. Present object must declare scope.
 * Never invent metrics; only copy provider-supplied non-negative numbers.
 */
function parseOptionalAdvancedStatistics(
  value: unknown,
): Result<AdvancedStatisticsPayload | undefined, EvidenceNormalizationError> {
  if (value === undefined) {
    return success(undefined);
  }

  if (!isRecord(value)) {
    return failure(
      "INVALID_FIELD",
      "advanced statistics must be an object when present.",
      "advanced",
    );
  }

  if (value.scope !== "fixture" && value.scope !== "season-average") {
    return failure(
      "INVALID_FIELD",
      'advanced.scope must be "fixture" or "season-average".',
      "advanced.scope",
    );
  }

  const metricFields = [
    "shotsTotal",
    "shotsOnTarget",
    "shotsOffTarget",
    "possessionPct",
    "corners",
    "yellowCards",
    "redCards",
    "attacks",
    "dangerousAttacks",
    "fouls",
    "saves",
    "passingAccuracyPct",
  ] as const;

  const metrics: {
    -readonly [K in (typeof metricFields)[number]]?: number;
  } = {};

  for (const field of metricFields) {
    const parsed = parseOptionalNonNegativeNumber(value[field], `advanced.${field}`);

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.value !== undefined) {
      metrics[field] = parsed.value;
    }
  }

  if (Object.keys(metrics).length === 0) {
    return success(undefined);
  }

  return success(
    Object.freeze({
      scope: value.scope,
      ...metrics,
    }),
  );
}

function parseStatistics(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): EvidenceNormalizationResult {
  if (!isRecord(value)) {
    return failure(
      "INVALID_FIELD",
      "statistics entry must be an object.",
      "statistics",
    );
  }

  const teamSide = requireTeamSide(value.teamSide);

  if (teamSide === undefined) {
    return failure("INVALID_FIELD", "teamSide must be home or away.", "teamSide");
  }

  if (
    typeof value.windowMatches !== "number" ||
    !Number.isInteger(value.windowMatches) ||
    value.windowMatches < 1 ||
    value.windowMatches > 10
  ) {
    return failure(
      "INVALID_FIELD",
      "windowMatches must be an integer between 1 and 10.",
      "windowMatches",
    );
  }

  const fields = [
    "shotsForPerMatch",
    "shotsAgainstPerMatch",
    "xgForPerMatch",
    "xgAgainstPerMatch",
  ] as const;
  const numbers: Record<(typeof fields)[number], number> = {
    shotsForPerMatch: 0,
    shotsAgainstPerMatch: 0,
    xgForPerMatch: 0,
    xgAgainstPerMatch: 0,
  };

  for (const field of fields) {
    const parsed = requireNonNegativeNumber(value[field], field);

    if (!parsed.ok) {
      return parsed;
    }

    numbers[field] = parsed.value;
  }

  const advanced = parseOptionalAdvancedStatistics(value.advanced);

  if (!advanced.ok) {
    return advanced;
  }

  const provenanceOverlay = parseProviderProvenanceOverlay(value);

  if (!provenanceOverlay.ok) {
    return provenanceOverlay;
  }

  const provenance = provenanceOverlay.value;
  const source = provenance?.source ?? "fixture";
  const sourceId = provenance?.sourceId ?? `fixture-${matchId}-stats-${teamSide}`;
  const method = provenance?.method ?? "fixture";
  const statsIdSuffix =
    method === "scores-goals-proxy"
      ? `stats-goals-proxy-${teamSide}`
      : `stats-${teamSide}`;

  try {
    return success(
      createEvidence({
        id: `evidence-${source}-${matchId}-${statsIdSuffix}`,
        source,
        sourceId,
        type: "STATISTICS",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        freshness: "fresh",
        quality: "unverified",
        confidence: source === "api-football" ? "medium" : "unknown",
        timestamp: collectedAt,
        provenance: {
          collector: "@fas/evidence-normalizer",
          method,
        },
        payload: {
          teamSide,
          windowMatches: value.windowMatches,
          ...numbers,
          ...(advanced.value === undefined ? {} : { advanced: advanced.value }),
        },
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "STATISTICS evidence normalization failed unexpectedly.",
    );
  }
}

function parseHeadToHead(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): EvidenceNormalizationResult {
  if (!isRecord(value)) {
    return failure("INVALID_FIELD", "headToHead must be an object.", "headToHead");
  }

  if (
    typeof value.sampleSize !== "number" ||
    !Number.isInteger(value.sampleSize) ||
    value.sampleSize < 1 ||
    value.sampleSize > 20
  ) {
    return failure(
      "INVALID_FIELD",
      "sampleSize must be an integer between 1 and 20.",
      "sampleSize",
    );
  }

  if (!Array.isArray(value.meetings) || value.meetings.length !== value.sampleSize) {
    return failure(
      "INVALID_FIELD",
      "meetings must be an array of length sampleSize.",
      "meetings",
    );
  }

  const meetings: Array<{
    playedAt: string;
    homeGoals: number;
    awayGoals: number;
  }> = [];

  for (const entry of value.meetings) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        "meetings entries must be objects.",
        "meetings",
      );
    }

    if (
      typeof entry.playedAt !== "string" ||
      entry.playedAt.trim().length === 0 ||
      Number.isNaN(Date.parse(entry.playedAt))
    ) {
      return failure(
        "INVALID_FIELD",
        "playedAt must be a valid ISO 8601 timestamp.",
        "playedAt",
      );
    }

    if (
      typeof entry.homeGoals !== "number" ||
      !Number.isInteger(entry.homeGoals) ||
      entry.homeGoals < 0 ||
      typeof entry.awayGoals !== "number" ||
      !Number.isInteger(entry.awayGoals) ||
      entry.awayGoals < 0
    ) {
      return failure(
        "INVALID_FIELD",
        "homeGoals and awayGoals must be non-negative integers.",
        "meetings",
      );
    }

    meetings.push({
      playedAt: entry.playedAt,
      homeGoals: entry.homeGoals,
      awayGoals: entry.awayGoals,
    });
  }

  const provenanceOverlay = parseProviderProvenanceOverlay(value);

  if (!provenanceOverlay.ok) {
    return provenanceOverlay;
  }

  const provenance = provenanceOverlay.value;
  const source = provenance?.source ?? "fixture";
  const sourceId = provenance?.sourceId ?? `fixture-${matchId}-h2h`;
  const method = provenance?.method ?? "fixture";

  try {
    return success(
      createEvidence({
        id: `evidence-${source}-${matchId}-h2h`,
        source,
        sourceId,
        type: "HEAD_TO_HEAD",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        timestamp: collectedAt,
        freshness: "fresh",
        confidence: source === "api-football" ? "medium" : "unknown",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method,
        },
        payload: {
          sampleSize: value.sampleSize,
          meetings: Object.freeze(meetings.map((meeting) => Object.freeze(meeting))),
        },
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "HEAD_TO_HEAD evidence normalization failed unexpectedly.",
    );
  }
}

function requireDecimalOdds(
  value: unknown,
  field: string,
): Result<number, EvidenceNormalizationError> {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 1) {
    return failure(
      "INVALID_FIELD",
      `${field} must be a finite decimal odds value > 1.`,
      field,
    );
  }

  return success(value);
}

interface OddsProvenanceOverlay {
  readonly source: string;
  readonly sourceId: string;
  readonly method: string;
}

interface AsianHandicapFields {
  readonly asianHandicapLine: number;
  readonly asianHandicapHomeOdds: number;
  readonly asianHandicapAwayOdds: number;
}

function parseAsianHandicapFields(
  value: Record<string, unknown>,
): Result<AsianHandicapFields | undefined, EvidenceNormalizationError> {
  const hasLine = "asianHandicapLine" in value;
  const hasHome = "asianHandicapHomeOdds" in value;
  const hasAway = "asianHandicapAwayOdds" in value;

  if (!hasLine && !hasHome && !hasAway) {
    return success(undefined);
  }

  if (!hasLine || !hasHome || !hasAway) {
    return failure(
      "INVALID_FIELD",
      "asianHandicapLine, asianHandicapHomeOdds, and asianHandicapAwayOdds must be provided together.",
      "asianHandicapLine",
    );
  }

  if (
    typeof value.asianHandicapLine !== "number" ||
    !Number.isFinite(value.asianHandicapLine)
  ) {
    return failure(
      "INVALID_FIELD",
      "asianHandicapLine must be a finite number.",
      "asianHandicapLine",
    );
  }

  const homeOdds = requireDecimalOdds(
    value.asianHandicapHomeOdds,
    "asianHandicapHomeOdds",
  );

  if (!homeOdds.ok) {
    return homeOdds;
  }

  const awayOdds = requireDecimalOdds(
    value.asianHandicapAwayOdds,
    "asianHandicapAwayOdds",
  );

  if (!awayOdds.ok) {
    return awayOdds;
  }

  return success(
    Object.freeze({
      asianHandicapLine: value.asianHandicapLine,
      asianHandicapHomeOdds: homeOdds.value,
      asianHandicapAwayOdds: awayOdds.value,
    }),
  );
}

interface OverUnderFields {
  readonly overUnderLine: number;
  readonly overOdds: number;
  readonly underOdds: number;
}

function parseOverUnderFields(
  value: Record<string, unknown>,
): Result<OverUnderFields | undefined, EvidenceNormalizationError> {
  const hasLine = "overUnderLine" in value;
  const hasOver = "overOdds" in value;
  const hasUnder = "underOdds" in value;

  if (!hasLine && !hasOver && !hasUnder) {
    return success(undefined);
  }

  if (!hasLine || !hasOver || !hasUnder) {
    return failure(
      "INVALID_FIELD",
      "overUnderLine, overOdds, and underOdds must be provided together.",
      "overUnderLine",
    );
  }

  if (
    typeof value.overUnderLine !== "number" ||
    !Number.isFinite(value.overUnderLine)
  ) {
    return failure(
      "INVALID_FIELD",
      "overUnderLine must be a finite number.",
      "overUnderLine",
    );
  }

  const overOdds = requireDecimalOdds(value.overOdds, "overOdds");

  if (!overOdds.ok) {
    return overOdds;
  }

  const underOdds = requireDecimalOdds(value.underOdds, "underOdds");

  if (!underOdds.ok) {
    return underOdds;
  }

  return success(
    Object.freeze({
      overUnderLine: value.overUnderLine,
      overOdds: overOdds.value,
      underOdds: underOdds.value,
    }),
  );
}

function parseOptionalDecimalOddsField(
  value: Record<string, unknown>,
  field: string,
): Result<number | undefined, EvidenceNormalizationError> {
  if (!(field in value) || value[field] === undefined) {
    return success(undefined);
  }

  const parsed = requireDecimalOdds(value[field], field);

  if (!parsed.ok) {
    return parsed;
  }

  return success(parsed.value);
}

function parseOptionalFiniteNumberField(
  value: Record<string, unknown>,
  field: string,
): Result<number | undefined, EvidenceNormalizationError> {
  if (!(field in value) || value[field] === undefined) {
    return success(undefined);
  }

  if (typeof value[field] !== "number" || !Number.isFinite(value[field])) {
    return failure("INVALID_FIELD", `${field} must be a finite number.`, field);
  }

  return success(value[field]);
}

function parseOptionalNonEmptyStringField(
  value: Record<string, unknown>,
  field: string,
): Result<string | undefined, EvidenceNormalizationError> {
  if (!(field in value) || value[field] === undefined) {
    return success(undefined);
  }

  if (typeof value[field] !== "string" || value[field].trim().length === 0) {
    return failure("INVALID_FIELD", `${field} must be a non-empty string.`, field);
  }

  return success(value[field].trim());
}

function parseOptionalSharpMoneyIndicator(
  value: Record<string, unknown>,
): Result<boolean | string | undefined, EvidenceNormalizationError> {
  if (!("sharpMoneyIndicator" in value) || value.sharpMoneyIndicator === undefined) {
    return success(undefined);
  }

  if (typeof value.sharpMoneyIndicator === "boolean") {
    return success(value.sharpMoneyIndicator);
  }

  if (
    typeof value.sharpMoneyIndicator === "string" &&
    value.sharpMoneyIndicator.trim().length > 0
  ) {
    return success(value.sharpMoneyIndicator.trim());
  }

  return failure(
    "INVALID_FIELD",
    "sharpMoneyIndicator must be a boolean or non-empty string.",
    "sharpMoneyIndicator",
  );
}

const MARKET_TYPES = Object.freeze([
  "asian_handicap",
  "european_1x2",
  "over_under",
] as const);

const MARKET_SELECTIONS = Object.freeze([
  "asian_away",
  "asian_home",
  "away",
  "draw",
  "home",
  "over",
  "under",
] as const);

type MarketTypeValue = (typeof MARKET_TYPES)[number];
type MarketSelectionValue = (typeof MARKET_SELECTIONS)[number];

interface MarketEvidencePayloadRecord {
  readonly marketType: MarketTypeValue;
  readonly selection: MarketSelectionValue;
  readonly line?: number;
  readonly openingValue?: number;
  readonly currentValue?: number;
  readonly closingValue?: number;
  readonly movement?: number;
  readonly lineMovement?: number;
  readonly observedAt: string;
  readonly marketSource?: string;
}

function isMarketType(value: unknown): value is MarketTypeValue {
  return (
    typeof value === "string" && (MARKET_TYPES as readonly string[]).includes(value)
  );
}

function isMarketSelection(value: unknown): value is MarketSelectionValue {
  return (
    typeof value === "string" &&
    (MARKET_SELECTIONS as readonly string[]).includes(value)
  );
}

function parseMarketEvidenceRecords(
  value: Record<string, unknown>,
): Result<
  readonly MarketEvidencePayloadRecord[] | undefined,
  EvidenceNormalizationError
> {
  if (!("markets" in value) || value.markets === undefined) {
    return success(undefined);
  }

  if (!Array.isArray(value.markets)) {
    return failure("INVALID_FIELD", "markets must be an array.", "markets");
  }

  if (value.markets.length === 0) {
    return success(undefined);
  }

  const records: MarketEvidencePayloadRecord[] = [];

  for (const [index, entry] of value.markets.entries()) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        `markets[${String(index)}] must be an object.`,
        "markets",
      );
    }

    if (!isMarketType(entry.marketType)) {
      return failure(
        "INVALID_FIELD",
        `markets[${String(index)}].marketType is invalid.`,
        "markets",
      );
    }

    if (!isMarketSelection(entry.selection)) {
      return failure(
        "INVALID_FIELD",
        `markets[${String(index)}].selection is invalid.`,
        "markets",
      );
    }

    if (
      typeof entry.observedAt !== "string" ||
      entry.observedAt.trim().length === 0 ||
      Number.isNaN(Date.parse(entry.observedAt))
    ) {
      return failure(
        "INVALID_FIELD",
        `markets[${String(index)}].observedAt must be a valid ISO 8601 timestamp.`,
        "markets",
      );
    }

    const line = parseOptionalFiniteNumberField(entry, "line");

    if (!line.ok) {
      return line;
    }

    const openingValue = parseOptionalFiniteNumberField(entry, "openingValue");

    if (!openingValue.ok) {
      return openingValue;
    }

    const currentValue = parseOptionalFiniteNumberField(entry, "currentValue");

    if (!currentValue.ok) {
      return currentValue;
    }

    const closingValue = parseOptionalFiniteNumberField(entry, "closingValue");

    if (!closingValue.ok) {
      return closingValue;
    }

    const movement = parseOptionalFiniteNumberField(entry, "movement");

    if (!movement.ok) {
      return movement;
    }

    const lineMovement = parseOptionalFiniteNumberField(entry, "lineMovement");

    if (!lineMovement.ok) {
      return lineMovement;
    }

    const marketSource = parseOptionalNonEmptyStringField(entry, "marketSource");

    if (!marketSource.ok) {
      return marketSource;
    }

    records.push(
      Object.freeze({
        marketType: entry.marketType,
        selection: entry.selection,
        observedAt: entry.observedAt.trim(),
        ...(line.value === undefined ? {} : { line: line.value }),
        ...(openingValue.value === undefined
          ? {}
          : { openingValue: openingValue.value }),
        ...(currentValue.value === undefined
          ? {}
          : { currentValue: currentValue.value }),
        ...(closingValue.value === undefined
          ? {}
          : { closingValue: closingValue.value }),
        ...(movement.value === undefined ? {} : { movement: movement.value }),
        ...(lineMovement.value === undefined
          ? {}
          : { lineMovement: lineMovement.value }),
        ...(marketSource.value === undefined
          ? {}
          : { marketSource: marketSource.value }),
      }),
    );
  }

  return success(Object.freeze(records));
}

interface MarketDepthFields {
  readonly marketSource?: string;
  readonly overUnder?: OverUnderFields;
  readonly openingHomeOdds?: number;
  readonly openingDrawOdds?: number;
  readonly openingAwayOdds?: number;
  readonly closingHomeOdds?: number;
  readonly closingDrawOdds?: number;
  readonly closingAwayOdds?: number;
  readonly oddsMovementHome?: number;
  readonly oddsMovementDraw?: number;
  readonly oddsMovementAway?: number;
  readonly asianHandicapOpeningLine?: number;
  readonly asianHandicapOpeningHomeOdds?: number;
  readonly asianHandicapOpeningAwayOdds?: number;
  readonly handicapMovement?: number;
  readonly overUnderOpeningLine?: number;
  readonly overOpeningOdds?: number;
  readonly underOpeningOdds?: number;
  readonly overUnderLineMovement?: number;
  readonly publicBettingHomePct?: number;
  readonly publicBettingDrawPct?: number;
  readonly publicBettingAwayPct?: number;
  readonly bettingVolume?: number;
  readonly sharpMoneyIndicator?: boolean | string;
  readonly markets?: readonly MarketEvidencePayloadRecord[];
}

function parseMarketDepthFields(
  value: Record<string, unknown>,
): Result<MarketDepthFields, EvidenceNormalizationError> {
  const marketSource = parseOptionalNonEmptyStringField(value, "marketSource");

  if (!marketSource.ok) {
    return marketSource;
  }

  const overUnder = parseOverUnderFields(value);

  if (!overUnder.ok) {
    return overUnder;
  }

  const openingHomeOdds = parseOptionalDecimalOddsField(value, "openingHomeOdds");

  if (!openingHomeOdds.ok) {
    return openingHomeOdds;
  }

  const openingDrawOdds = parseOptionalDecimalOddsField(value, "openingDrawOdds");

  if (!openingDrawOdds.ok) {
    return openingDrawOdds;
  }

  const openingAwayOdds = parseOptionalDecimalOddsField(value, "openingAwayOdds");

  if (!openingAwayOdds.ok) {
    return openingAwayOdds;
  }

  const closingHomeOdds = parseOptionalDecimalOddsField(value, "closingHomeOdds");

  if (!closingHomeOdds.ok) {
    return closingHomeOdds;
  }

  const closingDrawOdds = parseOptionalDecimalOddsField(value, "closingDrawOdds");

  if (!closingDrawOdds.ok) {
    return closingDrawOdds;
  }

  const closingAwayOdds = parseOptionalDecimalOddsField(value, "closingAwayOdds");

  if (!closingAwayOdds.ok) {
    return closingAwayOdds;
  }

  const oddsMovementHome = parseOptionalFiniteNumberField(value, "oddsMovementHome");

  if (!oddsMovementHome.ok) {
    return oddsMovementHome;
  }

  const oddsMovementDraw = parseOptionalFiniteNumberField(value, "oddsMovementDraw");

  if (!oddsMovementDraw.ok) {
    return oddsMovementDraw;
  }

  const oddsMovementAway = parseOptionalFiniteNumberField(value, "oddsMovementAway");

  if (!oddsMovementAway.ok) {
    return oddsMovementAway;
  }

  const asianHandicapOpeningLine = parseOptionalFiniteNumberField(
    value,
    "asianHandicapOpeningLine",
  );

  if (!asianHandicapOpeningLine.ok) {
    return asianHandicapOpeningLine;
  }

  const asianHandicapOpeningHomeOdds = parseOptionalDecimalOddsField(
    value,
    "asianHandicapOpeningHomeOdds",
  );

  if (!asianHandicapOpeningHomeOdds.ok) {
    return asianHandicapOpeningHomeOdds;
  }

  const asianHandicapOpeningAwayOdds = parseOptionalDecimalOddsField(
    value,
    "asianHandicapOpeningAwayOdds",
  );

  if (!asianHandicapOpeningAwayOdds.ok) {
    return asianHandicapOpeningAwayOdds;
  }

  const handicapMovement = parseOptionalFiniteNumberField(value, "handicapMovement");

  if (!handicapMovement.ok) {
    return handicapMovement;
  }

  const overUnderOpeningLine = parseOptionalFiniteNumberField(
    value,
    "overUnderOpeningLine",
  );

  if (!overUnderOpeningLine.ok) {
    return overUnderOpeningLine;
  }

  const overOpeningOdds = parseOptionalDecimalOddsField(value, "overOpeningOdds");

  if (!overOpeningOdds.ok) {
    return overOpeningOdds;
  }

  const underOpeningOdds = parseOptionalDecimalOddsField(value, "underOpeningOdds");

  if (!underOpeningOdds.ok) {
    return underOpeningOdds;
  }

  const overUnderLineMovement = parseOptionalFiniteNumberField(
    value,
    "overUnderLineMovement",
  );

  if (!overUnderLineMovement.ok) {
    return overUnderLineMovement;
  }

  const publicBettingHomePct = parseOptionalFiniteNumberField(
    value,
    "publicBettingHomePct",
  );

  if (!publicBettingHomePct.ok) {
    return publicBettingHomePct;
  }

  const publicBettingDrawPct = parseOptionalFiniteNumberField(
    value,
    "publicBettingDrawPct",
  );

  if (!publicBettingDrawPct.ok) {
    return publicBettingDrawPct;
  }

  const publicBettingAwayPct = parseOptionalFiniteNumberField(
    value,
    "publicBettingAwayPct",
  );

  if (!publicBettingAwayPct.ok) {
    return publicBettingAwayPct;
  }

  const bettingVolume = parseOptionalFiniteNumberField(value, "bettingVolume");

  if (!bettingVolume.ok) {
    return bettingVolume;
  }

  const sharpMoneyIndicator = parseOptionalSharpMoneyIndicator(value);

  if (!sharpMoneyIndicator.ok) {
    return sharpMoneyIndicator;
  }

  const markets = parseMarketEvidenceRecords(value);

  if (!markets.ok) {
    return markets;
  }

  return success(
    Object.freeze({
      ...(marketSource.value === undefined
        ? {}
        : { marketSource: marketSource.value }),
      ...(overUnder.value === undefined ? {} : { overUnder: overUnder.value }),
      ...(openingHomeOdds.value === undefined
        ? {}
        : { openingHomeOdds: openingHomeOdds.value }),
      ...(openingDrawOdds.value === undefined
        ? {}
        : { openingDrawOdds: openingDrawOdds.value }),
      ...(openingAwayOdds.value === undefined
        ? {}
        : { openingAwayOdds: openingAwayOdds.value }),
      ...(closingHomeOdds.value === undefined
        ? {}
        : { closingHomeOdds: closingHomeOdds.value }),
      ...(closingDrawOdds.value === undefined
        ? {}
        : { closingDrawOdds: closingDrawOdds.value }),
      ...(closingAwayOdds.value === undefined
        ? {}
        : { closingAwayOdds: closingAwayOdds.value }),
      ...(oddsMovementHome.value === undefined
        ? {}
        : { oddsMovementHome: oddsMovementHome.value }),
      ...(oddsMovementDraw.value === undefined
        ? {}
        : { oddsMovementDraw: oddsMovementDraw.value }),
      ...(oddsMovementAway.value === undefined
        ? {}
        : { oddsMovementAway: oddsMovementAway.value }),
      ...(asianHandicapOpeningLine.value === undefined
        ? {}
        : { asianHandicapOpeningLine: asianHandicapOpeningLine.value }),
      ...(asianHandicapOpeningHomeOdds.value === undefined
        ? {}
        : { asianHandicapOpeningHomeOdds: asianHandicapOpeningHomeOdds.value }),
      ...(asianHandicapOpeningAwayOdds.value === undefined
        ? {}
        : { asianHandicapOpeningAwayOdds: asianHandicapOpeningAwayOdds.value }),
      ...(handicapMovement.value === undefined
        ? {}
        : { handicapMovement: handicapMovement.value }),
      ...(overUnderOpeningLine.value === undefined
        ? {}
        : { overUnderOpeningLine: overUnderOpeningLine.value }),
      ...(overOpeningOdds.value === undefined
        ? {}
        : { overOpeningOdds: overOpeningOdds.value }),
      ...(underOpeningOdds.value === undefined
        ? {}
        : { underOpeningOdds: underOpeningOdds.value }),
      ...(overUnderLineMovement.value === undefined
        ? {}
        : { overUnderLineMovement: overUnderLineMovement.value }),
      ...(publicBettingHomePct.value === undefined
        ? {}
        : { publicBettingHomePct: publicBettingHomePct.value }),
      ...(publicBettingDrawPct.value === undefined
        ? {}
        : { publicBettingDrawPct: publicBettingDrawPct.value }),
      ...(publicBettingAwayPct.value === undefined
        ? {}
        : { publicBettingAwayPct: publicBettingAwayPct.value }),
      ...(bettingVolume.value === undefined
        ? {}
        : { bettingVolume: bettingVolume.value }),
      ...(sharpMoneyIndicator.value === undefined
        ? {}
        : { sharpMoneyIndicator: sharpMoneyIndicator.value }),
      ...(markets.value === undefined ? {} : { markets: markets.value }),
    }),
  );
}

function parseProviderProvenanceOverlay(
  value: Record<string, unknown>,
): Result<OddsProvenanceOverlay | undefined, EvidenceNormalizationError> {
  const hasSource = "providerSource" in value;
  const hasSourceId = "providerSourceId" in value;
  const hasMethod = "providerMethod" in value;

  if (!hasSource && !hasSourceId && !hasMethod) {
    return success(undefined);
  }

  if (!hasSource || !hasSourceId || !hasMethod) {
    return failure(
      "INVALID_FIELD",
      "providerSource, providerSourceId, and providerMethod must be provided together.",
      "providerSource",
    );
  }

  if (
    typeof value.providerSource !== "string" ||
    value.providerSource.trim().length === 0
  ) {
    return failure(
      "INVALID_FIELD",
      "providerSource must be a non-empty string.",
      "providerSource",
    );
  }

  if (
    typeof value.providerSourceId !== "string" ||
    value.providerSourceId.trim().length === 0
  ) {
    return failure(
      "INVALID_FIELD",
      "providerSourceId must be a non-empty string.",
      "providerSourceId",
    );
  }

  if (
    typeof value.providerMethod !== "string" ||
    value.providerMethod.trim().length === 0
  ) {
    return failure(
      "INVALID_FIELD",
      "providerMethod must be a non-empty string.",
      "providerMethod",
    );
  }

  return success(
    Object.freeze({
      source: value.providerSource.trim(),
      sourceId: value.providerSourceId.trim(),
      method: value.providerMethod.trim(),
    }),
  );
}

function parseOddsProvenanceOverlay(
  value: Record<string, unknown>,
): Result<OddsProvenanceOverlay | undefined, EvidenceNormalizationError> {
  return parseProviderProvenanceOverlay(value);
}

function parseOdds(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): EvidenceNormalizationResult {
  if (!isRecord(value)) {
    return failure("INVALID_FIELD", "odds must be an object.", "odds");
  }

  const homeOdds = requireDecimalOdds(value.homeOdds, "homeOdds");

  if (!homeOdds.ok) {
    return homeOdds;
  }

  const drawOdds = requireDecimalOdds(value.drawOdds, "drawOdds");

  if (!drawOdds.ok) {
    return drawOdds;
  }

  const awayOdds = requireDecimalOdds(value.awayOdds, "awayOdds");

  if (!awayOdds.ok) {
    return awayOdds;
  }

  if (
    typeof value.observedAt !== "string" ||
    value.observedAt.trim().length === 0 ||
    Number.isNaN(Date.parse(value.observedAt))
  ) {
    return failure(
      "INVALID_FIELD",
      "observedAt must be a valid ISO 8601 timestamp.",
      "observedAt",
    );
  }

  const provenanceOverlay = parseOddsProvenanceOverlay(value);

  if (!provenanceOverlay.ok) {
    return provenanceOverlay;
  }

  const asianHandicap = parseAsianHandicapFields(value);

  if (!asianHandicap.ok) {
    return asianHandicap;
  }

  const marketDepth = parseMarketDepthFields(value);

  if (!marketDepth.ok) {
    return marketDepth;
  }

  const source = provenanceOverlay.value?.source ?? "fixture";
  const sourceId = provenanceOverlay.value?.sourceId ?? `fixture-${matchId}-odds`;
  const method = provenanceOverlay.value?.method ?? "fixture";
  const evidenceId =
    provenanceOverlay.value === undefined
      ? `evidence-fixture-${matchId}-odds`
      : `evidence-${source}-${matchId}-odds`;

  try {
    return success(
      createEvidence({
        id: evidenceId,
        source,
        sourceId,
        type: "ODDS",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        timestamp: collectedAt,
        freshness: "fresh",
        confidence: source === "the-odds-api" ? "medium" : "unknown",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method,
        },
        payload: {
          homeOdds: homeOdds.value,
          drawOdds: drawOdds.value,
          awayOdds: awayOdds.value,
          observedAt: value.observedAt,
          ...(asianHandicap.value === undefined
            ? {}
            : {
                asianHandicapLine: asianHandicap.value.asianHandicapLine,
                asianHandicapHomeOdds: asianHandicap.value.asianHandicapHomeOdds,
                asianHandicapAwayOdds: asianHandicap.value.asianHandicapAwayOdds,
              }),
          ...(marketDepth.value.marketSource === undefined
            ? {}
            : { marketSource: marketDepth.value.marketSource }),
          ...(marketDepth.value.overUnder === undefined
            ? {}
            : {
                overUnderLine: marketDepth.value.overUnder.overUnderLine,
                overOdds: marketDepth.value.overUnder.overOdds,
                underOdds: marketDepth.value.overUnder.underOdds,
              }),
          ...(marketDepth.value.openingHomeOdds === undefined
            ? {}
            : { openingHomeOdds: marketDepth.value.openingHomeOdds }),
          ...(marketDepth.value.openingDrawOdds === undefined
            ? {}
            : { openingDrawOdds: marketDepth.value.openingDrawOdds }),
          ...(marketDepth.value.openingAwayOdds === undefined
            ? {}
            : { openingAwayOdds: marketDepth.value.openingAwayOdds }),
          ...(marketDepth.value.closingHomeOdds === undefined
            ? {}
            : { closingHomeOdds: marketDepth.value.closingHomeOdds }),
          ...(marketDepth.value.closingDrawOdds === undefined
            ? {}
            : { closingDrawOdds: marketDepth.value.closingDrawOdds }),
          ...(marketDepth.value.closingAwayOdds === undefined
            ? {}
            : { closingAwayOdds: marketDepth.value.closingAwayOdds }),
          ...(marketDepth.value.oddsMovementHome === undefined
            ? {}
            : { oddsMovementHome: marketDepth.value.oddsMovementHome }),
          ...(marketDepth.value.oddsMovementDraw === undefined
            ? {}
            : { oddsMovementDraw: marketDepth.value.oddsMovementDraw }),
          ...(marketDepth.value.oddsMovementAway === undefined
            ? {}
            : { oddsMovementAway: marketDepth.value.oddsMovementAway }),
          ...(marketDepth.value.asianHandicapOpeningLine === undefined
            ? {}
            : {
                asianHandicapOpeningLine: marketDepth.value.asianHandicapOpeningLine,
              }),
          ...(marketDepth.value.asianHandicapOpeningHomeOdds === undefined
            ? {}
            : {
                asianHandicapOpeningHomeOdds:
                  marketDepth.value.asianHandicapOpeningHomeOdds,
              }),
          ...(marketDepth.value.asianHandicapOpeningAwayOdds === undefined
            ? {}
            : {
                asianHandicapOpeningAwayOdds:
                  marketDepth.value.asianHandicapOpeningAwayOdds,
              }),
          ...(marketDepth.value.handicapMovement === undefined
            ? {}
            : { handicapMovement: marketDepth.value.handicapMovement }),
          ...(marketDepth.value.overUnderOpeningLine === undefined
            ? {}
            : { overUnderOpeningLine: marketDepth.value.overUnderOpeningLine }),
          ...(marketDepth.value.overOpeningOdds === undefined
            ? {}
            : { overOpeningOdds: marketDepth.value.overOpeningOdds }),
          ...(marketDepth.value.underOpeningOdds === undefined
            ? {}
            : { underOpeningOdds: marketDepth.value.underOpeningOdds }),
          ...(marketDepth.value.overUnderLineMovement === undefined
            ? {}
            : {
                overUnderLineMovement: marketDepth.value.overUnderLineMovement,
              }),
          ...(marketDepth.value.publicBettingHomePct === undefined
            ? {}
            : { publicBettingHomePct: marketDepth.value.publicBettingHomePct }),
          ...(marketDepth.value.publicBettingDrawPct === undefined
            ? {}
            : { publicBettingDrawPct: marketDepth.value.publicBettingDrawPct }),
          ...(marketDepth.value.publicBettingAwayPct === undefined
            ? {}
            : { publicBettingAwayPct: marketDepth.value.publicBettingAwayPct }),
          ...(marketDepth.value.bettingVolume === undefined
            ? {}
            : { bettingVolume: marketDepth.value.bettingVolume }),
          ...(marketDepth.value.sharpMoneyIndicator === undefined
            ? {}
            : { sharpMoneyIndicator: marketDepth.value.sharpMoneyIndicator }),
          ...(marketDepth.value.markets === undefined
            ? {}
            : {
                markets: marketDepth.value.markets.map((row) => {
                  const record: {
                    [key: string]: string | number | boolean;
                  } = {
                    marketType: row.marketType,
                    selection: row.selection,
                    observedAt: row.observedAt,
                  };

                  if (row.line !== undefined) {
                    record.line = row.line;
                  }
                  if (row.openingValue !== undefined) {
                    record.openingValue = row.openingValue;
                  }
                  if (row.currentValue !== undefined) {
                    record.currentValue = row.currentValue;
                  }
                  if (row.closingValue !== undefined) {
                    record.closingValue = row.closingValue;
                  }
                  if (row.movement !== undefined) {
                    record.movement = row.movement;
                  }
                  if (row.lineMovement !== undefined) {
                    record.lineMovement = row.lineMovement;
                  }
                  if (row.marketSource !== undefined) {
                    record.marketSource = row.marketSource;
                  }

                  return Object.freeze(record);
                }),
              }),
        },
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "ODDS evidence normalization failed unexpectedly.",
    );
  }
}

export function normalizeFixtureEvidenceSet(
  input: unknown,
  context: FixtureEvidenceContext,
): EvidenceSetNormalizationResult {
  const matchInfo = normalizeFixtureEvidence(input, context);

  if (!matchInfo.ok) {
    return matchInfo;
  }

  if (!isRecord(input)) {
    return failure("INVALID_INPUT", "Fixture evidence input must be an object.");
  }

  const matchId = matchInfo.value.matchId;

  if (matchId === undefined) {
    return failure("INVALID_FIELD", "matchId is required.", "matchId");
  }

  const teamForm = input.teamForm;
  const statistics = input.statistics;

  if (!Array.isArray(teamForm) || teamForm.length !== 2) {
    return failure(
      "INVALID_FIELD",
      "teamForm must contain home and away entries.",
      "teamForm",
    );
  }

  if (!Array.isArray(statistics) || statistics.length !== 2) {
    return failure(
      "INVALID_FIELD",
      "statistics must contain home and away entries.",
      "statistics",
    );
  }

  const evidences: Evidence[] = [matchInfo.value];

  for (const entry of teamForm) {
    const normalized = parseTeamForm(
      entry,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalized.ok) {
      return normalized;
    }

    evidences.push(normalized.value);
  }

  for (const entry of statistics) {
    const normalized = parseStatistics(
      entry,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalized.ok) {
      return normalized;
    }

    evidences.push(normalized.value);
  }

  if (input.headToHead !== undefined) {
    const normalized = parseHeadToHead(
      input.headToHead,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalized.ok) {
      return normalized;
    }

    evidences.push(normalized.value);
  }

  if (input.venue !== undefined) {
    const normalized = parseVenue(
      input.venue,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalized.ok) {
      return normalized;
    }

    evidences.push(normalized.value);
  }

  if (input.players !== undefined) {
    const normalizedPlayers = parsePlayers(
      input.players,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalizedPlayers.ok) {
      return normalizedPlayers;
    }

    evidences.push(...normalizedPlayers.value);
  }

  if (input.availabilityAbsences !== undefined) {
    const normalizedAbsences = parseAvailabilityAbsences(
      input.availabilityAbsences,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalizedAbsences.ok) {
      return normalizedAbsences;
    }

    evidences.push(...normalizedAbsences.value);
  }

  if (input.lineups !== undefined) {
    const normalizedLineups = parseConfirmedLineups(
      input.lineups,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalizedLineups.ok) {
      return normalizedLineups;
    }

    evidences.push(...normalizedLineups.value);
  }

  if (input.expectedGoals !== undefined) {
    const normalizedExpectedGoals = parseExpectedGoals(
      input.expectedGoals,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalizedExpectedGoals.ok) {
      return normalizedExpectedGoals;
    }

    evidences.push(...normalizedExpectedGoals.value);
  }

  if (input.matchContext !== undefined) {
    const normalizedMatchContext = parseMatchContext(
      input.matchContext,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalizedMatchContext.ok) {
      return normalizedMatchContext;
    }

    evidences.push(...normalizedMatchContext.value);
  }

  if (input.clubIntelligence !== undefined) {
    const normalizedClubIntelligence = parseClubIntelligence(
      input.clubIntelligence,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalizedClubIntelligence.ok) {
      return normalizedClubIntelligence;
    }

    evidences.push(...normalizedClubIntelligence.value);
  }

  if (input.odds !== undefined) {
    const normalized = parseOdds(
      input.odds,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalized.ok) {
      return normalized;
    }

    evidences.push(normalized.value);
  }

  if (input.matchResult !== undefined) {
    const normalized = parseMatchResult(
      input.matchResult,
      matchId,
      context.collectedAt,
      matchInfo.value.eventTime,
    );

    if (!normalized.ok) {
      return normalized;
    }

    evidences.push(normalized.value);
  }

  return success(Object.freeze(evidences));
}

/**
 * A1: optional actual match outcome Evidence.
 * Absent → honest absence (pre-match / unfinished). Never invent FT scores.
 */
function parseMatchResult(
  value: unknown,
  matchId: string,
  collectedAt: string,
  _eventTime: string,
): EvidenceNormalizationResult {
  void _eventTime;

  if (!isRecord(value)) {
    return failure("INVALID_FIELD", "matchResult must be an object.", "matchResult");
  }

  const homeGoals = requireNonNegativeInteger(
    value.homeGoals,
    "matchResult.homeGoals",
  );

  if (!homeGoals.ok) {
    return homeGoals;
  }

  const awayGoals = requireNonNegativeInteger(
    value.awayGoals,
    "matchResult.awayGoals",
  );

  if (!awayGoals.ok) {
    return awayGoals;
  }

  const winner =
    value.winner === "home" || value.winner === "draw" || value.winner === "away"
      ? value.winner
      : undefined;

  if (winner === undefined) {
    return failure(
      "INVALID_FIELD",
      'matchResult.winner must be "home", "draw", or "away".',
      "matchResult.winner",
    );
  }

  const expectedWinner =
    homeGoals.value > awayGoals.value
      ? "home"
      : homeGoals.value < awayGoals.value
        ? "away"
        : "draw";

  if (winner !== expectedWinner) {
    return failure(
      "INVALID_FIELD",
      "matchResult.winner must match homeGoals/awayGoals.",
      "matchResult.winner",
    );
  }

  const totalGoals = requireNonNegativeInteger(
    value.totalGoals,
    "matchResult.totalGoals",
  );

  if (!totalGoals.ok) {
    return totalGoals;
  }

  if (totalGoals.value !== homeGoals.value + awayGoals.value) {
    return failure(
      "INVALID_FIELD",
      "matchResult.totalGoals must equal homeGoals + awayGoals.",
      "matchResult.totalGoals",
    );
  }

  if (value.matchStatus !== "FINISHED") {
    return failure(
      "INVALID_FIELD",
      'matchResult.matchStatus must be "FINISHED".',
      "matchResult.matchStatus",
    );
  }

  if (
    typeof value.observedAt !== "string" ||
    value.observedAt.trim().length === 0 ||
    Number.isNaN(Date.parse(value.observedAt))
  ) {
    return failure(
      "INVALID_FIELD",
      "matchResult.observedAt must be a valid ISO 8601 timestamp.",
      "matchResult.observedAt",
    );
  }

  const provenanceOverlay = parseProviderProvenanceOverlay(value);

  if (!provenanceOverlay.ok) {
    return provenanceOverlay;
  }

  const competitionId =
    value.competitionId === undefined || value.competitionId === null
      ? undefined
      : typeof value.competitionId === "string" &&
          value.competitionId.trim().length > 0
        ? value.competitionId.trim()
        : undefined;

  if (
    value.competitionId !== undefined &&
    value.competitionId !== null &&
    competitionId === undefined
  ) {
    return failure(
      "INVALID_FIELD",
      "matchResult.competitionId must be a non-empty string when present.",
      "matchResult.competitionId",
    );
  }

  const competitionName =
    value.competitionName === undefined || value.competitionName === null
      ? undefined
      : typeof value.competitionName === "string" &&
          value.competitionName.trim().length > 0
        ? value.competitionName.trim()
        : undefined;

  if (
    value.competitionName !== undefined &&
    value.competitionName !== null &&
    competitionName === undefined
  ) {
    return failure(
      "INVALID_FIELD",
      "matchResult.competitionName must be a non-empty string when present.",
      "matchResult.competitionName",
    );
  }

  const source = provenanceOverlay.value?.source ?? "fixture";
  const sourceId = provenanceOverlay.value?.sourceId ?? `fixture-${matchId}-result`;
  const method = provenanceOverlay.value?.method ?? "fixture";

  try {
    return success(
      createEvidence({
        id: `evidence-${source}-${matchId}-result`,
        source,
        sourceId,
        type: "MATCH_RESULT",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime: value.observedAt.trim(),
        timestamp: collectedAt,
        freshness: "fresh",
        confidence: source === "api-football" ? "medium" : "unknown",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method,
        },
        payload: {
          homeGoals: homeGoals.value,
          awayGoals: awayGoals.value,
          winner,
          totalGoals: totalGoals.value,
          matchStatus: "FINISHED",
          ...(competitionId === undefined ? {} : { competitionId }),
          ...(competitionName === undefined ? {} : { competitionName }),
          observedAt: value.observedAt.trim(),
        },
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "MATCH_RESULT evidence normalization failed unexpectedly.",
    );
  }
}

function requireNonNegativeInteger(
  value: unknown,
  field: string,
): Result<number, EvidenceNormalizationError> {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    return failure(
      "INVALID_FIELD",
      `${field} must be a non-negative integer.`,
      field,
    );
  }

  return success(value);
}

function parseVenue(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): EvidenceNormalizationResult {
  if (!isRecord(value)) {
    return failure("INVALID_FIELD", "venue must be an object.", "venue");
  }

  if (typeof value.name !== "string" || value.name.trim().length === 0) {
    return failure(
      "INVALID_FIELD",
      "venue.name must be a non-empty string.",
      "name",
    );
  }

  const city =
    value.city === undefined || value.city === null
      ? undefined
      : typeof value.city === "string" && value.city.trim().length > 0
        ? value.city.trim()
        : undefined;

  if (value.city !== undefined && value.city !== null && city === undefined) {
    return failure(
      "INVALID_FIELD",
      "venue.city must be a non-empty string when provided.",
      "city",
    );
  }

  const venueId =
    value.venueId === undefined || value.venueId === null
      ? undefined
      : typeof value.venueId === "string" && value.venueId.trim().length > 0
        ? value.venueId.trim()
        : undefined;

  if (
    value.venueId !== undefined &&
    value.venueId !== null &&
    venueId === undefined
  ) {
    return failure(
      "INVALID_FIELD",
      "venue.venueId must be a non-empty string when provided.",
      "venueId",
    );
  }

  const provenanceOverlay = parseProviderProvenanceOverlay(value);

  if (!provenanceOverlay.ok) {
    return provenanceOverlay;
  }

  const provenance = provenanceOverlay.value;
  const source = provenance?.source ?? "fixture";
  const sourceId = provenance?.sourceId ?? `fixture-${matchId}-venue`;
  const method = provenance?.method ?? "fixture";

  try {
    return success(
      createEvidence({
        id: `evidence-${source}-${matchId}-venue`,
        source,
        sourceId,
        type: "VENUE",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        timestamp: collectedAt,
        freshness: "fresh",
        confidence: source === "api-football" ? "medium" : "unknown",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method,
        },
        payload: Object.freeze({
          name: value.name.trim(),
          ...(city === undefined ? {} : { city }),
          ...(venueId === undefined ? {} : { venueId }),
        }),
      }),
    );
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "VENUE evidence normalization failed unexpectedly.",
    );
  }
}

function parsePlayers(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): Result<readonly Evidence[], EvidenceNormalizationError> {
  if (!Array.isArray(value)) {
    return failure("INVALID_FIELD", "players must be an array.", "players");
  }

  if (value.length === 0) {
    return success(Object.freeze([]));
  }

  const players: Evidence[] = [];

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        `players[${String(index)}] must be an object.`,
        "players",
      );
    }

    if (typeof entry.playerId !== "string" || entry.playerId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "playerId must be a non-empty string.",
        "playerId",
      );
    }

    if (typeof entry.name !== "string" || entry.name.trim().length === 0) {
      return failure("INVALID_FIELD", "name must be a non-empty string.", "name");
    }

    if (typeof entry.teamId !== "string" || entry.teamId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "teamId must be a non-empty string.",
        "teamId",
      );
    }

    if (typeof entry.teamName !== "string" || entry.teamName.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "teamName must be a non-empty string.",
        "teamName",
      );
    }

    const teamSide = requireTeamSide(entry.teamSide);

    if (teamSide === undefined) {
      return failure("INVALID_FIELD", "teamSide must be home or away.", "teamSide");
    }

    const position =
      entry.position === undefined || entry.position === null
        ? undefined
        : typeof entry.position === "string" && entry.position.trim().length > 0
          ? entry.position.trim()
          : undefined;

    if (
      entry.position !== undefined &&
      entry.position !== null &&
      position === undefined
    ) {
      return failure(
        "INVALID_FIELD",
        "position must be a non-empty string when provided.",
        "position",
      );
    }

    const number =
      entry.number === undefined || entry.number === null
        ? undefined
        : typeof entry.number === "number" &&
            Number.isInteger(entry.number) &&
            entry.number >= 0
          ? entry.number
          : undefined;

    if (
      entry.number !== undefined &&
      entry.number !== null &&
      number === undefined
    ) {
      return failure(
        "INVALID_FIELD",
        "number must be a non-negative integer when provided.",
        "number",
      );
    }

    const nationality =
      entry.nationality === undefined || entry.nationality === null
        ? undefined
        : typeof entry.nationality === "string" &&
            entry.nationality.trim().length > 0
          ? entry.nationality.trim()
          : undefined;

    if (
      entry.nationality !== undefined &&
      entry.nationality !== null &&
      nationality === undefined
    ) {
      return failure(
        "INVALID_FIELD",
        "nationality must be a non-empty string when provided.",
        "nationality",
      );
    }

    const photo =
      entry.photo === undefined || entry.photo === null
        ? undefined
        : typeof entry.photo === "string" && entry.photo.trim().length > 0
          ? entry.photo.trim()
          : undefined;

    if (entry.photo !== undefined && entry.photo !== null && photo === undefined) {
      return failure(
        "INVALID_FIELD",
        "photo must be a non-empty string when provided.",
        "photo",
      );
    }

    const age = parseOptionalNonNegativeInteger(entry.age, "age");

    if (!age.ok) {
      return age;
    }

    if (entry.captain !== undefined && typeof entry.captain !== "boolean") {
      return failure(
        "INVALID_FIELD",
        "captain must be a boolean when provided.",
        "captain",
      );
    }

    const captain = typeof entry.captain === "boolean" ? entry.captain : undefined;

    if (
      entry.availabilityStatus !== undefined &&
      entry.availabilityStatus !== "injury" &&
      entry.availabilityStatus !== "suspension"
    ) {
      return failure(
        "INVALID_FIELD",
        'availabilityStatus must be "injury" or "suspension" when provided.',
        "availabilityStatus",
      );
    }

    const availabilityStatus =
      entry.availabilityStatus === "injury" ||
      entry.availabilityStatus === "suspension"
        ? entry.availabilityStatus
        : undefined;

    if (
      entry.matchSquadStatus !== undefined &&
      entry.matchSquadStatus !== "starting" &&
      entry.matchSquadStatus !== "bench"
    ) {
      return failure(
        "INVALID_FIELD",
        'matchSquadStatus must be "starting" or "bench" when provided.',
        "matchSquadStatus",
      );
    }

    const matchSquadStatus =
      entry.matchSquadStatus === "starting" || entry.matchSquadStatus === "bench"
        ? entry.matchSquadStatus
        : undefined;

    const seasonStats = parsePlayerSeasonStats(entry.seasonStats);

    if (!seasonStats.ok) {
      return seasonStats;
    }

    const provenanceOverlay = parseProviderProvenanceOverlay(entry);

    if (!provenanceOverlay.ok) {
      return provenanceOverlay;
    }

    const provenance = provenanceOverlay.value;
    const source = provenance?.source ?? "fixture";
    const playerId = entry.playerId.trim();
    const sourceId = provenance?.sourceId ?? `fixture-${matchId}-player-${playerId}`;
    const method = provenance?.method ?? "fixture";

    try {
      players.push(
        createEvidence({
          id: `evidence-${source}-${matchId}-player-${playerId}`,
          source,
          sourceId,
          type: "PLAYER",
          matchId: createMatchId(matchId),
          collectedAt,
          eventTime,
          timestamp: collectedAt,
          freshness: "fresh",
          confidence: source === "api-football" ? "medium" : "unknown",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method,
          },
          payload: Object.freeze({
            playerId,
            name: entry.name.trim(),
            teamId: entry.teamId.trim(),
            teamName: entry.teamName.trim(),
            teamSide,
            ...(position === undefined ? {} : { position }),
            ...(number === undefined ? {} : { number }),
            ...(age.value === undefined ? {} : { age: age.value }),
            ...(nationality === undefined ? {} : { nationality }),
            ...(photo === undefined ? {} : { photo }),
            ...(captain === undefined ? {} : { captain }),
            ...(availabilityStatus === undefined ? {} : { availabilityStatus }),
            ...(matchSquadStatus === undefined ? {} : { matchSquadStatus }),
            ...(seasonStats.value === undefined
              ? {}
              : { seasonStats: seasonStats.value }),
          }),
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof EvidenceValidationError ||
        error instanceof MatchValidationError
      ) {
        return failure("DOMAIN_VALIDATION_FAILED", error.message);
      }

      return failure(
        "UNEXPECTED_ERROR",
        "PLAYER evidence normalization failed unexpectedly.",
      );
    }
  }

  return success(Object.freeze(players));
}

const PLAYER_SEASON_STATS_NUMBER_FIELDS = [
  "season",
  "appearances",
  "starts",
  "minutesPlayed",
  "rating",
  "goals",
  "assists",
  "yellowCards",
  "redCards",
  "saves",
  "goalsConceded",
] as const;

/**
 * P1A: optional per-player current-season statistics nested on PLAYER
 * Evidence. Every metric is present only when supplied; absent → honest
 * absence. Never estimate a value the provider did not return.
 */
function parsePlayerSeasonStats(
  value: unknown,
): Result<
  Readonly<Record<string, number | string>> | undefined,
  EvidenceNormalizationError
> {
  if (value === undefined) {
    return success(undefined);
  }

  if (!isRecord(value)) {
    return failure(
      "INVALID_FIELD",
      "seasonStats must be an object when present.",
      "seasonStats",
    );
  }

  const stats: { [key: string]: number | string } = {};

  if (value.competitionId !== undefined) {
    if (
      typeof value.competitionId !== "string" ||
      value.competitionId.trim().length === 0
    ) {
      return failure(
        "INVALID_FIELD",
        "seasonStats.competitionId must be a non-empty string when present.",
        "seasonStats.competitionId",
      );
    }

    stats.competitionId = value.competitionId.trim();
  }

  for (const field of PLAYER_SEASON_STATS_NUMBER_FIELDS) {
    const parsed = parseOptionalFiniteNumber(value[field], `seasonStats.${field}`);

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.value !== undefined) {
      stats[field] = parsed.value;
    }
  }

  if (Object.keys(stats).length === 0) {
    return failure(
      "INVALID_FIELD",
      "seasonStats must include at least one provider metric when present.",
      "seasonStats",
    );
  }

  return success(Object.freeze(stats));
}

function parseAvailabilityAbsences(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): Result<readonly Evidence[], EvidenceNormalizationError> {
  if (!Array.isArray(value)) {
    return failure(
      "INVALID_FIELD",
      "availabilityAbsences must be an array.",
      "availabilityAbsences",
    );
  }

  if (value.length === 0) {
    return success(Object.freeze([]));
  }

  const absences: Evidence[] = [];

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        `availabilityAbsences[${String(index)}] must be an object.`,
        "availabilityAbsences",
      );
    }

    if (typeof entry.playerId !== "string" || entry.playerId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "playerId must be a non-empty string.",
        "playerId",
      );
    }

    if (
      typeof entry.playerName !== "string" ||
      entry.playerName.trim().length === 0
    ) {
      return failure(
        "INVALID_FIELD",
        "playerName must be a non-empty string.",
        "playerName",
      );
    }

    if (typeof entry.teamId !== "string" || entry.teamId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "teamId must be a non-empty string.",
        "teamId",
      );
    }

    if (typeof entry.teamName !== "string" || entry.teamName.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "teamName must be a non-empty string.",
        "teamName",
      );
    }

    const teamSide = requireTeamSide(entry.teamSide);

    if (teamSide === undefined) {
      return failure("INVALID_FIELD", "teamSide must be home or away.", "teamSide");
    }

    if (entry.kind !== "injury" && entry.kind !== "suspension") {
      return failure("INVALID_FIELD", "kind must be injury or suspension.", "kind");
    }

    const reason =
      entry.reason === undefined || entry.reason === null
        ? undefined
        : typeof entry.reason === "string" && entry.reason.trim().length > 0
          ? entry.reason.trim()
          : undefined;

    if (
      entry.reason !== undefined &&
      entry.reason !== null &&
      reason === undefined
    ) {
      return failure(
        "INVALID_FIELD",
        "reason must be a non-empty string when provided.",
        "reason",
      );
    }

    const provenanceOverlay = parseProviderProvenanceOverlay(entry);

    if (!provenanceOverlay.ok) {
      return provenanceOverlay;
    }

    const provenance = provenanceOverlay.value;
    const source = provenance?.source ?? "fixture";
    const playerId = entry.playerId.trim();
    const kind = entry.kind;
    const evidenceType = kind === "injury" ? "INJURY" : "SUSPENSION";
    const sourceId =
      provenance?.sourceId ?? `fixture-${matchId}-availability-${kind}-${playerId}`;
    const method = provenance?.method ?? "fixture";

    try {
      absences.push(
        createEvidence({
          id: `evidence-${source}-${matchId}-availability-${kind}-${playerId}`,
          source,
          sourceId,
          type: evidenceType,
          matchId: createMatchId(matchId),
          collectedAt,
          eventTime,
          timestamp: collectedAt,
          freshness: "fresh",
          confidence: source === "api-football" ? "medium" : "unknown",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method,
          },
          payload: Object.freeze({
            playerId,
            playerName: entry.playerName.trim(),
            teamId: entry.teamId.trim(),
            teamName: entry.teamName.trim(),
            teamSide,
            kind,
            ...(reason === undefined ? {} : { reason }),
          }),
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof EvidenceValidationError ||
        error instanceof MatchValidationError
      ) {
        return failure("DOMAIN_VALIDATION_FAILED", error.message);
      }

      return failure(
        "UNEXPECTED_ERROR",
        `${evidenceType} evidence normalization failed unexpectedly.`,
      );
    }
  }

  return success(Object.freeze(absences));
}

function parseOptionalRate(
  value: unknown,
  field: string,
): Result<number, EvidenceNormalizationError> | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return failure("INVALID_FIELD", `${field} must be a finite number ≥ 0.`, field);
  }

  return success(value);
}

function parseOptionalFormSplit(
  value: unknown,
  field: string,
):
  | Result<
      Readonly<{
        window: number;
        results: readonly ("D" | "L" | "W")[];
        goalsFor: readonly number[];
        goalsAgainst: readonly number[];
      }>,
      EvidenceNormalizationError
    >
  | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    return failure("INVALID_FIELD", `${field} must be an object.`, field);
  }

  if (
    typeof value.window !== "number" ||
    !Number.isInteger(value.window) ||
    value.window < 1 ||
    value.window > 10
  ) {
    return failure(
      "INVALID_FIELD",
      `${field}.window must be an integer between 1 and 10.`,
      field,
    );
  }

  const results = requireResultCodes(
    value.results,
    value.window,
    `${field}.results`,
  );

  if (!results.ok) {
    return results;
  }

  const goalsFor = requireNonNegativeIntArray(
    value.goalsFor,
    value.window,
    `${field}.goalsFor`,
  );

  if (!goalsFor.ok) {
    return goalsFor;
  }

  const goalsAgainst = requireNonNegativeIntArray(
    value.goalsAgainst,
    value.window,
    `${field}.goalsAgainst`,
  );

  if (!goalsAgainst.ok) {
    return goalsAgainst;
  }

  return success(
    Object.freeze({
      window: value.window,
      results: results.value,
      goalsFor: goalsFor.value,
      goalsAgainst: goalsAgainst.value,
    }),
  );
}

function parseLineupPlayers(
  value: unknown,
  field: string,
): Result<
  readonly Readonly<{
    playerId: string;
    name: string;
    number?: number;
    position?: string;
    grid?: string;
  }>[],
  EvidenceNormalizationError
> {
  if (!Array.isArray(value)) {
    return failure("INVALID_FIELD", `${field} must be an array.`, field);
  }

  const players: Array<{
    playerId: string;
    name: string;
    number?: number;
    position?: string;
    grid?: string;
  }> = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return failure("INVALID_FIELD", `${field} entries must be objects.`, field);
    }

    if (typeof entry.playerId !== "string" || entry.playerId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "playerId must be a non-empty string.",
        "playerId",
      );
    }

    if (typeof entry.name !== "string" || entry.name.trim().length === 0) {
      return failure("INVALID_FIELD", "name must be a non-empty string.", "name");
    }

    const number =
      entry.number === undefined
        ? undefined
        : typeof entry.number === "number" && Number.isFinite(entry.number)
          ? entry.number
          : undefined;

    if (entry.number !== undefined && number === undefined) {
      return failure(
        "INVALID_FIELD",
        "number must be a finite number when provided.",
        "number",
      );
    }

    const position =
      entry.position === undefined
        ? undefined
        : typeof entry.position === "string" && entry.position.trim().length > 0
          ? entry.position.trim()
          : undefined;
    const grid =
      entry.grid === undefined
        ? undefined
        : typeof entry.grid === "string" && entry.grid.trim().length > 0
          ? entry.grid.trim()
          : undefined;

    players.push(
      Object.freeze({
        playerId: entry.playerId.trim(),
        name: entry.name.trim(),
        ...(number === undefined ? {} : { number }),
        ...(position === undefined ? {} : { position }),
        ...(grid === undefined ? {} : { grid }),
      }),
    );
  }

  return success(Object.freeze(players));
}

/**
 * Confirmed lineup Evidence only. Empty provider sheets are omitted upstream;
 * never invents Expected Lineup.
 */
function parseConfirmedLineups(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): Result<readonly Evidence[], EvidenceNormalizationError> {
  if (!Array.isArray(value)) {
    return failure("INVALID_FIELD", "lineups must be an array.", "lineups");
  }

  if (value.length === 0) {
    return success(Object.freeze([]));
  }

  const lineups: Evidence[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return failure("INVALID_FIELD", "lineup entry must be an object.", "lineups");
    }

    if (typeof entry.teamId !== "string" || entry.teamId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "teamId must be a non-empty string.",
        "teamId",
      );
    }

    if (typeof entry.teamName !== "string" || entry.teamName.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "teamName must be a non-empty string.",
        "teamName",
      );
    }

    const teamSide = requireTeamSide(entry.teamSide);

    if (teamSide === undefined) {
      return failure("INVALID_FIELD", "teamSide must be home or away.", "teamSide");
    }

    // Only confirmed sheets are accepted — reject any non-confirmed status.
    if (entry.status !== undefined && entry.status !== "confirmed") {
      return failure(
        "INVALID_FIELD",
        "lineup status must be confirmed when provided.",
        "status",
      );
    }

    const startXI = parseLineupPlayers(entry.startXI, "startXI");

    if (!startXI.ok) {
      return startXI;
    }

    if (startXI.value.length === 0) {
      return failure(
        "INVALID_FIELD",
        "confirmed lineup requires a non-empty startXI.",
        "startXI",
      );
    }

    const substitutes =
      entry.substitutes === undefined
        ? success(Object.freeze([] as const))
        : parseLineupPlayers(entry.substitutes, "substitutes");

    if (!substitutes.ok) {
      return substitutes;
    }

    const formation =
      entry.formation === undefined
        ? undefined
        : typeof entry.formation === "string" && entry.formation.trim().length > 0
          ? entry.formation.trim()
          : undefined;

    const provenanceOverlay = parseProviderProvenanceOverlay(entry);

    if (!provenanceOverlay.ok) {
      return provenanceOverlay;
    }

    const provenance = provenanceOverlay.value;
    const source = provenance?.source ?? "fixture";
    const sourceId = provenance?.sourceId ?? `fixture-${matchId}-lineup-${teamSide}`;
    const method = provenance?.method ?? "fixture";

    try {
      lineups.push(
        createEvidence({
          id: `evidence-${source}-${matchId}-lineup-${teamSide}`,
          source,
          sourceId,
          type: "LINEUP",
          matchId: createMatchId(matchId),
          collectedAt,
          eventTime,
          timestamp: collectedAt,
          freshness: "fresh",
          confidence: source === "api-football" ? "medium" : "unknown",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method,
          },
          payload: Object.freeze({
            teamId: entry.teamId.trim(),
            teamName: entry.teamName.trim(),
            teamSide,
            status: "confirmed",
            ...(formation === undefined ? {} : { formation }),
            startXI: startXI.value,
            substitutes: substitutes.value,
          }),
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof EvidenceValidationError ||
        error instanceof MatchValidationError
      ) {
        return failure("DOMAIN_VALIDATION_FAILED", error.message);
      }

      return failure(
        "UNEXPECTED_ERROR",
        "LINEUP evidence normalization failed unexpectedly.",
      );
    }
  }

  return success(Object.freeze(lineups));
}

type ExpectedGoalsWindow =
  | "overall"
  | "home"
  | "away"
  | "recent"
  | "last5"
  | "last10"
  | "fixture";

function isExpectedGoalsWindow(value: unknown): value is ExpectedGoalsWindow {
  return (
    value === "overall" ||
    value === "home" ||
    value === "away" ||
    value === "recent" ||
    value === "last5" ||
    value === "last10" ||
    value === "fixture"
  );
}

function parseOptionalFiniteNumber(
  value: unknown,
  field: string,
): Result<number | undefined, EvidenceNormalizationError> {
  if (value === undefined) {
    return success(undefined);
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return failure("INVALID_FIELD", `${field} must be a finite number.`, field);
  }

  return success(value);
}

function parseExpectedGoalsMetrics(
  value: unknown,
): Result<Readonly<Record<string, number>>, EvidenceNormalizationError> {
  if (value === undefined) {
    return failure(
      "INVALID_FIELD",
      "expectedGoals.metrics is required when a record is present.",
      "expectedGoals.metrics",
    );
  }

  if (!isRecord(value)) {
    return failure(
      "INVALID_FIELD",
      "expectedGoals.metrics must be an object.",
      "expectedGoals.metrics",
    );
  }

  const metricFields = [
    "xg",
    "xga",
    "nonPenaltyXg",
    "nonPenaltyXga",
    "expectedPoints",
    "expectedGoalDifference",
  ] as const;

  const metrics: { -readonly [K in (typeof metricFields)[number]]?: number } = {};

  for (const field of metricFields) {
    const parsed = parseOptionalFiniteNumber(
      value[field],
      `expectedGoals.metrics.${field}`,
    );

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.value !== undefined) {
      metrics[field] = parsed.value;
    }
  }

  if (Object.keys(metrics).length === 0) {
    return failure(
      "INVALID_FIELD",
      "expectedGoals.metrics must include at least one provider metric.",
      "expectedGoals.metrics",
    );
  }

  return success(Object.freeze(metrics));
}

/**
 * F1.3A: optional Expected Goals Evidence records.
 * Absent array → honest absence. Never invent metrics or derive from shots.
 */
function parseExpectedGoals(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): Result<readonly Evidence[], EvidenceNormalizationError> {
  if (!Array.isArray(value)) {
    return failure(
      "INVALID_FIELD",
      "expectedGoals must be an array.",
      "expectedGoals",
    );
  }

  const records: Evidence[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        "expectedGoals entry must be an object.",
        "expectedGoals",
      );
    }

    const teamSide = requireTeamSide(entry.teamSide);

    if (teamSide === undefined) {
      return failure(
        "INVALID_FIELD",
        'expectedGoals.teamSide must be "home" or "away".',
        "expectedGoals.teamSide",
      );
    }

    if (typeof entry.teamId !== "string" || entry.teamId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "expectedGoals.teamId must be a non-empty string.",
        "expectedGoals.teamId",
      );
    }

    if (typeof entry.teamName !== "string" || entry.teamName.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "expectedGoals.teamName must be a non-empty string.",
        "expectedGoals.teamName",
      );
    }

    if (!isExpectedGoalsWindow(entry.window)) {
      return failure(
        "INVALID_FIELD",
        "expectedGoals.window must be one of overall|home|away|recent|last5|last10|fixture.",
        "expectedGoals.window",
      );
    }

    const window = entry.window;

    if (
      typeof entry.observedAt !== "string" ||
      entry.observedAt.trim().length === 0
    ) {
      return failure(
        "INVALID_FIELD",
        "expectedGoals.observedAt must be a non-empty string.",
        "expectedGoals.observedAt",
      );
    }

    const metrics = parseExpectedGoalsMetrics(entry.metrics);

    if (!metrics.ok) {
      return metrics;
    }

    const provenanceOverlay = parseProviderProvenanceOverlay(entry);

    if (!provenanceOverlay.ok) {
      return provenanceOverlay;
    }

    const provenance = provenanceOverlay.value;
    const source = provenance?.source ?? "fixture";
    const sourceId =
      provenance?.sourceId ?? `fixture-${matchId}-xg-${teamSide}-${window}`;
    const method = provenance?.method ?? "fixture";

    try {
      records.push(
        createEvidence({
          id: `evidence-${source}-${matchId}-xg-${teamSide}-${window}`,
          source,
          sourceId,
          type: "EXPECTED_GOALS",
          matchId: createMatchId(matchId),
          collectedAt,
          eventTime,
          timestamp: collectedAt,
          freshness: "fresh",
          confidence: source === "api-football" ? "medium" : "unknown",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method,
          },
          payload: Object.freeze({
            teamId: entry.teamId.trim(),
            teamName: entry.teamName.trim(),
            teamSide,
            ...(typeof entry.competitionId === "string" &&
            entry.competitionId.trim().length > 0
              ? { competitionId: entry.competitionId.trim() }
              : {}),
            ...(typeof entry.competitionName === "string" &&
            entry.competitionName.trim().length > 0
              ? { competitionName: entry.competitionName.trim() }
              : {}),
            ...(typeof entry.season === "string" && entry.season.trim().length > 0
              ? { season: entry.season.trim() }
              : typeof entry.season === "number" && Number.isFinite(entry.season)
                ? { season: String(entry.season) }
                : {}),
            window,
            metrics: metrics.value,
            observedAt: entry.observedAt.trim(),
          }),
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof EvidenceValidationError ||
        error instanceof MatchValidationError
      ) {
        return failure("DOMAIN_VALIDATION_FAILED", error.message);
      }

      return failure(
        "UNEXPECTED_ERROR",
        "EXPECTED_GOALS evidence normalization failed unexpectedly.",
      );
    }
  }

  return success(Object.freeze(records));
}

function parseOptionalNonNegativeInteger(
  value: unknown,
  field: string,
): Result<number | undefined, EvidenceNormalizationError> {
  if (value === undefined) {
    return success(undefined);
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return failure(
      "INVALID_FIELD",
      `${field} must be a non-negative integer.`,
      field,
    );
  }

  return success(value);
}

function parseOptionalNonEmptyString(
  value: unknown,
  field: string,
): Result<string | undefined, EvidenceNormalizationError> {
  if (value === undefined) {
    return success(undefined);
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return failure(
      "INVALID_FIELD",
      `${field} must be a non-empty string when present.`,
      field,
    );
  }

  return success(value.trim());
}

/**
 * I1A: optional Match Context Evidence records.
 * Absent array → honest absence. Never invent rest/travel/knockout facts.
 */
function parseMatchContextMetrics(
  value: unknown,
): Result<
  Readonly<Record<string, boolean | number | string>>,
  EvidenceNormalizationError
> {
  if (value === undefined) {
    return failure(
      "INVALID_FIELD",
      "matchContext.metrics is required when a record is present.",
      "matchContext.metrics",
    );
  }

  if (!isRecord(value)) {
    return failure(
      "INVALID_FIELD",
      "matchContext.metrics must be an object.",
      "matchContext.metrics",
    );
  }

  const metrics: {
    restDays?: number;
    daysSinceLastMatch?: number;
    daysUntilNextMatch?: number;
    matchesInLast7Days?: number;
    matchesInLast14Days?: number;
    fixtureCongestion?: number;
    homeAwayContext?: string;
    travelContext?: string;
    venueCity?: string;
    competitionKind?: string;
    competitionTypeLabel?: string;
    isKnockout?: boolean;
    roundLabel?: string;
    leg?: string;
    aggregateScore?: string;
  } = {};

  const integerFields = [
    "restDays",
    "daysSinceLastMatch",
    "daysUntilNextMatch",
    "matchesInLast7Days",
    "matchesInLast14Days",
    "fixtureCongestion",
  ] as const;

  for (const field of integerFields) {
    const parsed = parseOptionalNonNegativeInteger(
      value[field],
      `matchContext.metrics.${field}`,
    );

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.value !== undefined) {
      metrics[field] = parsed.value;
    }
  }

  if (value.homeAwayContext !== undefined) {
    if (value.homeAwayContext !== "home" && value.homeAwayContext !== "away") {
      return failure(
        "INVALID_FIELD",
        'matchContext.metrics.homeAwayContext must be "home" or "away".',
        "matchContext.metrics.homeAwayContext",
      );
    }

    metrics.homeAwayContext = value.homeAwayContext;
  }

  if (value.travelContext !== undefined) {
    if (value.travelContext !== "home" && value.travelContext !== "away") {
      return failure(
        "INVALID_FIELD",
        'matchContext.metrics.travelContext must be "home" or "away".',
        "matchContext.metrics.travelContext",
      );
    }

    metrics.travelContext = value.travelContext;
  }

  const venueCity = parseOptionalNonEmptyString(
    value.venueCity,
    "matchContext.metrics.venueCity",
  );

  if (!venueCity.ok) {
    return venueCity;
  }

  if (venueCity.value !== undefined) {
    metrics.venueCity = venueCity.value;
  }

  if (value.competitionKind !== undefined) {
    if (
      value.competitionKind !== "cup" &&
      value.competitionKind !== "friendly" &&
      value.competitionKind !== "league" &&
      value.competitionKind !== "other"
    ) {
      return failure(
        "INVALID_FIELD",
        'matchContext.metrics.competitionKind must be "cup"|"friendly"|"league"|"other".',
        "matchContext.metrics.competitionKind",
      );
    }

    metrics.competitionKind = value.competitionKind;
  }

  const competitionTypeLabel = parseOptionalNonEmptyString(
    value.competitionTypeLabel,
    "matchContext.metrics.competitionTypeLabel",
  );

  if (!competitionTypeLabel.ok) {
    return competitionTypeLabel;
  }

  if (competitionTypeLabel.value !== undefined) {
    metrics.competitionTypeLabel = competitionTypeLabel.value;
  }

  if (value.isKnockout !== undefined) {
    if (typeof value.isKnockout !== "boolean") {
      return failure(
        "INVALID_FIELD",
        "matchContext.metrics.isKnockout must be a boolean when present.",
        "matchContext.metrics.isKnockout",
      );
    }

    metrics.isKnockout = value.isKnockout;
  }

  const roundLabel = parseOptionalNonEmptyString(
    value.roundLabel,
    "matchContext.metrics.roundLabel",
  );

  if (!roundLabel.ok) {
    return roundLabel;
  }

  if (roundLabel.value !== undefined) {
    metrics.roundLabel = roundLabel.value;
  }

  if (value.leg !== undefined) {
    if (value.leg !== "first" && value.leg !== "second") {
      return failure(
        "INVALID_FIELD",
        'matchContext.metrics.leg must be "first" or "second".',
        "matchContext.metrics.leg",
      );
    }

    metrics.leg = value.leg;
  }

  const aggregateScore = parseOptionalNonEmptyString(
    value.aggregateScore,
    "matchContext.metrics.aggregateScore",
  );

  if (!aggregateScore.ok) {
    return aggregateScore;
  }

  if (aggregateScore.value !== undefined) {
    metrics.aggregateScore = aggregateScore.value;
  }

  if (Object.keys(metrics).length === 0) {
    return failure(
      "INVALID_FIELD",
      "matchContext.metrics must include at least one provider metric.",
      "matchContext.metrics",
    );
  }

  return success(Object.freeze(metrics));
}

function parseMatchContext(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): Result<readonly Evidence[], EvidenceNormalizationError> {
  if (!Array.isArray(value)) {
    return failure(
      "INVALID_FIELD",
      "matchContext must be an array.",
      "matchContext",
    );
  }

  const records: Evidence[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        "matchContext entry must be an object.",
        "matchContext",
      );
    }

    const teamSide = requireTeamSide(entry.teamSide);

    if (teamSide === undefined) {
      return failure(
        "INVALID_FIELD",
        'matchContext.teamSide must be "home" or "away".',
        "matchContext.teamSide",
      );
    }

    if (typeof entry.teamId !== "string" || entry.teamId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "matchContext.teamId must be a non-empty string.",
        "matchContext.teamId",
      );
    }

    if (typeof entry.teamName !== "string" || entry.teamName.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "matchContext.teamName must be a non-empty string.",
        "matchContext.teamName",
      );
    }

    if (
      typeof entry.observedAt !== "string" ||
      entry.observedAt.trim().length === 0
    ) {
      return failure(
        "INVALID_FIELD",
        "matchContext.observedAt must be a non-empty string.",
        "matchContext.observedAt",
      );
    }

    const metrics = parseMatchContextMetrics(entry.metrics);

    if (!metrics.ok) {
      return metrics;
    }

    const provenanceOverlay = parseProviderProvenanceOverlay(entry);

    if (!provenanceOverlay.ok) {
      return provenanceOverlay;
    }

    const provenance = provenanceOverlay.value;
    const source = provenance?.source ?? "fixture";
    const sourceId =
      provenance?.sourceId ?? `fixture-${matchId}-context-${teamSide}`;
    const method = provenance?.method ?? "fixture";

    try {
      records.push(
        createEvidence({
          id: `evidence-${source}-${matchId}-context-${teamSide}`,
          source,
          sourceId,
          type: "MATCH_CONTEXT",
          matchId: createMatchId(matchId),
          collectedAt,
          eventTime,
          timestamp: collectedAt,
          freshness: "fresh",
          confidence: source === "api-football" ? "medium" : "unknown",
          quality: "unverified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method,
          },
          payload: Object.freeze({
            teamId: entry.teamId.trim(),
            teamName: entry.teamName.trim(),
            teamSide,
            contextType: "match_context",
            ...(typeof entry.matchId === "string" && entry.matchId.trim().length > 0
              ? { matchId: entry.matchId.trim() }
              : { matchId }),
            ...(typeof entry.competitionId === "string" &&
            entry.competitionId.trim().length > 0
              ? { competitionId: entry.competitionId.trim() }
              : {}),
            ...(typeof entry.competitionName === "string" &&
            entry.competitionName.trim().length > 0
              ? { competitionName: entry.competitionName.trim() }
              : {}),
            ...(typeof entry.season === "string" && entry.season.trim().length > 0
              ? { season: entry.season.trim() }
              : typeof entry.season === "number" && Number.isFinite(entry.season)
                ? { season: String(entry.season) }
                : {}),
            metrics: metrics.value,
            observedAt: entry.observedAt.trim(),
          }),
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof EvidenceValidationError ||
        error instanceof MatchValidationError
      ) {
        return failure("DOMAIN_VALIDATION_FAILED", error.message);
      }

      return failure(
        "UNEXPECTED_ERROR",
        "MATCH_CONTEXT evidence normalization failed unexpectedly.",
      );
    }
  }

  return success(Object.freeze(records));
}

type ClubIntelligenceWindow = "current" | "season";

function isClubIntelligenceWindow(value: unknown): value is ClubIntelligenceWindow {
  return value === "season" || value === "current";
}

function parseClubIntelligenceMetrics(
  value: unknown,
): Result<Readonly<Record<string, number | string>>, EvidenceNormalizationError> {
  if (value === undefined) {
    return failure(
      "INVALID_FIELD",
      "clubIntelligence.metrics is required when a record is present.",
      "clubIntelligence.metrics",
    );
  }

  if (!isRecord(value)) {
    return failure(
      "INVALID_FIELD",
      "clubIntelligence.metrics must be an object.",
      "clubIntelligence.metrics",
    );
  }

  const numberFields = [
    "leagueRank",
    "leaguePoints",
    "goalDifference",
    "goalsScored",
    "goalsConceded",
    "wins",
    "draws",
    "losses",
    "played",
    "homePlayed",
    "homeWins",
    "homeDraws",
    "homeLosses",
    "homeGoalsScored",
    "homeGoalsConceded",
    "awayPlayed",
    "awayWins",
    "awayDraws",
    "awayLosses",
    "awayGoalsScored",
    "awayGoalsConceded",
    "managerTenureDays",
  ] as const;

  const stringFields = [
    "currentForm",
    "promotionRelegationStatus",
    "managerName",
    "managerStartDate",
  ] as const;

  const metrics: { [key: string]: number | string } = {};

  for (const field of numberFields) {
    const parsed = parseOptionalFiniteNumber(
      value[field],
      `clubIntelligence.metrics.${field}`,
    );

    if (!parsed.ok) {
      return parsed;
    }

    if (parsed.value !== undefined) {
      metrics[field] = parsed.value;
    }
  }

  for (const field of stringFields) {
    if (value[field] === undefined) {
      continue;
    }

    if (typeof value[field] !== "string" || value[field].trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        `clubIntelligence.metrics.${field} must be a non-empty string when present.`,
        `clubIntelligence.metrics.${field}`,
      );
    }

    metrics[field] = value[field].trim();
  }

  if (Object.keys(metrics).length === 0) {
    return failure(
      "INVALID_FIELD",
      "clubIntelligence.metrics must include at least one provider metric.",
      "clubIntelligence.metrics",
    );
  }

  return success(Object.freeze(metrics));
}

/**
 * L1A: optional Club Intelligence Evidence records.
 * Absent array → honest absence. Never invent standings or manager facts.
 */
function parseClubIntelligence(
  value: unknown,
  matchId: string,
  collectedAt: string,
  eventTime: string,
): Result<readonly Evidence[], EvidenceNormalizationError> {
  if (!Array.isArray(value)) {
    return failure(
      "INVALID_FIELD",
      "clubIntelligence must be an array.",
      "clubIntelligence",
    );
  }

  const records: Evidence[] = [];

  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)) {
      return failure(
        "INVALID_FIELD",
        "clubIntelligence entry must be an object.",
        "clubIntelligence",
      );
    }

    const teamSide = requireTeamSide(entry.teamSide);
    if (teamSide === undefined) {
      return failure(
        "INVALID_FIELD",
        'clubIntelligence.teamSide must be "home" or "away".',
        "clubIntelligence.teamSide",
      );
    }

    if (typeof entry.teamId !== "string" || entry.teamId.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "clubIntelligence.teamId must be a non-empty string.",
        "clubIntelligence.teamId",
      );
    }

    if (typeof entry.teamName !== "string" || entry.teamName.trim().length === 0) {
      return failure(
        "INVALID_FIELD",
        "clubIntelligence.teamName must be a non-empty string.",
        "clubIntelligence.teamName",
      );
    }

    if (!isClubIntelligenceWindow(entry.window)) {
      return failure(
        "INVALID_FIELD",
        'clubIntelligence.window must be "season" or "current".',
        "clubIntelligence.window",
      );
    }

    if (
      typeof entry.observedAt !== "string" ||
      entry.observedAt.trim().length === 0
    ) {
      return failure(
        "INVALID_FIELD",
        "clubIntelligence.observedAt must be a non-empty string.",
        "clubIntelligence.observedAt",
      );
    }

    const metrics = parseClubIntelligenceMetrics(entry.metrics);
    if (!metrics.ok) {
      return metrics;
    }

    const providerSource =
      typeof entry.providerSource === "string" &&
      entry.providerSource.trim().length > 0
        ? entry.providerSource.trim()
        : "api-football";
    const providerSourceId =
      typeof entry.providerSourceId === "string" &&
      entry.providerSourceId.trim().length > 0
        ? entry.providerSourceId.trim()
        : `club-intelligence:${matchId}:${teamSide}:${String(index)}`;
    const providerMethod =
      typeof entry.providerMethod === "string" &&
      entry.providerMethod.trim().length > 0
        ? entry.providerMethod.trim()
        : "fixture";

    try {
      records.push(
        createEvidence({
          id: `evidence:${matchId}:club-intelligence:${teamSide}:${entry.window}:${String(index)}`,
          source: providerSource,
          sourceId: providerSourceId,
          type: "CLUB_INTELLIGENCE",
          matchId: createMatchId(matchId),
          collectedAt,
          eventTime,
          freshness: "fresh",
          quality: "verified",
          provenance: {
            collector: "@fas/evidence-normalizer",
            method: providerMethod,
          },
          payload: Object.freeze({
            teamId: entry.teamId.trim(),
            teamName: entry.teamName.trim(),
            teamSide,
            window: entry.window,
            ...(typeof entry.competitionId === "string" &&
            entry.competitionId.trim().length > 0
              ? { competitionId: entry.competitionId.trim() }
              : {}),
            ...(typeof entry.competitionName === "string" &&
            entry.competitionName.trim().length > 0
              ? { competitionName: entry.competitionName.trim() }
              : {}),
            ...(typeof entry.season === "string" && entry.season.trim().length > 0
              ? { season: entry.season.trim() }
              : typeof entry.season === "number" && Number.isFinite(entry.season)
                ? { season: String(entry.season) }
                : {}),
            metrics: metrics.value,
            observedAt: entry.observedAt.trim(),
          }),
        }),
      );
    } catch (error: unknown) {
      if (
        error instanceof EvidenceValidationError ||
        error instanceof MatchValidationError
      ) {
        return failure("DOMAIN_VALIDATION_FAILED", error.message);
      }

      return failure(
        "UNEXPECTED_ERROR",
        "CLUB_INTELLIGENCE evidence normalization failed unexpectedly.",
      );
    }
  }

  return success(Object.freeze(records));
}
