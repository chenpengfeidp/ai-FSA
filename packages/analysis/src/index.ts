export {
  createAnalysisResult,
  AnalysisResultValidationError,
} from "./domain/analysis-result.js";
export type {
  AnalysisResult,
  CreateAnalysisResultInput,
} from "./domain/analysis-result.js";
export { AnalyzeMatchUseCase } from "./use-case/analyze-match-use-case.js";
export type {
  AnalysisError,
  AnalysisErrorCause,
  AnalysisErrorCode,
  AnalyzeMatchResult,
  EvidenceByMatchQuery,
  FeatureExtractionOperation,
  MatchImportOperation,
  Result,
  RuleEvaluationOperation,
} from "./use-case/analyze-match-use-case.js";
export { computeDeterministicMatchProjection } from "./projection/compute-deterministic-projection.js";
export { computeDeterministicProjectionV2 } from "./projection/compute-deterministic-projection-v2.js";
export { computeMatchProjection } from "./projection/compute-match-projection.js";
export type { ComputeMatchProjectionResult } from "./projection/compute-match-projection.js";
export { computeProjectionV2 } from "./projection-v2/compute-projection-v2.js";
export {
  BASELINE_PROJECTION_PARAMETER_ARTIFACT,
  createProjectionParameterArtifact,
  FEATURE_ENRICHED_PROJECTION_PARAMETER_ARTIFACT,
  PROJECTION_FRAMEWORK_VERSION,
  PROJECTION_PARAMS_BASELINE_ARTIFACT_ID,
  PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID,
  PROJECTION_PARAMS_POLICY_VERSION,
  ProjectionParameterArtifactValidationError,
} from "./projection-v2/projection-parameter-artifact.js";
export type {
  CreateProjectionParameterArtifactInput,
  ProjectionParameterArtifact,
  ProjectionParameterArtifactStatus,
} from "./projection-v2/projection-parameter-artifact.js";
export { buildLambdasV2 } from "./projection-v2/lambda/lambda-builder-v2.js";
export type {
  LambdaBuilderV2Result,
  LambdaFeatureGroupId,
  LambdaFeatureScale,
  LambdaFeatureWeightEntry,
  LambdaGroupContribution,
  LambdaParameterSet,
} from "./projection-v2/lambda/lambda-parameter-set.js";
export { LAMBDA_FEATURE_GROUPS } from "./projection-v2/lambda/lambda-feature-groups.js";
export type { LambdaFeatureGroupDefinition } from "./projection-v2/lambda/lambda-feature-groups.js";
export {
  DEFAULT_PROJECTION_POLICY_PIN,
  resolveProjectionParameterArtifact,
} from "./projection-v2/resolve-projection-policy.js";
export type { ProjectionPolicyPin } from "./projection-v2/resolve-projection-policy.js";
export { createProjectionFrameworkMetadata } from "./projection-v2/projection-result.js";
export type {
  ProjectionFrameworkMetadata,
  ProjectionResult,
} from "./projection-v2/projection-result.js";
export { computeIdentityFootballState } from "./projection-v2/football-state/compute-identity-football-state.js";
export {
  createFootballStateEnvelope,
  FOOTBALL_STATE_POLICY_VERSION,
} from "./projection-v2/football-state/football-state-envelope.js";
export type {
  CreateFootballStateEnvelopeInput,
  FootballStateEnvelope,
  StateDimensionLevel,
  StateDimensionValue,
} from "./projection-v2/football-state/football-state-envelope.js";
export { computeBaselineMatchScriptSet } from "./projection-v2/match-script/compute-baseline-match-script-set.js";
export {
  BASELINE_MATCH_SCRIPT_ID,
  createMatchScriptSet,
  MATCH_SCRIPT_POLICY_VERSION,
} from "./projection-v2/match-script/match-script-set.js";
export type {
  CreateMatchScriptSetInput,
  MatchScript,
  MatchScriptSet,
} from "./projection-v2/match-script/match-script-set.js";
export {
  buildFeatureEnrichedProbabilityMatrix,
  buildFeatureEnrichedProbabilityMatrix as buildFoundationProbabilityMatrix,
} from "./projection-v2/probability-matrix/build-foundation-probability-matrix.js";
export {
  createProbabilityMatrixFromPoisson,
  PROBABILITY_MATRIX_MODEL_VERSION,
} from "./projection-v2/probability-matrix/probability-matrix.js";
export type {
  ProbabilityMatrix,
  ScorelineCell,
} from "./projection-v2/probability-matrix/probability-matrix.js";
export {
  CONFIDENCE_MODEL_VERSION,
  createDeterministicMatchProjection,
  PROBABILITY_MODEL_VERSION,
  PROJECTION_MODEL_VERSION,
  RECOMMENDATION_POLICY_VERSION,
  XG_MODEL_VERSION,
} from "./projection/deterministic-match-projection.js";
export type {
  ConfidenceComponents,
  CreateDeterministicMatchProjectionInput,
  DeterministicMatchProjection,
  GoalRangeDto,
  ProjectionStatus,
  RecommendationCode,
  ScorelineDto,
} from "./projection/deterministic-match-projection.js";
export {
  buildScenarioSet,
  SCENARIO_POLICY_VERSION,
} from "./scenario/scenario-set.js";
export type {
  Scenario,
  ScenarioSet,
  ScenarioSlot,
  ScenarioWinner,
} from "./scenario/scenario-set.js";
export {
  computeIntelligenceConfidence,
  INTELLIGENCE_CONFIDENCE_POLICY_VERSION,
} from "./confidence/intelligence-confidence.js";
export type {
  ConfidenceBand,
  IntelligenceConfidence,
} from "./confidence/intelligence-confidence.js";
export {
  buildIndependentPoissonMatrix,
  clamp,
  computeLambdas,
  G_MAX,
  poissonPmf,
  roundProbability,
  softmaxAdjust,
} from "./projection/projection-math.js";
export { resolvePinnedCalibrationArtifact } from "@fas/statistics";
export type { CalibrationArtifactMode } from "@fas/statistics";
export { buildSealedPredictionInput } from "./evaluation/build-sealed-prediction-input.js";
export { extractMatchContextForHistory } from "./evaluation/extract-match-context-for-history.js";
export type { MatchContextForHistory } from "./evaluation/extract-match-context-for-history.js";
export { EvaluatePredictionUseCase } from "./use-case/evaluate-prediction-use-case.js";
export type {
  EvaluatePredictionCommand,
  EvaluatePredictionResult,
} from "./use-case/evaluate-prediction-use-case.js";
