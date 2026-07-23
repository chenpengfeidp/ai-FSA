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
