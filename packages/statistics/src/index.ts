export {
  applyCalibration,
  CalibrationApplicationError,
} from "./calibration/apply-calibration.js";
export type { ProbabilityTriple } from "./calibration/apply-calibration.js";
export {
  computeFrequencyRatioCalibrationArtifact,
  loadDemoPopulationRows,
  parseCalibrationPopulation,
  POPULATION_DEMO_CALIBRATION_ARTIFACT,
  CalibrationPopulationError,
} from "./calibration/compute-frequency-ratio-calibration.js";
export { resolvePinnedCalibrationArtifact } from "./calibration/resolve-pinned-calibration-artifact.js";
export type { CalibrationArtifactMode } from "./calibration/resolve-pinned-calibration-artifact.js";

export {
  CALIBRATION_MODEL_VERSION_IDENTITY,
  CALIBRATION_MODEL_VERSION_POPULATION_DEMO,
  createCalibrationArtifact,
  CalibrationArtifactValidationError,
  IDENTITY_CALIBRATION_ARTIFACT,
  IDENTITY_CALIBRATION_ARTIFACT_ID,
  POPULATION_DEMO_CALIBRATION_ARTIFACT_ID,
} from "./domain/calibration-artifact.js";
export type {
  CalibrationArtifact,
  CalibrationArtifactStatus,
  CalibrationMap,
  CreateCalibrationArtifactInput,
} from "./domain/calibration-artifact.js";
export type {
  CalibrationOutcome,
  CalibrationPopulationRow,
} from "./domain/calibration-population.js";

export {
  createActualMatchResult,
  ActualMatchResultValidationError,
} from "./domain/actual-match-result.js";
export type {
  ActualMatchResult,
  ActualMatchStatus,
  CreateActualMatchResultInput,
  MatchWinner,
} from "./domain/actual-match-result.js";

export {
  createPredictionEvaluationRecord,
  EVALUATION_MODEL_VERSION,
  PredictionEvaluationValidationError,
} from "./domain/prediction-evaluation.js";
export type {
  ConfidenceCorrectness,
  CreatePredictionEvaluationRecordInput,
  EvaluationMetrics,
  EvaluationStatus,
  FeatureCoverageMetrics,
  GoalRangeBucket,
  PredictionEvaluationRecord,
  RuleCoverageMetrics,
  ScenarioHitMetrics,
  SealedGoalRange,
  SealedPredictionInput,
  SealedRuleSnapshot,
  SealedScenario,
  SealedScoreline,
} from "./domain/prediction-evaluation.js";

export {
  CORE_EVALUATION_FEATURE_NAMES,
  evaluatePrediction,
  goalRangeBucket,
  predictedGoalRangeBucket,
  predictedWinnerFromProbs,
  PredictionEvaluationError,
} from "./evaluation/evaluate-prediction.js";
export type { EvaluatePredictionInput } from "./evaluation/evaluate-prediction.js";

export {
  findActualMatchResult,
  mapActualMatchResultFromEvidence,
  ActualMatchResultMappingError,
} from "./evaluation/map-actual-match-result.js";

export {
  EVALUATION_POPULATION_DEMO_V1,
  loadEvaluationDemoPopulationRows,
  scoreEvaluationPopulation,
  summarizeEvaluationPopulation,
  EvaluationPopulationError,
} from "./evaluation/evaluation-population.js";
export type {
  EvaluationPopulationRow,
  EvaluationPopulationSummary,
} from "./evaluation/evaluation-population.js";

export {
  createEvaluationHistoryRecord,
  EVALUATION_HISTORY_SCHEMA_VERSION,
  EvaluationHistoryValidationError,
} from "./domain/evaluation-history.js";
export type {
  CreateEvaluationHistoryRecordInput,
  EvaluationHistoryRecord,
} from "./domain/evaluation-history.js";

