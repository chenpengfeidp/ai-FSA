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

  try {
    return success(
      createEvidence({
        id: `evidence-fixture-${matchId}-form-${teamSide}`,
        source: "fixture",
        sourceId: `fixture-${matchId}-form-${teamSide}`,
        type: "TEAM_FORM",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide,
          window: value.window,
          results: results.value,
          goalsFor: goalsFor.value,
          goalsAgainst: goalsAgainst.value,
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

  try {
    return success(
      createEvidence({
        id: `evidence-fixture-${matchId}-stats-${teamSide}`,
        source: "fixture",
        sourceId: `fixture-${matchId}-stats-${teamSide}`,
        type: "STATISTICS",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          teamSide,
          windowMatches: value.windowMatches,
          ...numbers,
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

  try {
    return success(
      createEvidence({
        id: `evidence-fixture-${matchId}-h2h`,
        source: "fixture",
        sourceId: `fixture-${matchId}-h2h`,
        type: "HEAD_TO_HEAD",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
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

  try {
    return success(
      createEvidence({
        id: `evidence-fixture-${matchId}-odds`,
        source: "fixture",
        sourceId: `fixture-${matchId}-odds`,
        type: "ODDS",
        matchId: createMatchId(matchId),
        collectedAt,
        eventTime,
        freshness: "fresh",
        quality: "unverified",
        provenance: {
          collector: "@fas/evidence-normalizer",
          method: "fixture",
        },
        payload: {
          homeOdds: homeOdds.value,
          drawOdds: drawOdds.value,
          awayOdds: awayOdds.value,
          observedAt: value.observedAt,
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

  return success(Object.freeze(evidences));
}
