export type MatchWinner = "away" | "draw" | "home";

export type ActualMatchStatus = "FINISHED";

/**
 * Canonical actual match outcome used by Prediction Evaluation (A1).
 * Separate from pre-match Evidence / Projection — never mutates predictions.
 */
export interface ActualMatchResult {
  readonly matchId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly winner: MatchWinner;
  readonly totalGoals: number;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly matchStatus: ActualMatchStatus;
  readonly providerId: string;
  readonly providerSourceId: string;
  readonly providerMethod: string;
  readonly observedAt: string;
}

export interface CreateActualMatchResultInput {
  readonly matchId: string;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly winner: MatchWinner;
  readonly totalGoals: number;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly matchStatus: ActualMatchStatus;
  readonly providerId: string;
  readonly providerSourceId: string;
  readonly providerMethod: string;
  readonly observedAt: string;
}

export class ActualMatchResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActualMatchResultValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new ActualMatchResultValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireNonNegativeInteger(value: number, field: string): number {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new ActualMatchResultValidationError(
      `${field} must be a non-negative integer.`,
    );
  }

  return value;
}

function winnerFromScore(homeGoals: number, awayGoals: number): MatchWinner {
  if (homeGoals > awayGoals) {
    return "home";
  }

  if (homeGoals < awayGoals) {
    return "away";
  }

  return "draw";
}

export function createActualMatchResult(
  input: CreateActualMatchResultInput,
): ActualMatchResult {
  const homeGoals = requireNonNegativeInteger(input.homeGoals, "homeGoals");
  const awayGoals = requireNonNegativeInteger(input.awayGoals, "awayGoals");
  const totalGoals = requireNonNegativeInteger(input.totalGoals, "totalGoals");
  const expectedWinner = winnerFromScore(homeGoals, awayGoals);

  if (input.winner !== expectedWinner) {
    throw new ActualMatchResultValidationError(
      "winner must match homeGoals/awayGoals.",
    );
  }

  if (totalGoals !== homeGoals + awayGoals) {
    throw new ActualMatchResultValidationError(
      "totalGoals must equal homeGoals + awayGoals.",
    );
  }

  if (input.matchStatus !== "FINISHED") {
    throw new ActualMatchResultValidationError('matchStatus must be "FINISHED".');
  }

  if (
    !isoTimestampPattern.test(input.observedAt) ||
    Number.isNaN(Date.parse(input.observedAt))
  ) {
    throw new ActualMatchResultValidationError(
      "observedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return Object.freeze({
    matchId: requireNonEmpty(input.matchId, "matchId"),
    homeGoals,
    awayGoals,
    winner: input.winner,
    totalGoals,
    ...(input.competitionId === undefined
      ? {}
      : { competitionId: requireNonEmpty(input.competitionId, "competitionId") }),
    ...(input.competitionName === undefined
      ? {}
      : {
          competitionName: requireNonEmpty(input.competitionName, "competitionName"),
        }),
    matchStatus: "FINISHED" as const,
    providerId: requireNonEmpty(input.providerId, "providerId"),
    providerSourceId: requireNonEmpty(input.providerSourceId, "providerSourceId"),
    providerMethod: requireNonEmpty(input.providerMethod, "providerMethod"),
    observedAt: input.observedAt,
  });
}
