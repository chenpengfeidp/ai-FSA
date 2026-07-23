import { createMatchId, type MatchId } from "@fas/match";

export const PROJECTION_MODEL_VERSION = "projection.v2.i1b.context";
export const XG_MODEL_VERSION = "xg.v2.slice1";
export const PROBABILITY_MODEL_VERSION = "independent_poisson.v1";
export const CONFIDENCE_MODEL_VERSION = "confidence.v2.slice1";
export const RECOMMENDATION_POLICY_VERSION = "recommendation.v2.slice1";

export type ProjectionStatus = "blocked" | "completed_nonempty" | "failed";

export type RecommendationCode =
  | "cautious"
  | "insufficient_evidence"
  | "lean_away"
  | "lean_draw"
  | "lean_home";

export interface ScorelineDto {
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
}

export interface GoalRangeDto {
  readonly range01: number;
  readonly range23: number;
  readonly range4Plus: number;
}

export interface ConfidenceComponents {
  readonly A: number;
  readonly C: number;
  readonly S: number;
  readonly X: number;
}

export interface DeterministicMatchProjection {
  readonly projectionModelVersion: typeof PROJECTION_MODEL_VERSION;
  readonly xgModelVersion: typeof XG_MODEL_VERSION;
  readonly probabilityModelVersion: typeof PROBABILITY_MODEL_VERSION;
  readonly confidenceModelVersion: typeof CONFIDENCE_MODEL_VERSION;
  readonly recommendationPolicyVersion: typeof RECOMMENDATION_POLICY_VERSION;
  readonly matchId: MatchId;
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly topScorelines: readonly ScorelineDto[];
  readonly goalRange: GoalRangeDto;
  readonly confidence: number;
  readonly confidenceComponents: ConfidenceComponents;
  readonly recommendation: RecommendationCode;
  readonly limitations: readonly string[];
  readonly truncationMass: number;
  readonly scorelinesBasis: "pre_rule_adjustment";
  readonly oneXTwoBasis: "post_rule_and_calibration";
  readonly calibrationArtifactId: string;
  readonly calibrationModelVersion: string;
  readonly calibrationStatus: string;
  readonly calibrationChecksum: string;
  readonly calibrationQualified: boolean;
  readonly featureBundleChecksum: string;
  readonly ruleEvaluationRefs: readonly string[];
  readonly checksum: string;
  readonly status: ProjectionStatus;
}

export interface CreateDeterministicMatchProjectionInput {
  readonly matchId: MatchId;
  readonly lambdaHome: number;
  readonly lambdaAway: number;
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly topScorelines: readonly ScorelineDto[];
  readonly goalRange: GoalRangeDto;
  readonly confidence: number;
  readonly confidenceComponents: ConfidenceComponents;
  readonly recommendation: RecommendationCode;
  readonly limitations: readonly string[];
  readonly truncationMass: number;
  readonly calibrationArtifactId: string;
  readonly calibrationModelVersion: string;
  readonly calibrationStatus: string;
  readonly calibrationChecksum: string;
  readonly calibrationQualified: boolean;
  readonly featureBundleChecksum: string;
  readonly ruleEvaluationRefs: readonly string[];
  readonly checksum: string;
  readonly status: ProjectionStatus;
}

export function createDeterministicMatchProjection(
  input: CreateDeterministicMatchProjectionInput,
): DeterministicMatchProjection {
  return Object.freeze({
    projectionModelVersion: PROJECTION_MODEL_VERSION,
    xgModelVersion: XG_MODEL_VERSION,
    probabilityModelVersion: PROBABILITY_MODEL_VERSION,
    confidenceModelVersion: CONFIDENCE_MODEL_VERSION,
    recommendationPolicyVersion: RECOMMENDATION_POLICY_VERSION,
    matchId: createMatchId(input.matchId),
    lambdaHome: input.lambdaHome,
    lambdaAway: input.lambdaAway,
    pHome: input.pHome,
    pDraw: input.pDraw,
    pAway: input.pAway,
    topScorelines: Object.freeze([...input.topScorelines]),
    goalRange: Object.freeze({ ...input.goalRange }),
    confidence: input.confidence,
    confidenceComponents: Object.freeze({ ...input.confidenceComponents }),
    recommendation: input.recommendation,
    limitations: Object.freeze([...input.limitations]),
    truncationMass: input.truncationMass,
    scorelinesBasis: "pre_rule_adjustment",
    oneXTwoBasis: "post_rule_and_calibration",
    calibrationArtifactId: input.calibrationArtifactId,
    calibrationModelVersion: input.calibrationModelVersion,
    calibrationStatus: input.calibrationStatus,
    calibrationChecksum: input.calibrationChecksum,
    calibrationQualified: input.calibrationQualified,
    featureBundleChecksum: input.featureBundleChecksum,
    ruleEvaluationRefs: Object.freeze([...input.ruleEvaluationRefs]),
    checksum: input.checksum,
    status: input.status,
  });
}
