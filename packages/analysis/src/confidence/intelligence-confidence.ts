import type { Evidence } from "@fas/evidence";
import type { FeatureBundle } from "@fas/feature";
import { createMatchId, type MatchId } from "@fas/match";
import type { RuleResult } from "@fas/rule";
import type { ScenarioSet } from "../scenario/scenario-set.js";
import { stableChecksum } from "../projection/stable-checksum.js";

export const INTELLIGENCE_CONFIDENCE_POLICY_VERSION = "confidence.mvp.a05";

export type ConfidenceBand = "high" | "low" | "medium" | "very_high";

export interface IntelligenceConfidence {
  readonly policyVersion: typeof INTELLIGENCE_CONFIDENCE_POLICY_VERSION;
  readonly matchId: MatchId;
  readonly predictionConfidence: number;
  readonly confidenceBand: ConfidenceBand;
  readonly upsetRisk: number;
  readonly evidenceCompleteness: number;
  readonly ruleAgreement: number;
  readonly limitations: readonly string[];
  readonly checksum: string;
}

const P1_CHANNEL_RULES = new Set([
  "HOME_ATTACK_EDGE",
  "AWAY_ATTACK_EDGE",
  "FORM_HOME_SUPERIOR",
  "FORM_AWAY_SUPERIOR",
  "HOME_VENUE_FORM_EDGE",
  "AWAY_VENUE_FORM_EDGE",
  "GOALS_SCORED_HOME_EDGE",
  "GOALS_SCORED_AWAY_EDGE",
  "ATTACK_EFFICIENCY_HOME_EDGE",
  "ATTACK_EFFICIENCY_AWAY_EDGE",
  "POSSESSION_HOME_EDGE",
  "POSSESSION_AWAY_EDGE",
  "CHANCE_CREATION_HOME_EDGE",
  "CHANCE_CREATION_AWAY_EDGE",
  "DISCIPLINE_AWAY_RISK",
  "DISCIPLINE_HOME_RISK",
  "XG_ATTACK_HOME_EDGE",
  "XG_ATTACK_AWAY_EDGE",
  "XG_DEFENSIVE_EDGE",
  "XG_DEFENSIVE_AWAY_EDGE",
  "XG_DOMINANCE",
  "XG_DOMINANCE_AWAY",
  "REST_ADVANTAGE_HOME",
  "REST_ADVANTAGE_AWAY",
  "FATIGUE_HOME",
  "FATIGUE_AWAY",
  "HOME_STABILITY",
  "ROTATION_PRESSURE",
  "DEFENSE_HOME_STABLE",
  "DEFENSE_AWAY_STABLE",
  "DEFENSE_HOME_FRAGILE",
  "DEFENSE_AWAY_FRAGILE",
  "MOMENTUM_HOME",
  "MOMENTUM_AWAY",
  "HOME_ADVANTAGE_MATERIAL",
  "AVAILABILITY_HOME_HIT",
  "AVAILABILITY_AWAY_HIT",
]);

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

