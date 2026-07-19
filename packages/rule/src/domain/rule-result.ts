import { createMatchId, type MatchId } from "@fas/match";

export type RuleId =
  | "rule:away-attack-edge:v1"
  | "rule:away-team-present:v1"
  | "rule:home-advantage-material:v1"
  | "rule:home-attack-edge:v1"
  | "rule:home-team-present:v1"
  | "rule:kickoff-present:v1"
  | "rule:momentum-away:v1"
  | "rule:momentum-home:v1";

export type RuleName =
  | "AWAY_ATTACK_EDGE"
  | "AWAY_TEAM_PRESENT"
  | "HOME_ADVANTAGE_MATERIAL"
  | "HOME_ATTACK_EDGE"
  | "HOME_TEAM_PRESENT"
  | "KICKOFF_PRESENT"
  | "MOMENTUM_AWAY"
  | "MOMENTUM_HOME";

export type RuleStatus = "FAIL" | "INAPPLICABLE" | "PASS";

export type RuleChannel = "away+" | "home+" | "none";

export interface RuleResult {
  readonly ruleId: RuleId;
  readonly matchId: MatchId;
  readonly ruleName: RuleName;
  readonly status: RuleStatus;
  readonly score: number;
  readonly weight: number;
  readonly channel: RuleChannel;
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
  readonly weight?: number;
  readonly channel?: string;
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
  "rule:away-attack-edge:v1",
  "rule:away-team-present:v1",
  "rule:home-advantage-material:v1",
  "rule:home-attack-edge:v1",
  "rule:home-team-present:v1",
  "rule:kickoff-present:v1",
  "rule:momentum-away:v1",
  "rule:momentum-home:v1",
]);
const ruleNames: ReadonlySet<string> = new Set([
  "AWAY_ATTACK_EDGE",
  "AWAY_TEAM_PRESENT",
  "HOME_ADVANTAGE_MATERIAL",
  "HOME_ATTACK_EDGE",
  "HOME_TEAM_PRESENT",
  "KICKOFF_PRESENT",
  "MOMENTUM_AWAY",
  "MOMENTUM_HOME",
]);
const ruleStatuses: ReadonlySet<string> = new Set(["FAIL", "INAPPLICABLE", "PASS"]);
const ruleChannels: ReadonlySet<string> = new Set(["away+", "home+", "none"]);
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

function requireWeight(value: number | undefined): number {
  const weight = value ?? 1;

  if (!Number.isFinite(weight) || weight < 0) {
    throw new RuleResultValidationError("weight must be a finite number ≥ 0.");
  }

  return weight;
}

function requireScore(value: number, status: RuleStatus, weight: number): number {
  const expectedScore = status === "PASS" ? weight : 0;

  if (!Number.isFinite(value) || Math.abs(value - expectedScore) > 1e-12) {
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
  const weight = requireWeight(input.weight);
  const channel = requireAllowedValue<RuleChannel>(
    input.channel ?? "none",
    ruleChannels,
    "channel",
  );

  return Object.freeze({
    ruleId: requireAllowedValue<RuleId>(input.ruleId, ruleIds, "ruleId"),
    matchId: createMatchId(input.matchId),
    ruleName: requireAllowedValue<RuleName>(input.ruleName, ruleNames, "ruleName"),
    status,
    score: requireScore(input.score, status, weight),
    weight,
    channel,
    explanation: requireNonEmpty(input.explanation, "explanation"),
    sourceFeatureIds: freezeSourceFeatureIds(input.sourceFeatureIds),
    evaluatedAt: requireTimestamp(input.evaluatedAt),
  });
}