export { buildEvaluationHistoryRecord } from "./evaluation/build-evaluation-history-record.js";
export type { BuildEvaluationHistoryRecordInput } from "./evaluation/build-evaluation-history-record.js";

export { DuplicateEvaluationHistoryError } from "./repository/evaluation-history-repository.js";
export type {
  EvaluationHistoryQuery,
  EvaluationHistoryRepository,
} from "./repository/evaluation-history-repository.js";
export { InMemoryEvaluationHistoryRepository } from "./repository/in-memory-evaluation-history-repository.js";

export {
  CONFIDENCE_BANDS,
  GOAL_RANGE_BUCKETS,
  MATCH_OUTCOME_LABELS,
  MINIMUM_QUALIFIED_BUCKET_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_REPORT_SAMPLE_SIZE,
  PREDICTION_CALIBRATION_REPORT_MODEL_VERSION,
  PredictionCalibrationReportValidationError,
} from "./domain/prediction-calibration-report.js";
export type {
  CalibrationErrorMetric,
  ConfidenceBandLabel,
  ConfidenceBucketAccuracyRow,
  ConfidenceDistributionRow,
  GoalRangeCalibrationRow,
  MatchOutcomeLabel,
  OutcomeCalibrationRow,
  PredictionCalibrationProvenance,
  PredictionCalibrationReport,
  ProbabilityBucketRow,
} from "./domain/prediction-calibration-report.js";

export { computePredictionCalibrationReport } from "./reliability/compute-prediction-calibration-report.js";
export type { ComputePredictionCalibrationReportInput } from "./reliability/compute-prediction-calibration-report.js";

export {
  FEATURE_PROFILE_IDS,
  FEATURE_PROFILE_LABELS,
  MINIMUM_QUALIFIED_PROFILE_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_SEGMENT_SAMPLE_SIZE,
  VALIDATION_REPORT_MODEL_VERSION,
  ValidationReportValidationError,
} from "./domain/validation-report.js";
export type {
  FeatureProfileId,
  ValidationMetricSummary,
  ValidationProfileRow,
  ValidationProvenance,
  ValidationReport,
} from "./domain/validation-report.js";

export {
  ADVANCED_STATISTICS_FEATURE_NAMES,
  CLUB_INTELLIGENCE_FEATURE_NAMES,
  EXPECTED_GOALS_FEATURE_NAMES,
  MATCH_CONTEXT_FEATURE_NAMES,
  PLAYER_INTELLIGENCE_FEATURE_NAMES,
  classifyFeatureProfile,
} from "./validation/feature-profile.js";

export { computeValidationReport } from "./validation/compute-validation-report.js";
export type { ComputeValidationReportInput } from "./validation/compute-validation-report.js";

export {
  CONTRIBUTION_REPORT_MODEL_VERSION,
  INTELLIGENCE_DOMAIN_IDS,
  INTELLIGENCE_DOMAIN_LABELS,
  MINIMUM_QUALIFIED_DOMAIN_SAMPLE_SIZE,
  MINIMUM_QUALIFIED_DOMAIN_SEGMENT_SAMPLE_SIZE,
  ContributionReportValidationError,
} from "./domain/contribution-report.js";
export type {
  ContributionProvenance,
  ContributionReport,
  DomainContributionRow,
  IntelligenceDomainId,
} from "./domain/contribution-report.js";

export {
  AVAILABILITY_INTELLIGENCE_FEATURE_NAMES,
  INTELLIGENCE_DOMAIN_FEATURE_NAMES,
  MARKET_INTELLIGENCE_FEATURE_NAMES,
  MATCH_CONTEXT_DOMAIN_FEATURE_NAMES,
  VENUE_INTELLIGENCE_FEATURE_NAMES,
  hasDomainFeatures,
} from "./contribution/domain-feature-families.js";

export { computeContributionReport } from "./contribution/compute-contribution-report.js";
export type { ComputeContributionReportInput } from "./contribution/compute-contribution-report.js";
