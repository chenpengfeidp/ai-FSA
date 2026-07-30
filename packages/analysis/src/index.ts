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
  MATCH_SCRIPT_PROJECTION_PARAMETER_ARTIFACT,
  PROJECTION_FRAMEWORK_VERSION,
  PROJECTION_FRAMEWORK_VERSION_MATCH_SCRIPT,
  PROJECTION_FRAMEWORK_VERSION_MULTI_SCRIPT,
  PROJECTION_PARAMS_BASELINE_ARTIFACT_ID,
  PROJECTION_PARAMS_FEATURE_LAMBDA_ARTIFACT_ID,
  PROJECTION_PARAMS_MATCH_SCRIPT_ARTIFACT_ID,
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
export { computeMultiScriptProjection } from "./projection-v2/multi-script/compute-multi-script-projection.js";
export {
  buildMatchScriptProjectionSummaries,
  buildMultiScriptMergeSummary,
} from "./projection-v2/multi-script/build-multi-script-projection-metadata.js";
export type {
  MatchScriptProjectionSummary,
  MultiScriptMergeSummary,
  ScriptMergeContribution,
  ScriptScorelineSummary,
} from "./projection-v2/multi-script/build-multi-script-projection-metadata.js";
export { MULTI_SCRIPT_MERGE_ALGORITHM } from "./projection-v2/multi-script/compute-multi-script-projection.js";
export type { PerScriptProjection } from "./projection-v2/multi-script/compute-multi-script-projection.js";
export type {
  ProjectionFrameworkMetadata,
  MatchScriptSummary,
  ProjectionResult,
} from "./projection-v2/projection-result.js";
export { createProjectionFrameworkMetadata } from "./projection-v2/projection-result.js";
export { computeIdentityFootballState } from "./projection-v2/football-state/compute-identity-football-state.js";
export { computeFootballState } from "./projection-v2/football-state/compute-football-state.js";
export {
  createFootballStateReportMetadata,
  type FootballStateDimensionReport,
  type FootballStateReportMetadata,
} from "./projection-v2/football-state/football-state-report-metadata.js";
export {
  FOOTBALL_STATE_DIMENSION_IDS,
  FOOTBALL_STATE_DIMENSION_LABELS,
  type FootballStateDimensionId,
} from "./projection-v2/football-state/football-state-dimensions.js";
export {
  createFootballStateEnvelope,
  FOOTBALL_STATE_POLICY_VERSION,
} from "./projection-v2/football-state/football-state-envelope.js";
export type {
  CreateFootballStateEnvelopeInput,
  FootballStateEnvelope,
} from "./projection-v2/football-state/football-state-envelope.js";
export type {
  FootballStateProjectionInputs,
  StateDimensionBasis,
  StateDimensionLevel,
  StateDimensionValue,
} from "./projection-v2/football-state/football-state-types.js";
export { computeBaselineMatchScriptSet } from "./projection-v2/match-script/compute-baseline-match-script-set.js";
export { generateMatchScriptSet } from "./projection-v2/match-script/match-script-generator.js";
export { scoreMatchScriptFromFootballState } from "./projection-v2/match-script/match-script-football-state-scoring.js";
export { GOVERNED_MATCH_SCRIPT_PARAMETER_SET } from "./projection-v2/match-script/match-script-governed-parameters.js";
export {
  MATCH_SCRIPT_IDS,
  type MatchScriptId,
} from "./projection-v2/match-script/match-script-ids.js";
export type { MatchScriptParameterSet } from "./projection-v2/match-script/match-script-parameter-set.js";
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
export { buildScriptProbabilityMatrix } from "./projection-v2/probability-matrix/build-script-probability-matrix.js";
export { mergeProbabilityMatrices } from "./projection-v2/probability-matrix/merge-probability-matrices.js";
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
export {
  AnalysisProjectionReplayPort,
  buildProjectionReplayContext,
  buildSealedPredictionInputFromAnalysis,
} from "./replay/analysis-projection-replay-port.js";
