declare const identifierKind: unique symbol;

type Identifier<Kind extends string> = string & {
  readonly [identifierKind]: Kind;
};

export type MatchId = Identifier<"MatchId">;
export type CompetitionId = Identifier<"CompetitionId">;
export type TeamId = Identifier<"TeamId">;

export type MatchStatus = "cancelled" | "completed" | "postponed" | "scheduled";

export interface Match {
  readonly id: MatchId;
  readonly competitionId: CompetitionId;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  readonly kickoffTime: string;
  readonly status: MatchStatus;
}

export interface CreateMatchInput {
  readonly id: string;
  readonly competitionId: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly kickoffTime: string;
  readonly status: string;
}

export class MatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchValidationError";
  }
}

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
const matchStatuses: ReadonlySet<string> = new Set([
  "cancelled",
  "completed",
  "postponed",
  "scheduled",
]);

function createIdentifier<Kind extends string>(
  value: string,
  field: string,
): Identifier<Kind> {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new MatchValidationError(`${field} must not be empty.`);
  }

  return normalized as Identifier<Kind>;
}

export function createMatchId(value: string): MatchId {
  return createIdentifier<"MatchId">(value, "id");
}

export function createCompetitionId(value: string): CompetitionId {
  return createIdentifier<"CompetitionId">(value, "competitionId");
}

export function createTeamId(value: string, field = "teamId"): TeamId {
  return createIdentifier<"TeamId">(value, field);
}

export function createMatchStatus(value: string): MatchStatus {
  if (!matchStatuses.has(value)) {
    throw new MatchValidationError("status is invalid.");
  }

  return value as MatchStatus;
}

function validateKickoffTime(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new MatchValidationError(
      "kickoffTime must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

export function createMatch(input: CreateMatchInput): Match {
  return Object.freeze({
    id: createMatchId(input.id),
    competitionId: createCompetitionId(input.competitionId),
    homeTeamId: createTeamId(input.homeTeamId, "homeTeamId"),
    awayTeamId: createTeamId(input.awayTeamId, "awayTeamId"),
    kickoffTime: validateKickoffTime(input.kickoffTime),
    status: createMatchStatus(input.status),
  });
}
