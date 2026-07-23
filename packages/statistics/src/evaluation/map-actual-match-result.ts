import {
  type ActualMatchResult,
  createActualMatchResult,
  type MatchWinner,
  ActualMatchResultValidationError,
} from "../domain/actual-match-result.js";

export class ActualMatchResultMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActualMatchResultMappingError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asWinner(value: unknown): MatchWinner | undefined {
  return value === "home" || value === "draw" || value === "away"
    ? value
    : undefined;
}

/**
 * Maps MATCH_RESULT Evidence (or equivalent payload) into ActualMatchResult.
 * Returns undefined when Evidence is absent — honest pre-match absence.
 */
export function mapActualMatchResultFromEvidence(
  evidence: Readonly<{
    type: string;
    matchId?: string;
    providerId: string;
    sourceId: string;
    provenance: Readonly<{ method: string }>;
    payload: unknown;
  }>,
): ActualMatchResult | undefined {
  if (evidence.type !== "MATCH_RESULT") {
    return undefined;
  }

  if (evidence.matchId === undefined || evidence.matchId.trim().length === 0) {
    throw new ActualMatchResultMappingError(
      "MATCH_RESULT Evidence must reference a MatchId.",
    );
  }

  if (!isRecord(evidence.payload)) {
    throw new ActualMatchResultMappingError(
      "MATCH_RESULT payload must be an object.",
    );
  }

  const winner = asWinner(evidence.payload.winner);

  if (winner === undefined) {
    throw new ActualMatchResultMappingError(
      "MATCH_RESULT payload.winner is invalid.",
    );
  }

  try {
    return createActualMatchResult({
      matchId: evidence.matchId,
      homeGoals: evidence.payload.homeGoals as number,
      awayGoals: evidence.payload.awayGoals as number,
      winner,
      totalGoals: evidence.payload.totalGoals as number,
      ...(typeof evidence.payload.competitionId === "string"
        ? { competitionId: evidence.payload.competitionId }
        : {}),
      ...(typeof evidence.payload.competitionName === "string"
        ? { competitionName: evidence.payload.competitionName }
        : {}),
      matchStatus: "FINISHED",
      providerId: evidence.providerId,
      providerSourceId: evidence.sourceId,
      providerMethod: evidence.provenance.method,
      observedAt:
        typeof evidence.payload.observedAt === "string"
          ? evidence.payload.observedAt
          : "",
    });
  } catch (error: unknown) {
    if (error instanceof ActualMatchResultValidationError) {
      throw new ActualMatchResultMappingError(error.message);
    }

    throw error;
  }
}

export function findActualMatchResult(
  evidences: readonly Readonly<{
    type: string;
    matchId?: string;
    providerId: string;
    sourceId: string;
    provenance: Readonly<{ method: string }>;
    payload: unknown;
  }>[],
): ActualMatchResult | undefined {
  const matchResult = evidences.find((item) => item.type === "MATCH_RESULT");

  if (matchResult === undefined) {
    return undefined;
  }

  return mapActualMatchResultFromEvidence(matchResult);
}