function bandFor(score: number, capped: boolean): ConfidenceBand {
  if (capped && score >= 75) {
    return "high";
  }

  if (score >= 85) {
    return "very_high";
  }

  if (score >= 65) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

function evidenceCompleteness(evidences: readonly Evidence[]): number {
  const checks = [
    evidences.some((evidence) => evidence.type === "MATCH_INFO"),
    evidences.some(
      (evidence) =>
        evidence.type === "TEAM_FORM" && evidence.payload.teamSide === "home",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "TEAM_FORM" && evidence.payload.teamSide === "away",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "STATISTICS" && evidence.payload.teamSide === "home",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "STATISTICS" && evidence.payload.teamSide === "away",
    ),
    evidences.some((evidence) => evidence.type === "VENUE"),
    evidences.some(
      (evidence) => evidence.type === "INJURY" || evidence.type === "SUSPENSION",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "TEAM_FORM" &&
        evidence.payload.teamSide === "home" &&
        evidence.payload.homeSplit !== undefined,
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "TEAM_FORM" &&
        evidence.payload.teamSide === "away" &&
        evidence.payload.awaySplit !== undefined,
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "STATISTICS" &&
        evidence.payload.teamSide === "home" &&
        evidence.payload.advanced !== undefined,
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "STATISTICS" &&
        evidence.payload.teamSide === "away" &&
        evidence.payload.advanced !== undefined,
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "EXPECTED_GOALS" && evidence.payload.teamSide === "home",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "EXPECTED_GOALS" && evidence.payload.teamSide === "away",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "MATCH_CONTEXT" && evidence.payload.teamSide === "home",
    ),
    evidences.some(
      (evidence) =>
        evidence.type === "MATCH_CONTEXT" && evidence.payload.teamSide === "away",
    ),
  ];
  const present = checks.filter(Boolean).length;

  return roundScore((present / checks.length) * 100);
}

/**
 * F1.3B / I1B: boost agreement when Expected Goals, Advanced Statistics,
 * and/or Match Context support the same football conclusion (same channel).
 */
function intelligenceAgreementBonus(ruleResults: readonly RuleResult[]): number {
  const passed = new Set(
    ruleResults
      .filter((rule) => rule.status === "PASS")
      .map((rule) => rule.ruleName),
  );

  let bonus = 0;

  if (
    passed.has("XG_ATTACK_HOME_EDGE") &&
    (passed.has("ATTACK_EFFICIENCY_HOME_EDGE") ||
      passed.has("CHANCE_CREATION_HOME_EDGE"))
  ) {
    bonus += 4;
  }

  if (
    passed.has("XG_ATTACK_AWAY_EDGE") &&
    (passed.has("ATTACK_EFFICIENCY_AWAY_EDGE") ||
      passed.has("CHANCE_CREATION_AWAY_EDGE"))
  ) {
    bonus += 4;
  }

  if (
    passed.has("XG_DOMINANCE") &&
    (passed.has("ATTACK_EFFICIENCY_HOME_EDGE") || passed.has("POSSESSION_HOME_EDGE"))
  ) {
    bonus += 2;
  }

  if (
    passed.has("XG_DOMINANCE_AWAY") &&
    (passed.has("ATTACK_EFFICIENCY_AWAY_EDGE") || passed.has("POSSESSION_AWAY_EDGE"))
  ) {
    bonus += 2;
  }

  const homeContextSupport =
    passed.has("REST_ADVANTAGE_HOME") ||
    passed.has("FATIGUE_AWAY") ||
    passed.has("ROTATION_PRESSURE") ||
    passed.has("HOME_STABILITY");
  const awayContextSupport =
    passed.has("REST_ADVANTAGE_AWAY") || passed.has("FATIGUE_HOME");

  if (
    homeContextSupport &&
    (passed.has("XG_ATTACK_HOME_EDGE") ||
      passed.has("XG_DOMINANCE") ||
      passed.has("ATTACK_EFFICIENCY_HOME_EDGE") ||
      passed.has("CHANCE_CREATION_HOME_EDGE"))
  ) {
    bonus += 3;
  }

  if (
    awayContextSupport &&
    (passed.has("XG_ATTACK_AWAY_EDGE") ||
      passed.has("XG_DOMINANCE_AWAY") ||
      passed.has("ATTACK_EFFICIENCY_AWAY_EDGE") ||
      passed.has("CHANCE_CREATION_AWAY_EDGE"))
  ) {
    bonus += 3;
  }

  return Math.min(bonus, 8);
}

function ruleAgreement(ruleResults: readonly RuleResult[]): {
  readonly agreement: number;
  readonly contradictionPenalty: number;
} {
  const p1 = ruleResults.filter(
    (rule) => P1_CHANNEL_RULES.has(rule.ruleName) && rule.status === "PASS",
  );
  const home = p1
    .filter((rule) => rule.channel === "home+")
    .reduce((sum, rule) => sum + rule.weight, 0);
  const away = p1
    .filter((rule) => rule.channel === "away+")
    .reduce((sum, rule) => sum + rule.weight, 0);
  const total = home + away;

  if (total <= 0) {
    return { agreement: 40, contradictionPenalty: 0 };
  }

  const dominant = Math.max(home, away);
  const minority = Math.min(home, away);
  const alignment = (dominant / total) * 100;
  const contradictionPenalty = minority > 0 ? (minority / total) * 25 : 0;

  return {
    agreement: roundScore(clamp(alignment - contradictionPenalty, 0, 100)),
    contradictionPenalty: roundScore(contradictionPenalty),
  };
}

export function computeIntelligenceConfidence(input: {
  readonly matchId: MatchId;
  readonly evidenceSet: readonly Evidence[];
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly scenarios: ScenarioSet;
}): IntelligenceConfidence {
  const matchId = createMatchId(input.matchId);
  const completeness = evidenceCompleteness(input.evidenceSet);
  const { agreement, contradictionPenalty } = ruleAgreement(input.ruleResults);
  const agreementBonus = intelligenceAgreementBonus(input.ruleResults);
  const boostedAgreement = roundScore(clamp(agreement + agreementBonus, 0, 100));
  const concentration = input.scenarios.mostLikely.probability * 100;
  const availabilityUnknown = input.ruleResults.some(
    (rule) =>
      (rule.ruleName === "AVAILABILITY_HOME_UNKNOWN" ||
        rule.ruleName === "AVAILABILITY_AWAY_UNKNOWN") &&
      rule.status === "PASS",
  );
  const venueUnavailable = input.ruleResults.some(
    (rule) => rule.ruleName === "VENUE_UNAVAILABLE" && rule.status === "PASS",
  );

  let predictionConfidence = roundScore(
    clamp(
      0.35 * completeness +
        0.35 * boostedAgreement +
        0.3 * concentration -
        contradictionPenalty,
      0,
      100,
    ),
  );

  if (availabilityUnknown) {
    predictionConfidence = Math.min(predictionConfidence, 74.9);
  }

  const upsetRisk = roundScore(
    clamp(
      input.scenarios.upset.probability * 100 * 0.55 +
        (100 - concentration) * 0.35 +
        (availabilityUnknown ? 10 : 0) +
        (venueUnavailable ? 5 : 0),
      0,
      100,
    ),
  );

  const limitations: string[] = [
    `Pinned intelligence confidence policy ${INTELLIGENCE_CONFIDENCE_POLICY_VERSION}.`,
    `Feature bundle status=${input.featureBundle.status}; checksum=${input.featureBundle.checksum}.`,
  ];

  if (availabilityUnknown) {
    limitations.push(
      "Availability UNKNOWN findings present; confidence capped below Very High.",
    );
  }

  if (venueUnavailable) {
    limitations.push("VENUE Evidence unavailable; venue support not claimed.");
  }

  const hasAdvancedHome = input.evidenceSet.some(
    (evidence) =>
      evidence.type === "STATISTICS" &&
      evidence.payload.teamSide === "home" &&
      evidence.payload.advanced !== undefined,
  );
  const hasAdvancedAway = input.evidenceSet.some(
    (evidence) =>
      evidence.type === "STATISTICS" &&
      evidence.payload.teamSide === "away" &&
      evidence.payload.advanced !== undefined,
  );

  if (!hasAdvancedHome || !hasAdvancedAway) {
    limitations.push(
      "Advanced STATISTICS Evidence incomplete; attack efficiency / possession / chance / discipline Features may be absent.",
    );
  }

  const hasXgHome = input.evidenceSet.some(
    (evidence) =>
      evidence.type === "EXPECTED_GOALS" && evidence.payload.teamSide === "home",
  );
  const hasXgAway = input.evidenceSet.some(
    (evidence) =>
      evidence.type === "EXPECTED_GOALS" && evidence.payload.teamSide === "away",
  );

  if (!hasXgHome || !hasXgAway) {
    limitations.push(
      "EXPECTED_GOALS Evidence incomplete; xG attack/defense/dominance Features may be absent (never estimated from shots).",
    );
  }

  const hasContextHome = input.evidenceSet.some(
    (evidence) =>
      evidence.type === "MATCH_CONTEXT" && evidence.payload.teamSide === "home",
  );
  const hasContextAway = input.evidenceSet.some(
    (evidence) =>
      evidence.type === "MATCH_CONTEXT" && evidence.payload.teamSide === "away",
  );

  if (!hasContextHome || !hasContextAway) {
    limitations.push(
      "MATCH_CONTEXT Evidence incomplete; fatigue / schedule / rotation Features may be absent (never estimated).",
    );
  }

  if (agreementBonus > 0) {
    limitations.push(
      `Evidence agreement bonus +${String(agreementBonus)} applied when Match Context, xG, and/or Advanced Statistics support the same football conclusion.`,
    );
  }

  if (input.scenarios.residualMass > 0.05) {
    limitations.push(
      `Scenario trio residual mass ${input.scenarios.residualMass.toFixed(3)} outside top covered worlds.`,
    );
  }

  const confidenceBand = bandFor(predictionConfidence, availabilityUnknown);
  const frozenLimitations = Object.freeze([...limitations]);
  const checksum = stableChecksum(
    JSON.stringify({
      policyVersion: INTELLIGENCE_CONFIDENCE_POLICY_VERSION,
      matchId,
      predictionConfidence,
      confidenceBand,
      upsetRisk,
      evidenceCompleteness: completeness,
      ruleAgreement: boostedAgreement,
      limitations: frozenLimitations,
    }),
  );

  return Object.freeze({
    policyVersion: INTELLIGENCE_CONFIDENCE_POLICY_VERSION,
    matchId,
    predictionConfidence,
    confidenceBand,
    upsetRisk,
    evidenceCompleteness: completeness,
    ruleAgreement: boostedAgreement,
    limitations: frozenLimitations,
    checksum,
  });
}
