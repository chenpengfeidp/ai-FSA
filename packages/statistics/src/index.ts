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
  MANAGER_INTELLIGENCE_FEATURE_NAMES,
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

export {
  PROJECTION_REPLAY_COMPARISON_REPORT_MODEL_VERSION,
  MINIMUM_QUALIFIED_REPLAY_SEGMENT_SAMPLE_SIZE,
  ProjectionReplayComparisonReportValidationError,
} from "./domain/projection-replay-comparison-report.js";
export type {
  ProjectionReplayAccuracyBlock,
  ProjectionReplayAccuracyDelta,
  ProjectionReplayComparisonReport,
  ProjectionReplayComparisonSegment,
  ProjectionReplayMetricSummary,
} from "./domain/projection-replay-comparison-report.js";

export type {
  ProjectionReplaySidecar,
  SealedProjectionReplayContext,
  SealedReplayFeatureSnapshot,
  SealedRuleReplaySnapshot,
} from "./replay/projection-replay-context.js";
export {
  computeProjectionReplayMetrics,
  pearsonCorrelation,
} from "./replay/projection-replay-metrics.js";
export type { ProjectionReplayMetrics } from "./replay/projection-replay-metrics.js";
export { isProjectionReplayResult } from "./replay/projection-replay-port.js";
export type {
  ProjectionReplayPort,
  ProjectionReplayPortInput,
  ProjectionReplayPortOutcome,
  ProjectionReplayPortResult,
  ProjectionReplayPortSkip,
  ProjectionReplayVersion,
} from "./replay/projection-replay-port.js";
export { ReplayRunner } from "./replay/replay-runner.js";
export type {
  ProjectionReplayRecordOutcome,
  ReplayRunnerInput,
  ReplayRunnerResult,
} from "./replay/replay-runner.js";
export { computeProjectionReplayComparisonReport } from "./replay/compute-projection-replay-comparison-report.js";
export type { ComputeProjectionReplayComparisonReportInput } from "./replay/compute-projection-replay-comparison-report.js";
export {
  PROJECTION_REPLAY_REPORT_MODEL_VERSION,
  ProjectionReplayReportValidationError,
} from "./domain/projection-replay-report.js";
export type {
  FootballStateContribution,
  ProjectionReplayReport,
  ProjectionVersionComparison,
  ReplaySummary,
  ScriptContribution,
} from "./domain/projection-replay-report.js";
export type {
  ProjectionReplayFootballStateSnapshot,
  ProjectionReplayMatchScriptSnapshot,
  ProjectionReplayMetadata,
} from "./replay/projection-replay-metadata.js";
export type { ProjectionReplaySidecarRepository } from "./repository/projection-replay-sidecar-repository.js";
export {
  ConflictProjectionReplaySidecarError,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
} from "./repository/projection-replay-sidecar-repository.js";
export { InMemoryProjectionReplaySidecarRepository } from "./repository/in-memory-projection-replay-sidecar-repository.js";
export type { ProjectionReplaySidecarRecord } from "./replay/projection-replay-sidecar-record.js";
export {
  SUPPORTED_PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSIONS,
  canonicalSidecarContextJson,
  isSupportedProjectionReplaySidecarSchemaVersion,
} from "./replay/projection-replay-sidecar-record.js";
export { computeProjectionReplaySidecarContentSha256 } from "./replay/sidecar-content-sha256.js";
export type {
  ProjectionReplayEligibilityAssessment,
  ProjectionReplayEligibilityReason,
  SidecarContentSha256Fn,
} from "./replay/assess-projection-replay-eligibility.js";
export { assessProjectionReplayEligibility } from "./replay/assess-projection-replay-eligibility.js";
export type {
  SidecarBackfillAssessment,
  SidecarBackfillClassification,
} from "./replay/classify-sidecar-backfill.js";
export { classifySidecarBackfill } from "./replay/classify-sidecar-backfill.js";
export type { ProjectionReplayEligibilitySummary } from "./replay/summarize-projection-replay-eligibility.js";
export {
  assessHistoryProjectionReplayEligibility,
  summarizeProjectionReplayEligibility,
} from "./replay/summarize-projection-replay-eligibility.js";
export {
  REPLAY_COHORT_ORDERING_HISTORY_ID_ASC,
  REPLAY_COHORT_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  ReplayCohortValidationError,
  createDefaultReplayCohortSpecification,
} from "./domain/replay-cohort.js";
export type {
  ReplayCohort,
  ReplayCohortMember,
  ReplayCohortOrdering,
  ReplayCohortSpecification,
  ReplayCohortStatus,
} from "./domain/replay-cohort.js";
export {
  computeReplayCohortMembershipDigestSha256,
  canonicalReplayCohortMembershipJson,
} from "./replay/compute-replay-cohort-membership-digest.js";
export { selectReplayCohortMembers } from "./replay/select-replay-cohort-members.js";
export type { ReplayCohortMembershipSelection } from "./replay/select-replay-cohort-members.js";
export { buildReplayCohort } from "./replay/build-replay-cohort.js";
export {
  createAndSealReplayCohort,
  resolveSealedReplayCohort,
} from "./replay/create-sealed-replay-cohort.js";
export type { CreateSealedReplayCohortOutcome } from "./replay/create-sealed-replay-cohort.js";
export type { ReplayCohortRepository } from "./repository/replay-cohort-repository.js";
export {
  ConflictReplayCohortError,
  ReplayCohortNotFoundError,
  SealedReplayCohortImmutableError,
} from "./repository/replay-cohort-repository.js";
export { InMemoryReplayCohortRepository } from "./repository/in-memory-replay-cohort-repository.js";
export { computeProjectionReplayReport } from "./replay/compute-projection-replay-report.js";
export type { ComputeProjectionReplayReportInput } from "./replay/compute-projection-replay-report.js";
export { runProjectionReplayReport } from "./replay/run-projection-replay-report.js";
export type { RunProjectionReplayReportInput } from "./replay/run-projection-replay-report.js";
export { runProjectionReplayValidation } from "./replay/run-projection-replay-validation.js";
export type { RunProjectionReplayValidationInput } from "./replay/run-projection-replay-validation.js";

export {
  PROJECTION_DIAGNOSTICS_REPORT_MODEL_VERSION,
  MINIMUM_QUALIFIED_DIAGNOSTICS_SAMPLE_SIZE,
  ProjectionDiagnosticsReportValidationError,
} from "./domain/projection-diagnostics-report.js";
export type {
  ConfidenceBucketRow,
  ConfidenceDiagnostics,
  FailureCategory,
  FailureCategoryCount,
  FailureDistribution,
  FootballStateDiagnostics,
  FootballStateDiagnosticsRow,
  ProjectionDiagnosticsReport,
  RuleActivationRow,
  RuleConflictPairRow,
  RuleDiagnostics,
  RuleIncorrectCorrelationRow,
  RuleSaturationSummary,
  ScriptDiagnostics,
  ScriptDiagnosticsRow,
} from "./domain/projection-diagnostics-report.js";
export { computeProjectionDiagnosticsReport } from "./diagnostics/compute-projection-diagnostics-report.js";
export type { ComputeProjectionDiagnosticsReportInput } from "./diagnostics/compute-projection-diagnostics-report.js";
export { runProjectionDiagnosticsReport } from "./diagnostics/run-projection-diagnostics-report.js";
export type { RunProjectionDiagnosticsReportInput } from "./diagnostics/run-projection-diagnostics-report.js";
