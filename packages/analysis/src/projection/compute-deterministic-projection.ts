import type { Feature, FeatureBundle, FeatureName } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import {
  createDeterministicMatchProjection,
  type DeterministicMatchProjection,
  type RecommendationCode,
} from "./deterministic-match-projection.js";
import {
  buildIndependentPoissonMatrix,
  clamp,
  computeLambdas,
  roundProbability,
  RULE_ADJUSTMENT_SCALE,
  softmaxAdjust,
} from "./projection-math.js";
import { stableChecksum } from "./stable-checksum.js";

const FOOTBALL_RULE_WEIGHT_TOTAL = 0.7 + 0.7 + 0.45 + 0.45 + 0.55;
const REQUIRED_EVIDENCE_WEIGHT = 5;

function numericFeature(
  features: ReadonlyMap<FeatureName, Feature>,
  name: FeatureName,
): number | undefined {
  const value = features.get(name)?.value;

  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function recommendationFor(input: {
  readonly requiredEvidenceMissing: boolean;
  readonly confidence: number;
  readonly A: number;
  readonly X: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
}): RecommendationCode {
  if (input.requiredEvidenceMissing || input.confidence < 0.4) {
    return "insufficient_evidence";
  }

  if (input.confidence < 0.55 || input.A < 0.5 || input.X >= 1) {
    return "cautious";
  }

  const ordered = [
    { code: "lean_home" as const, value: input.pHome, margin: 0.08 },
    { code: "lean_away" as const, value: input.pAway, margin: 0.08 },
    { code: "lean_draw" as const, value: input.pDraw, margin: 0.05 },
  ].sort((left, right) => right.value - left.value);
  const [first, second] = ordered;

  if (
    first !== undefined &&
    second !== undefined &&
    first.value - second.value >= first.margin
  ) {
    return first.code;
  }

  return "cautious";
}

export function computeDeterministicMatchProjection(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly requiredEvidencePresentCount: number;
}): DeterministicMatchProjection {
  const features = new Map(
    input.featureBundle.features.map((feature) => [feature.name, feature]),
  );
  const attackHome = numericFeature(features, "attackRatingHome");
  const defenseAway = numericFeature(features, "defenseRatingAway");
  const attackAway = numericFeature(features, "attackRatingAway");
  const defenseHome = numericFeature(features, "defenseRatingHome");
  const momentumHome = numericFeature(features, "momentumHome");
  const momentumAway = numericFeature(features, "momentumAway");
  const homeAdvantage = numericFeature(features, "homeAdvantage");
  const requiredEvidenceMissing =
    input.requiredEvidencePresentCount < REQUIRED_EVIDENCE_WEIGHT ||
    attackHome === undefined ||
    defenseAway === undefined ||
    attackAway === undefined ||
    defenseHome === undefined ||
    momentumHome === undefined ||
    momentumAway === undefined ||
    homeAdvantage === undefined;

  if (requiredEvidenceMissing) {
    const blocked = createDeterministicMatchProjection({
      matchId: input.featureBundle.matchId,
      lambdaHome: 0,
      lambdaAway: 0,
      pHome: 0,
      pDraw: 0,
      pAway: 0,
      topScorelines: [],
      goalRange: { range01: 0, range23: 0, range4Plus: 0 },
      confidence: Math.min(
        0.4,
        input.requiredEvidencePresentCount / REQUIRED_EVIDENCE_WEIGHT,
      ),
      confidenceComponents: {
        A: 0,
        C: input.requiredEvidencePresentCount / REQUIRED_EVIDENCE_WEIGHT,
        S: 0,
        X: 0,
      },
      recommendation: "insufficient_evidence",
      limitations: Object.freeze([
        "Required TEAM_FORM/STATISTICS evidence is missing for deterministic projection.",
        "Uncalibrated independent Poisson baseline; not validated for real-world decision making.",
      ]),
      truncationMass: 0,
      featureBundleChecksum: input.featureBundle.checksum,
      ruleEvaluationRefs: input.ruleResults.map((rule) => rule.ruleId),
      checksum: "blocked",
      status: "blocked",
    });

    return blocked;
  }

  const lambdas = computeLambdas({
    attackRatingHome: attackHome,
    defenseRatingAway: defenseAway,
    attackRatingAway: attackAway,
    defenseRatingHome: defenseHome,
    homeAdvantage,
  });
  const poisson = buildIndependentPoissonMatrix(
    lambdas.lambdaHome,
    lambdas.lambdaAway,
  );
  const footballRules = input.ruleResults.filter(
    (rule) =>
      rule.ruleName === "HOME_ATTACK_EDGE" ||
      rule.ruleName === "AWAY_ATTACK_EDGE" ||
      rule.ruleName === "MOMENTUM_HOME" ||
      rule.ruleName === "MOMENTUM_AWAY" ||
      rule.ruleName === "HOME_ADVANTAGE_MATERIAL",
  );
  const homeSignal = footballRules
    .filter((rule) => rule.status === "PASS" && rule.channel === "home+")
    .reduce((sum, rule) => sum + rule.weight, 0);
  const awaySignal = footballRules
    .filter((rule) => rule.status === "PASS" && rule.channel === "away+")
    .reduce((sum, rule) => sum + rule.weight, 0);
  const delta = RULE_ADJUSTMENT_SCALE * (homeSignal - awaySignal);
  const adjusted = softmaxAdjust(poisson.pHome, poisson.pDraw, poisson.pAway, delta);
  const matchedByName = new Set(
    footballRules
      .filter((rule) => rule.status === "PASS")
      .map((rule) => rule.ruleName),
  );
  let X = 0;

  if (
    matchedByName.has("HOME_ATTACK_EDGE") &&
    matchedByName.has("AWAY_ATTACK_EDGE")
  ) {
    X += 1;
  }

  if (matchedByName.has("MOMENTUM_HOME") && matchedByName.has("MOMENTUM_AWAY")) {
    X += 0.5;
  }

  const alignedWeight = footballRules
    .filter((rule) => rule.status === "PASS")
    .reduce((sum, rule) => sum + rule.weight, 0);
  const A = alignedWeight / Math.max(FOOTBALL_RULE_WEIGHT_TOTAL, 1e-12);
  const C = input.requiredEvidencePresentCount / REQUIRED_EVIDENCE_WEIGHT;
  const strengthValues = [
    Math.abs(attackHome - 50) / 50,
    Math.abs(attackAway - 50) / 50,
    Math.abs(defenseHome - 50) / 50,
    Math.abs(defenseAway - 50) / 50,
    Math.abs(momentumHome),
    Math.abs(momentumAway),
    homeAdvantage,
  ];
  const S =
    strengthValues.reduce((sum, value) => sum + value, 0) / strengthValues.length;
  const confidenceRaw = 0.35 * A + 0.3 * C + 0.35 * S;
  const confidence = clamp(confidenceRaw * (1 - 0.5 * X), 0, 0.95);
  const recommendation = recommendationFor({
    requiredEvidenceMissing: false,
    confidence,
    A,
    X,
    pHome: adjusted.pHome,
    pDraw: adjusted.pDraw,
    pAway: adjusted.pAway,
  });
  const projectionBody = {
    matchId: input.featureBundle.matchId,
    lambdaHome: roundProbability(lambdas.lambdaHome),
    lambdaAway: roundProbability(lambdas.lambdaAway),
    pHome: roundProbability(adjusted.pHome),
    pDraw: roundProbability(adjusted.pDraw),
    pAway: roundProbability(adjusted.pAway),
    topScorelines: poisson.topScorelines.map((scoreline) =>
      Object.freeze({
        homeGoals: scoreline.homeGoals,
        awayGoals: scoreline.awayGoals,
        probability: roundProbability(scoreline.probability),
      }),
    ),
    goalRange: Object.freeze({
      range01: roundProbability(poisson.goalRange.range01),
      range23: roundProbability(poisson.goalRange.range23),
      range4Plus: roundProbability(poisson.goalRange.range4Plus),
    }),
    confidence: roundProbability(confidence),
    confidenceComponents: Object.freeze({
      A: roundProbability(A),
      C: roundProbability(C),
      S: roundProbability(S),
      X: roundProbability(X),
    }),
    recommendation,
    limitations: Object.freeze([
      "Uncalibrated independent Poisson baseline; not validated for real-world decision making.",
      "Scorelines use pre-rule-adjustment matrix; 1X2 uses post-rule-adjustment probabilities.",
    ]),
    truncationMass: roundProbability(poisson.truncationMass),
    featureBundleChecksum: input.featureBundle.checksum,
    ruleEvaluationRefs: footballRules.map((rule) => rule.ruleId),
  };
  const checksum = stableChecksum(JSON.stringify(projectionBody));

  return createDeterministicMatchProjection({
    ...projectionBody,
    checksum,
    status: "completed_nonempty",
  });
}
