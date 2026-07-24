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
