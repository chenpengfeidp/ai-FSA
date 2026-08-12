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
