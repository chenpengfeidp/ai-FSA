import type { FeatureBundle } from "@fas/feature";
import type { RuleResult } from "@fas/rule";
import {
  applyCalibration,
  type CalibrationArtifact,
  IDENTITY_CALIBRATION_ARTIFACT,
} from "@fas/statistics";
import type { FootballStateEnvelope } from "../projection-v2/football-state/football-state-envelope.js";
import type { ProbabilityMatrix } from "../projection-v2/probability-matrix/probability-matrix.js";
import { buildLambdasV2 } from "../projection-v2/lambda/lambda-builder-v2.js";
import type { MatchScriptSet } from "../projection-v2/match-script/match-script-set.js";
import type { ProjectionParameterArtifact } from "../projection-v2/projection-parameter-artifact.js";
import {
  createDeterministicMatchProjection,
  type DeterministicMatchProjection,
  type RecommendationCode,
} from "./deterministic-match-projection.js";
import {
  buildIndependentPoissonMatrix,
  clamp,
  roundProbability,
} from "./projection-math.js";
import { stableChecksum } from "./stable-checksum.js";

const FOOTBALL_CHANNEL_RULE_NAMES = new Set([
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
  "VENUE_SUPPORTS_HOME",
  "AVAILABILITY_HOME_HIT",
  "AVAILABILITY_AWAY_HIT",
  "SIGNALS_ALIGNED_HOME",
  "SIGNALS_ALIGNED_AWAY",
  "H2H_SUPPORTS_HOME",
  "H2H_SUPPORTS_AWAY",
  "CLUB_STRENGTH_EDGE",
  "CLUB_STRENGTH_EDGE_AWAY",
  "LEAGUE_STRENGTH_EDGE",
  "LEAGUE_STRENGTH_EDGE_AWAY",
  "FORM_STRENGTH_EDGE",
  "FORM_STRENGTH_EDGE_AWAY",
  "ATTACK_STRENGTH_EDGE",
  "ATTACK_STRENGTH_EDGE_AWAY",
  "DEFENSE_STRENGTH_EDGE",
  "DEFENSE_STRENGTH_EDGE_AWAY",
  "MANAGER_STABILITY",
  "MANAGER_STABILITY_AWAY",
  "PLAYER_AVAILABILITY_EDGE_HOME",
  "PLAYER_AVAILABILITY_EDGE_AWAY",
  "KEY_PLAYER_MISSING_HOME",
  "KEY_PLAYER_MISSING_AWAY",
  "PLAYER_ATTACK_EDGE_HOME",
  "PLAYER_ATTACK_EDGE_AWAY",
  "GOALKEEPER_EDGE_HOME",
  "GOALKEEPER_EDGE_AWAY",
]);
const REQUIRED_EVIDENCE_WEIGHT = 5;

