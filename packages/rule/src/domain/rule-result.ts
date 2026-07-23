import { createMatchId, type MatchId } from "@fas/match";

export type RuleId =
  | "rule:attack-efficiency-away-edge:v1"
  | "rule:attack-efficiency-home-edge:v1"
  | "rule:attack-strength-edge:v1"
  | "rule:attack-strength-edge-away:v1"
  | "rule:availability-away-hit:v1"
  | "rule:availability-away-unknown:v1"
  | "rule:availability-home-hit:v1"
  | "rule:availability-home-unknown:v1"
  | "rule:away-attack-edge:v1"
  | "rule:away-team-present:v1"
  | "rule:away-venue-form-edge:v1"
  | "rule:chance-creation-away-edge:v1"
  | "rule:chance-creation-home-edge:v1"
  | "rule:club-strength-edge:v1"
  | "rule:club-strength-edge-away:v1"
  | "rule:defense-away-fragile:v1"
  | "rule:defense-away-stable:v1"
  | "rule:defense-home-fragile:v1"
  | "rule:defense-home-stable:v1"
  | "rule:defense-strength-edge:v1"
  | "rule:defense-strength-edge-away:v1"
  | "rule:discipline-away-risk:v1"
  | "rule:discipline-home-risk:v1"
  | "rule:fatigue-away:v1"
  | "rule:fatigue-home:v1"
  | "rule:form-away-superior:v1"
  | "rule:form-home-superior:v1"
  | "rule:form-near-parity:v1"
  | "rule:form-strength-edge:v1"
  | "rule:form-strength-edge-away:v1"
  | "rule:goals-scored-away-edge:v1"
  | "rule:goals-scored-home-edge:v1"
  | "rule:h2h-supports-away:v1"
  | "rule:h2h-supports-home:v1"
  | "rule:home-advantage-material:v1"
  | "rule:home-attack-edge:v1"
  | "rule:home-stability:v1"
  | "rule:home-team-present:v1"
  | "rule:home-venue-form-edge:v1"
  | "rule:kickoff-present:v1"
  | "rule:knockout-context:v1"
  | "rule:league-strength-edge:v1"
  | "rule:league-strength-edge-away:v1"
  | "rule:manager-stability:v1"
  | "rule:manager-stability-away:v1"
  | "rule:market-ah-lean-away:v1"
  | "rule:market-ah-lean-home:v1"
  | "rule:market-consensus:v1"
  | "rule:market-lean-away:v1"
  | "rule:market-lean-home:v1"
  | "rule:market-volatility:v1"
  | "rule:reverse-line-movement:v1"
  | "rule:sharp-support:v1"
  | "rule:steam-move:v1"
  | "rule:momentum-away:v1"
  | "rule:momentum-home:v1"
  | "rule:possession-away-edge:v1"
  | "rule:possession-home-edge:v1"
  | "rule:rest-advantage-away:v1"
  | "rule:rest-advantage-home:v1"
  | "rule:rotation-pressure:v1"
  | "rule:signals-aligned-away:v1"
  | "rule:signals-aligned-home:v1"
  | "rule:venue-supports-home:v1"
  | "rule:venue-unavailable:v1"
  | "rule:xg-attack-away-edge:v1"
  | "rule:xg-attack-home-edge:v1"
  | "rule:xg-defensive-away-edge:v1"
  | "rule:xg-defensive-edge:v1"
  | "rule:xg-dominance-away:v1"
  | "rule:xg-dominance:v1";

