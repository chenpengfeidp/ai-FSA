import {
  createEvidence,
  type Evidence,
  EvidenceValidationError,
} from "@fas/evidence";
import { createMatchId, MatchValidationError } from "@fas/match";

export type Result<Value, Failure> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ error: Failure; ok: false }>;

export type EvidenceNormalizationErrorCode =
  | "DOMAIN_VALIDATION_FAILED"
  | "INVALID_FIELD"
  | "INVALID_INPUT"
  | "UNEXPECTED_ERROR";

export interface EvidenceNormalizationError {
  readonly code: EvidenceNormalizationErrorCode;
  readonly message: string;
  readonly field?: string;
}

export interface FixtureEvidenceContext {
  readonly evidenceId: string;
  readonly sourceId: string;
  readonly collectedAt: string;
}

export type EvidenceNormalizationResult = Result<
  Evidence,
  EvidenceNormalizationError
>;

interface FixtureMatchInfo {
  readonly matchId: string;
  readonly home: string;
  readonly away: string;
  readonly kickoff: string;
}

const fixtureFields = ["matchId", "home", "away", "kickoff"] as const;
type FixtureField = (typeof fixtureFields)[number];

function success<Value>(value: Value): Readonly<{ ok: true; value: Value }> {
  return Object.freeze({ ok: true, value });
}

function failure(
  code: EvidenceNormalizationErrorCode,
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

function parseFixtureInput(
  input: unknown,
): Result<FixtureMatchInfo, EvidenceNormalizationError> {
  if (!isRecord(input)) {
    return failure("INVALID_INPUT", "Fixture evidence input must be an object.");
  }

  const values: Partial<Record<FixtureField, string>> = {};

  for (const field of fixtureFields) {
    const value = input[field];

    if (typeof value !== "string" || value.trim().length === 0) {
      return failure("INVALID_FIELD", `${field} must be a non-empty string.`, field);
    }

    values[field] = value;
  }

  return success(
    Object.freeze({
      matchId: values.matchId as string,
      home: values.home as string,
      away: values.away as string,
      kickoff: values.kickoff as string,
    }),
  );
}

export function normalizeFixtureEvidence(
  input: unknown,
  context: FixtureEvidenceContext,
): EvidenceNormalizationResult {
  try {
    const parsed = parseFixtureInput(input);

    if (!parsed.ok) {
      return parsed;
    }

    const raw = parsed.value;
    const evidence = createEvidence({
      id: context.evidenceId,
      source: "fixture",
      sourceId: context.sourceId,
      type: "MATCH_INFO",
      matchId: createMatchId(raw.matchId),
      collectedAt: context.collectedAt,
      eventTime: raw.kickoff,
      freshness: "fresh",
      quality: "unverified",
      provenance: {
        collector: "@fas/evidence-normalizer",
        method: "fixture",
      },
      payload: {
        home: raw.home,
        away: raw.away,
        kickoff: raw.kickoff,
      },
    });

    return success(evidence);
  } catch (error: unknown) {
    if (
      error instanceof EvidenceValidationError ||
      error instanceof MatchValidationError
    ) {
      return failure("DOMAIN_VALIDATION_FAILED", error.message);
    }

    return failure(
      "UNEXPECTED_ERROR",
      "Fixture evidence normalization failed unexpectedly.",
    );
  }
}
