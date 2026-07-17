export { ReportBuilder } from "./builder/report-builder.js";
export {
  createAnalysisReport,
  AnalysisReportValidationError,
} from "./domain/analysis-report.js";
export type {
  AnalysisReport,
  CreateAnalysisReportInput,
} from "./domain/analysis-report.js";
export { GenerateMatchReportUseCase } from "./use-case/generate-match-report-use-case.js";
export type {
  AnalysisReportBuilder,
  AnalyzeMatchOperation,
  GenerateMatchReportResult,
  ReportGenerationError,
  ReportGenerationErrorCode,
  ReportGenerationFailure,
} from "./use-case/generate-match-report-use-case.js";