export type RuleName =
  | "AVAILABILITY_AWAY_HIT"
  | "AVAILABILITY_AWAY_UNKNOWN"
  | "AVAILABILITY_HOME_HIT"
  | "AVAILABILITY_HOME_UNKNOWN"
  | "ATTACK_EFFICIENCY_AWAY_EDGE"
  | "ATTACK_EFFICIENCY_HOME_EDGE"
  | "ATTACK_STRENGTH_EDGE"
  | "ATTACK_STRENGTH_EDGE_AWAY"
  | "AWAY_ATTACK_EDGE"
  | "AWAY_TEAM_PRESENT"
  | "AWAY_VENUE_FORM_EDGE"
  | "CHANCE_CREATION_AWAY_EDGE"
  | "CHANCE_CREATION_HOME_EDGE"
  | "CLUB_STRENGTH_EDGE"
  | "CLUB_STRENGTH_EDGE_AWAY"
  | "DEFENSE_AWAY_FRAGILE"
  | "DEFENSE_AWAY_STABLE"
  | "DEFENSE_HOME_FRAGILE"
  | "DEFENSE_HOME_STABLE"
  | "DEFENSE_STRENGTH_EDGE"
  | "DEFENSE_STRENGTH_EDGE_AWAY"
  | "DISCIPLINE_AWAY_RISK"
  | "DISCIPLINE_HOME_RISK"
  | "FATIGUE_AWAY"
  | "FATIGUE_HOME"
  | "FORM_AWAY_SUPERIOR"
  | "FORM_HOME_SUPERIOR"
  | "FORM_NEAR_PARITY"
  | "FORM_STRENGTH_EDGE"
  | "FORM_STRENGTH_EDGE_AWAY"
  | "GOALS_SCORED_AWAY_EDGE"
  | "GOALS_SCORED_HOME_EDGE"
  | "H2H_SUPPORTS_AWAY"
  | "H2H_SUPPORTS_HOME"
  | "HOME_ADVANTAGE_MATERIAL"
  | "HOME_ATTACK_EDGE"
  | "HOME_STABILITY"
  | "HOME_TEAM_PRESENT"
  | "HOME_VENUE_FORM_EDGE"
  | "KICKOFF_PRESENT"
  | "KNOCKOUT_CONTEXT"
  | "LEAGUE_STRENGTH_EDGE"
  | "LEAGUE_STRENGTH_EDGE_AWAY"
  | "MANAGER_STABILITY"
  | "MANAGER_STABILITY_AWAY"
  | "MARKET_AH_LEAN_AWAY"
  | "MARKET_AH_LEAN_HOME"
  | "MARKET_CONSENSUS"
  | "MARKET_LEAN_AWAY"
  | "MARKET_LEAN_HOME"
  | "MARKET_VOLATILITY"
  | "REVERSE_LINE_MOVEMENT"
  | "SHARP_SUPPORT"
  | "STEAM_MOVE"
  | "MOMENTUM_AWAY"
  | "MOMENTUM_HOME"
  | "POSSESSION_AWAY_EDGE"
  | "POSSESSION_HOME_EDGE"
  | "REST_ADVANTAGE_AWAY"
  | "REST_ADVANTAGE_HOME"
  | "ROTATION_PRESSURE"
  | "SIGNALS_ALIGNED_AWAY"
  | "SIGNALS_ALIGNED_HOME"
  | "VENUE_SUPPORTS_HOME"
  | "VENUE_UNAVAILABLE"
  | "XG_ATTACK_AWAY_EDGE"
  | "XG_ATTACK_HOME_EDGE"
  | "XG_DEFENSIVE_AWAY_EDGE"
  | "XG_DEFENSIVE_EDGE"
  | "XG_DOMINANCE"
  | "XG_DOMINANCE_AWAY";

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
  "rule:attack-efficiency-away-edge:v1",
  "rule:attack-efficiency-home-edge:v1",
  "rule:attack-strength-edge:v1",
  "rule:attack-strength-edge-away:v1",
  "rule:availability-away-hit:v1",
  "rule:availability-away-unknown:v1",
  "rule:availability-home-hit:v1",
  "rule:availability-home-unknown:v1",
  "rule:away-attack-edge:v1",
  "rule:away-team-present:v1",
  "rule:away-venue-form-edge:v1",
  "rule:chance-creation-away-edge:v1",
  "rule:chance-creation-home-edge:v1",
  "rule:club-strength-edge:v1",
  "rule:club-strength-edge-away:v1",
  "rule:defense-away-fragile:v1",
  "rule:defense-away-stable:v1",
  "rule:defense-home-fragile:v1",
  "rule:defense-home-stable:v1",
  "rule:defense-strength-edge:v1",
  "rule:defense-strength-edge-away:v1",
  "rule:discipline-away-risk:v1",
  "rule:discipline-home-risk:v1",
  "rule:fatigue-away:v1",
  "rule:fatigue-home:v1",
  "rule:form-away-superior:v1",
  "rule:form-home-superior:v1",
  "rule:form-near-parity:v1",
  "rule:form-strength-edge:v1",
  "rule:form-strength-edge-away:v1",
  "rule:goals-scored-away-edge:v1",
  "rule:goals-scored-home-edge:v1",
  "rule:h2h-supports-away:v1",
  "rule:h2h-supports-home:v1",
  "rule:home-advantage-material:v1",
  "rule:home-attack-edge:v1",
  "rule:home-stability:v1",
  "rule:home-team-present:v1",
  "rule:home-venue-form-edge:v1",
  "rule:kickoff-present:v1",
  "rule:knockout-context:v1",
  "rule:league-strength-edge:v1",
  "rule:league-strength-edge-away:v1",
  "rule:manager-stability:v1",
  "rule:manager-stability-away:v1",
  "rule:market-ah-lean-away:v1",
  "rule:market-ah-lean-home:v1",
  "rule:market-consensus:v1",
  "rule:market-lean-away:v1",
  "rule:market-lean-home:v1",
  "rule:market-volatility:v1",
  "rule:reverse-line-movement:v1",
  "rule:sharp-support:v1",
  "rule:steam-move:v1",
  "rule:momentum-away:v1",
  "rule:momentum-home:v1",
  "rule:possession-away-edge:v1",
  "rule:possession-home-edge:v1",
  "rule:rest-advantage-away:v1",
  "rule:rest-advantage-home:v1",
  "rule:rotation-pressure:v1",
  "rule:signals-aligned-away:v1",
  "rule:signals-aligned-home:v1",
  "rule:venue-supports-home:v1",
  "rule:venue-unavailable:v1",
  "rule:xg-attack-away-edge:v1",
  "rule:xg-attack-home-edge:v1",
  "rule:xg-defensive-away-edge:v1",
  "rule:xg-defensive-edge:v1",
  "rule:xg-dominance-away:v1",
  "rule:xg-dominance:v1",
]);
const ruleNames: ReadonlySet<string> = new Set([
  "ATTACK_EFFICIENCY_AWAY_EDGE",
  "ATTACK_EFFICIENCY_HOME_EDGE",
  "ATTACK_STRENGTH_EDGE",
  "ATTACK_STRENGTH_EDGE_AWAY",
  "AVAILABILITY_AWAY_HIT",
  "AVAILABILITY_AWAY_UNKNOWN",
  "AVAILABILITY_HOME_HIT",
  "AVAILABILITY_HOME_UNKNOWN",
  "AWAY_ATTACK_EDGE",
  "AWAY_TEAM_PRESENT",
  "AWAY_VENUE_FORM_EDGE",
  "CHANCE_CREATION_AWAY_EDGE",
  "CHANCE_CREATION_HOME_EDGE",
  "CLUB_STRENGTH_EDGE",
  "CLUB_STRENGTH_EDGE_AWAY",
  "DEFENSE_AWAY_FRAGILE",
  "DEFENSE_AWAY_STABLE",
  "DEFENSE_HOME_FRAGILE",
  "DEFENSE_HOME_STABLE",
  "DEFENSE_STRENGTH_EDGE",
  "DEFENSE_STRENGTH_EDGE_AWAY",
  "DISCIPLINE_AWAY_RISK",
  "DISCIPLINE_HOME_RISK",
  "FATIGUE_AWAY",
  "FATIGUE_HOME",
  "FORM_AWAY_SUPERIOR",
  "FORM_HOME_SUPERIOR",
  "FORM_NEAR_PARITY",
  "FORM_STRENGTH_EDGE",
  "FORM_STRENGTH_EDGE_AWAY",
  "GOALS_SCORED_AWAY_EDGE",
  "GOALS_SCORED_HOME_EDGE",
  "H2H_SUPPORTS_AWAY",
  "H2H_SUPPORTS_HOME",
  "HOME_ADVANTAGE_MATERIAL",
  "HOME_ATTACK_EDGE",
  "HOME_STABILITY",
  "HOME_TEAM_PRESENT",
  "HOME_VENUE_FORM_EDGE",
  "KICKOFF_PRESENT",
  "KNOCKOUT_CONTEXT",
  "LEAGUE_STRENGTH_EDGE",
  "LEAGUE_STRENGTH_EDGE_AWAY",
  "MANAGER_STABILITY",
  "MANAGER_STABILITY_AWAY",
  "MARKET_AH_LEAN_AWAY",
  "MARKET_AH_LEAN_HOME",
  "MARKET_CONSENSUS",
  "MARKET_LEAN_AWAY",
  "MARKET_LEAN_HOME",
  "MARKET_VOLATILITY",
  "REVERSE_LINE_MOVEMENT",
  "SHARP_SUPPORT",
  "STEAM_MOVE",
  "MOMENTUM_AWAY",
  "MOMENTUM_HOME",
  "POSSESSION_AWAY_EDGE",
  "POSSESSION_HOME_EDGE",
  "REST_ADVANTAGE_AWAY",
  "REST_ADVANTAGE_HOME",
  "ROTATION_PRESSURE",
  "SIGNALS_ALIGNED_AWAY",
  "SIGNALS_ALIGNED_HOME",
  "VENUE_SUPPORTS_HOME",
  "VENUE_UNAVAILABLE",
  "XG_ATTACK_AWAY_EDGE",
  "XG_ATTACK_HOME_EDGE",
  "XG_DEFENSIVE_AWAY_EDGE",
  "XG_DEFENSIVE_EDGE",
  "XG_DOMINANCE",
  "XG_DOMINANCE_AWAY",
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