function directionalRecommendation(input: {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
}): RecommendationCode {
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

function marketConflictsWithFootball(input: {
  readonly footballRecommendation: RecommendationCode;
  readonly marketLeanHome: boolean;
  readonly marketLeanAway: boolean;
}): boolean {
  if (input.footballRecommendation === "lean_home" && input.marketLeanAway) {
    return true;
  }

  if (input.footballRecommendation === "lean_away" && input.marketLeanHome) {
    return true;
  }

  return false;
}

function recommendationFor(input: {
  readonly requiredEvidenceMissing: boolean;
  readonly confidence: number;
  readonly A: number;
  readonly X: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly marketConflict: boolean;
}): RecommendationCode {
  if (input.requiredEvidenceMissing || input.confidence < 0.4) {
    return "insufficient_evidence";
  }

  if (
    input.marketConflict ||
    input.confidence < 0.55 ||
    input.A < 0.5 ||
    input.X >= 1
  ) {
    return "cautious";
  }

  return directionalRecommendation(input);
}

export function computeDeterministicProjectionV2(input: {
  readonly featureBundle: FeatureBundle;
  readonly ruleResults: readonly RuleResult[];
  readonly requiredEvidencePresentCount: number;
  readonly parameters: ProjectionParameterArtifact;
  readonly footballState: FootballStateEnvelope;
  readonly calibrationArtifact?: CalibrationArtifact;
  readonly mergedProbabilityMatrix?: ProbabilityMatrix;
  readonly matchScriptSet?: MatchScriptSet;
}): DeterministicMatchProjection {
  const calibrationArtifact =
    input.calibrationArtifact ?? IDENTITY_CALIBRATION_ARTIFACT;
  const lambdaResult = buildLambdasV2({
    footballState: input.footballState,
    parameters: input.parameters.lambda,
  });

  if (lambdaResult.blocked) {
    return createDeterministicMatchProjection({
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
        ...lambdaResult.limitations,
        `Pinned calibration artifact ${calibrationArtifact.artifactId} (${calibrationArtifact.status}).`,
      ]),
      truncationMass: 0,
      calibrationArtifactId: calibrationArtifact.artifactId,
      calibrationModelVersion: calibrationArtifact.calibrationModelVersion,
      calibrationStatus: calibrationArtifact.status,
      calibrationChecksum: calibrationArtifact.checksum,
      calibrationQualified: calibrationArtifact.qualified,
      featureBundleChecksum: input.featureBundle.checksum,
      ruleEvaluationRefs: input.ruleResults.map((rule) => rule.ruleId),
      checksum: "blocked",
      status: "blocked",
    });
  }

  const {
    homeAttackRating: attackHome,
    awayAttackRating: attackAway,
    homeDefenseRating: defenseHome,
    awayDefenseRating: defenseAway,
    homeMomentum: momentumHome,
    awayMomentum: momentumAway,
    homeAdvantage,
  } = input.footballState.projectionInputs;
  const mergedMatrix = input.mergedProbabilityMatrix;
  const poisson =
    mergedMatrix === undefined
      ? buildIndependentPoissonMatrix(
          lambdaResult.lambdaHome,
          lambdaResult.lambdaAway,
        )
      : {
          matrix: mergedMatrix.matrix,
          truncationMass: mergedMatrix.truncationMass,
          pHome: mergedMatrix.pHome,
          pDraw: mergedMatrix.pDraw,
          pAway: mergedMatrix.pAway,
          topScorelines: mergedMatrix.topScorelines.map((scoreline) =>
            Object.freeze({ ...scoreline }),
          ),
          goalRange: mergedMatrix.goalRange,
        };
  const calibrated = applyCalibration(
    {
      pHome: poisson.pHome,
      pDraw: poisson.pDraw,
      pAway: poisson.pAway,
    },
    calibrationArtifact,
  );
  const footballRules = input.ruleResults.filter((rule) =>
    FOOTBALL_CHANNEL_RULE_NAMES.has(rule.ruleName),
  );
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
  const applicableWeight = footballRules
    .filter((rule) => rule.status !== "INAPPLICABLE")
    .reduce((sum, rule) => sum + rule.weight, 0);
  const A = alignedWeight / Math.max(applicableWeight, 1e-12);
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
  const marketRules = input.ruleResults.filter(
    (rule) =>
      rule.ruleName === "MARKET_LEAN_HOME" || rule.ruleName === "MARKET_LEAN_AWAY",
  );
  const marketLeanHome = marketRules.some(
    (rule) => rule.ruleName === "MARKET_LEAN_HOME" && rule.status === "PASS",
  );
  const marketLeanAway = marketRules.some(
    (rule) => rule.ruleName === "MARKET_LEAN_AWAY" && rule.status === "PASS",
  );
  const footballRecommendation = directionalRecommendation({
    pHome: calibrated.pHome,
    pDraw: calibrated.pDraw,
    pAway: calibrated.pAway,
  });
  const marketConflict = marketConflictsWithFootball({
    footballRecommendation,
    marketLeanHome,
    marketLeanAway,
  });
  const recommendation = recommendationFor({
    requiredEvidenceMissing: false,
    confidence,
    A,
    X,
    pHome: calibrated.pHome,
    pDraw: calibrated.pDraw,
    pAway: calibrated.pAway,
    marketConflict,
  });
  const limitations = [
    ...lambdaResult.limitations,
    ...(input.matchScriptSet?.limitations ?? []),
    mergedMatrix === undefined
      ? "Scorelines and 1X2 derive from Football State projection inputs via lambda Poisson matrix without Rule softmax."
      : "Scorelines, goal range, BTTS, and Over/Under derive from the unified Match Script probability matrix; 1X2 marginals receive calibration only.",
    `Pinned projection parameter artifact ${input.parameters.artifactId} (${input.parameters.status}).`,
    `Pinned calibration artifact ${calibrationArtifact.artifactId} (${calibrationArtifact.status}); Analysis does not train or select maps during a run.`,
    ...calibrationArtifact.limitations,
  ];

  if (marketConflict) {
    limitations.push(
      "Market lean conflicts with football-model directional lean; recommendation forced to cautious.",
    );
  }

  const projectionBody = {
    matchId: input.featureBundle.matchId,
    lambdaHome: roundProbability(
      mergedMatrix?.lambdaHome ?? lambdaResult.lambdaHome,
    ),
    lambdaAway: roundProbability(
      mergedMatrix?.lambdaAway ?? lambdaResult.lambdaAway,
    ),
    pHome: roundProbability(calibrated.pHome),
    pDraw: roundProbability(calibrated.pDraw),
    pAway: roundProbability(calibrated.pAway),
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
    limitations: Object.freeze(limitations),
    truncationMass: roundProbability(poisson.truncationMass),
    calibrationArtifactId: calibrationArtifact.artifactId,
    calibrationModelVersion: calibrationArtifact.calibrationModelVersion,
    calibrationStatus: calibrationArtifact.status,
    calibrationChecksum: calibrationArtifact.checksum,
    calibrationQualified: calibrationArtifact.qualified,
    featureBundleChecksum: input.featureBundle.checksum,
    ruleEvaluationRefs: input.ruleResults.map((rule) => rule.ruleId),
    scorelinesBasis:
      mergedMatrix === undefined
        ? ("feature_enriched_lambda_v2" as const)
        : ("match_script_merged_v2" as const),
    oneXTwoBasis: "post_calibration_only" as const,
  };
  const checksum = stableChecksum(JSON.stringify(projectionBody));

  return createDeterministicMatchProjection({
    ...projectionBody,
    checksum,
    status: "completed_nonempty",
  });
}
