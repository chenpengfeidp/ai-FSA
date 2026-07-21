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
