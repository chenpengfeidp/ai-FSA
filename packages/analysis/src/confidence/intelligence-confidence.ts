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
  ];
  const present = checks.filter(Boolean).length;

  return roundScore((present / checks.length) * 100);
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
        0.35 * agreement +
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
      ruleAgreement: agreement,
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
    ruleAgreement: agreement,
    limitations: frozenLimitations,
    checksum,
  });
}
