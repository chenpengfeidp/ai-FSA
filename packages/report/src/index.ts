export { ReportBuilder } from "./builder/report-builder.js";
export {
  createAnalysisReport,
  AnalysisReportValidationError,
} from "./domain/analysis-report.js";
export type {
  AnalysisReport,
  CreateAnalysisReportInput,
} from "./domain/analysis-report.js";
export { buildMvpIntelligenceNarrative } from "./narrative/mvp/build-mvp-narrative.js";
export { GenerateMatchReportUseCase } from "./use-case/generate-match-report-use-case.js";
export type {
  AnalysisReportBuilder,
  AnalyzeMatchOperation,
  GenerateMatchReportResult,
  ReportGenerationError,
  ReportGenerationErrorCode,
  ReportGenerationFailure,
} from "./use-case/generate-match-report-use-case.js";
export {
  DEFAULT_VALIDATION_BOOTSTRAP_MATCH_IDS,
  DEFAULT_VALIDATION_BOOTSTRAP_OUTCOMES,
  VALIDATION_BOOTSTRAP_MATCH_RESULT_PROVIDER_SOURCE,
  ValidationBootstrapError,
  bootstrapValidationHistorySidecar,
} from "./validation/bootstrap-validation-history-sidecar.js";
export type {
  ValidationBootstrapFtOutcome,
  ValidationBootstrapMatchResult,
  ValidationBootstrapResult,
  ValidationBootstrapRuleAudit,
} from "./validation/bootstrap-validation-history-sidecar.js";
export {
  P2KG_RECOVERY_V2_MATCH_IDS,
  P2KG_RECOVERY_V2_OUTCOMES,
  P2KG_RECOVERY_V2_PROJECTION_POLICY_PIN,
  P2KG_RECOVERY_V2_TEMPLATE_MATCH_IDS,
  ProjectionV2BootstrapError,
  bootstrapProjectionV2ValidationHistorySidecar,
} from "./validation/bootstrap-projection-v2-validation-history-sidecar.js";
export type {
  ProjectionV2BootstrapMatchResult,
  ProjectionV2BootstrapParameterProvenance,
  ProjectionV2BootstrapResult,
  ProjectionV2BootstrapRuleAudit,
} from "./validation/bootstrap-projection-v2-validation-history-sidecar.js";
