import { createMatchId, type MatchId } from "@fas/match";

export type RuleId =
  | "rule:away-team-present:v1"
  | "rule:home-team-present:v1"
  | "rule:kickoff-present:v1";

export type RuleName = "AWAY_TEAM_PRESENT" | "HOME_TEAM_PRESENT" | "KICKOFF_PRESENT";

export type RuleStatus = "FAIL" | "PASS";

export interface RuleResult {
  readonly ruleId: RuleId;
  readonly matchId: MatchId;
  readonly ruleName: RuleName;
  readonly status: RuleStatus;
  readonly score: number;
  readonly explanation: string;
  readonly sourceFeatureIds: readonly string[];
  readonly evaluatedAt: string;
}

export interface CreateRuleResultInput {
  readonly ruleId: string;
  readonly matchId: MatchId;
  readonly ruleName: string;
  readonly status: string;
  readonly score: number;
  readonly explanation: string;
  readonly sourceFeatureIds: readonly string[];
  readonly evaluatedAt: string;
}

export class RuleResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleResultValidationError";
  }
}

const ruleIds: ReadonlySet<string> = new Set([
  "rule:away-team-present:v1",
  "rule:home-team-present:v1",
  "rule:kickoff-present:v1",
]);
const ruleNames: ReadonlySet<string> = new Set([
  "AWAY_TEAM_PRESENT",
  "HOME_TEAM_PRESENT",
  "KICKOFF_PRESENT",
]);
const ruleStatuses: ReadonlySet<string> = new Set(["FAIL", "PASS"]);
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new RuleResultValidationError(`${field} must not be empty.`);
  }

  return normalized;
}

function requireAllowedValue<T extends string>(
  value: string,
  allowedValues: ReadonlySet<string>,
  field: string,
): T {
  if (!allowedValues.has(value)) {
    throw new RuleResultValidationError(`${field} is invalid.`);
  }

  return value as T;
}

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new RuleResultValidationError(
      "evaluatedAt must be a valid ISO 8601 timestamp.",
    );
  }

  return value;
}

function requireScore(value: number, status: RuleStatus): number {
  const expectedScore = status === "PASS" ? 1 : 0;

  if (!Number.isFinite(value) || value !== expectedScore) {
    throw new RuleResultValidationError(
      `score must be ${expectedScore} when status is ${status}.`,
    );
  }

  return value;
}

function freezeSourceFeatureIds(values: readonly string[]): readonly string[] {
  const normalized = values.map((value) =>
    requireNonEmpty(value, "sourceFeatureIds"),
  );

  if (new Set(normalized).size !== normalized.length) {
    throw new RuleResultValidationError(
      "sourceFeatureIds must not contain duplicates.",
    );
  }

  return Object.freeze(normalized);
}

export function createRuleResult(input: CreateRuleResultInput): RuleResult {
  const status = requireAllowedValue<RuleStatus>(
    input.status,
    ruleStatuses,
    "status",
  );

  return Object.freeze({
    ruleId: requireAllowedValue<RuleId>(input.ruleId, ruleIds, "ruleId"),
    matchId: createMatchId(input.matchId),
    ruleName: requireAllowedValue<RuleName>(input.ruleName, ruleNames, "ruleName"),
    status,
    score: requireScore(input.score, status),
    explanation: requireNonEmpty(input.explanation, "explanation"),
    sourceFeatureIds: freezeSourceFeatureIds(input.sourceFeatureIds),
    evaluatedAt: requireTimestamp(input.evaluatedAt),
  });
}
