import type { AnalysisResult, AnalyzeMatchResult } from "@fas/analysis";
import type { MatchId } from "@fas/match";
import type { AnalysisReport } from "../domain/analysis-report.js";

type AnalysisFailure = Extract<AnalyzeMatchResult, { ok: false }>;

export interface AnalyzeMatchOperation {
  execute(matchId: MatchId): Promise<AnalyzeMatchResult>;
}

export interface AnalysisReportBuilder {
  build(analysis: AnalysisResult): AnalysisReport;
}

export type ReportGenerationErrorCode = "ANALYSIS_FAILED" | "REPORT_BUILD_FAILED";

export interface ReportGenerationError {
  readonly code: ReportGenerationErrorCode;
  readonly message: string;
}

export type ReportGenerationFailure = Readonly<{
  error: ReportGenerationError;
  ok: false;
}>;

export type GenerateMatchReportResult =
  | AnalysisFailure
  | AnalysisReport
  | ReportGenerationFailure;

function failure(
  code: ReportGenerationErrorCode,
  message: string,
): ReportGenerationFailure {
  return Object.freeze({
    error: Object.freeze({ code, message }),
    ok: false,
  });
}

export class GenerateMatchReportUseCase {
  readonly #analyzeMatch: AnalyzeMatchOperation;
  readonly #reportBuilder: AnalysisReportBuilder;

  constructor(
    analyzeMatch: AnalyzeMatchOperation,
    reportBuilder: AnalysisReportBuilder,
  ) {
    this.#analyzeMatch = analyzeMatch;
    this.#reportBuilder = reportBuilder;
  }

  async execute(matchId: MatchId): Promise<GenerateMatchReportResult> {
    let analysis: AnalyzeMatchResult;

    try {
      analysis = await this.#analyzeMatch.execute(matchId);
    } catch {
      return failure("ANALYSIS_FAILED", "Match analysis failed unexpectedly.");
    }

    if (!analysis.ok) {
      return analysis;
    }

    try {
      return this.#reportBuilder.build(analysis.value);
    } catch {
      return failure(
        "REPORT_BUILD_FAILED",
        "Analysis report generation failed unexpectedly.",
      );
    }
  }
}
