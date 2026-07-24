import {
  buildSealedPredictionInput,
  extractMatchContextForHistory,
  type AnalysisResult,
  type AnalyzeMatchResult,
} from "@fas/analysis";
import type { MatchId } from "@fas/match";
import {
  buildEvaluationHistoryRecord,
  computeContributionReport,
  computePredictionCalibrationReport,
  computeValidationReport,
  type ContributionReport,
  type EvaluationHistoryRecord,
  type EvaluationHistoryRepository,
  type PredictionCalibrationReport,
  type ValidationReport,
} from "@fas/statistics";
import type { AnalysisReport } from "../domain/analysis-report.js";
import { createAnalysisReport } from "../domain/analysis-report.js";

type AnalysisFailure = Extract<AnalyzeMatchResult, { ok: false }>;

export interface AnalyzeMatchOperation {
  execute(matchId: MatchId): Promise<AnalyzeMatchResult>;
}

export interface AnalysisReportBuilder {
  build(analysis: AnalysisResult): AnalysisReport;
}

export type ReportGenerationErrorCode =
  | "ANALYSIS_FAILED"
  | "CALIBRATION_REPORT_FAILED"
  | "CONTRIBUTION_REPORT_FAILED"
  | "EVALUATION_HISTORY_FAILED"
  | "REPORT_BUILD_FAILED"
  | "VALIDATION_REPORT_FAILED";

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

/**
 * Loads the FULL Evaluation History population once (never scoped to a
 * single match) so the A2 Prediction Calibration overlay, the V1A
 * Validation overlay, and the O1 Contribution overlay all measure the
 * exact same sealed population without querying History three times.
 * Pure read — never mutates History.
 */
async function queryFullEvaluationHistoryPopulation(
  repository: EvaluationHistoryRepository,
): Promise<readonly EvaluationHistoryRecord[]> {
  return repository.query({});
}

function withOverlays(
  report: AnalysisReport,
  evaluationHistory: readonly EvaluationHistoryRecord[],
  calibration: PredictionCalibrationReport,
  validation: ValidationReport,
  contribution: ContributionReport,
): AnalysisReport {
  return createAnalysisReport({
    reportId: report.reportId,
    matchId: report.matchId,
    generatedAt: report.generatedAt,
    summary: report.summary,
    features: report.features,
    rules: report.rules,
    deterministic: report.deterministic,
    scenarios: report.scenarios,
    intelligenceConfidence: report.intelligenceConfidence,
    narrative: report.narrative,
    ...(report.actualResult === undefined
      ? {}
      : { actualResult: report.actualResult }),
    ...(report.evaluation === undefined ? {} : { evaluation: report.evaluation }),
    ...(evaluationHistory.length === 0 ? {} : { evaluationHistory }),
    calibration,
    validation,
    contribution,
  });
}

async function persistAndLoadHistory(
  analysis: AnalysisResult,
  report: AnalysisReport,
  repository: EvaluationHistoryRepository,
): Promise<readonly EvaluationHistoryRecord[]> {
  const evaluation = report.evaluation;
  const actualResult = report.actualResult;
  const matchContext = extractMatchContextForHistory(analysis);

  if (
    evaluation === undefined ||
    evaluation.status !== "scored" ||
    actualResult === undefined ||
    matchContext === undefined
  ) {
    return repository.findByMatch(analysis.matchId);
  }

  const historyRecord = buildEvaluationHistoryRecord({
    predictionSnapshot: buildSealedPredictionInput(analysis),
    actualResult,
    evaluation,
    homeTeam: matchContext.homeTeam,
    awayTeam: matchContext.awayTeam,
    matchDate: matchContext.matchDate,
    recordedAt: analysis.generatedAt,
  });

  await repository.save(historyRecord);
  return repository.findByMatch(analysis.matchId);
}

export class GenerateMatchReportUseCase {
  readonly #analyzeMatch: AnalyzeMatchOperation;
  readonly #reportBuilder: AnalysisReportBuilder;
  readonly #evaluationHistoryRepository: EvaluationHistoryRepository | undefined;

  constructor(
    analyzeMatch: AnalyzeMatchOperation,
    reportBuilder: AnalysisReportBuilder,
    evaluationHistoryRepository?: EvaluationHistoryRepository,
  ) {
    this.#analyzeMatch = analyzeMatch;
    this.#reportBuilder = reportBuilder;
    this.#evaluationHistoryRepository = evaluationHistoryRepository;
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

    let report: AnalysisReport;

    try {
      report = this.#reportBuilder.build(analysis.value);
    } catch {
      return failure(
        "REPORT_BUILD_FAILED",
        "Analysis report generation failed unexpectedly.",
      );
    }

    if (this.#evaluationHistoryRepository === undefined) {
      return report;
    }

    let evaluationHistory: readonly EvaluationHistoryRecord[];

    try {
      evaluationHistory = await persistAndLoadHistory(
        analysis.value,
        report,
        this.#evaluationHistoryRepository,
      );
    } catch {
      return failure(
        "EVALUATION_HISTORY_FAILED",
        "Evaluation History persistence failed unexpectedly.",
      );
    }

    let populationRecords: readonly EvaluationHistoryRecord[];

    try {
      populationRecords = await queryFullEvaluationHistoryPopulation(
        this.#evaluationHistoryRepository,
      );
    } catch {
      return failure(
        "EVALUATION_HISTORY_FAILED",
        "Evaluation History population query failed unexpectedly.",
      );
    }

    const computedAt = analysis.value.generatedAt;
    let calibration: PredictionCalibrationReport;

    try {
      calibration = computePredictionCalibrationReport({
        records: populationRecords,
        computedAt,
      });
    } catch {
      return failure(
        "CALIBRATION_REPORT_FAILED",
        "Prediction Calibration computation failed unexpectedly.",
      );
    }

    let validation: ValidationReport;

    try {
      validation = computeValidationReport({
        records: populationRecords,
        computedAt,
      });
    } catch {
      return failure(
        "VALIDATION_REPORT_FAILED",
        "Football Intelligence Validation computation failed unexpectedly.",
      );
    }

    let contribution: ContributionReport;

    try {
      contribution = computeContributionReport({
        records: populationRecords,
        computedAt,
      });
    } catch {
      return failure(
        "CONTRIBUTION_REPORT_FAILED",
        "Football Intelligence Contribution computation failed unexpectedly.",
      );
    }

    return withOverlays(
      report,
      evaluationHistory,
      calibration,
      validation,
      contribution,
    );
  }
}
