import {
  buildProjectionParameterCatalog,
  buildProjectionReplayContext,
  buildSealedPredictionInput,
  extractMatchContextForHistory,
  AnalysisProjectionReplayPort,
  createAnalysisProvenanceMetadata,
  type AnalysisProvenanceMetadata,
  type AnalysisResult,
  type AnalyzeMatchResult,
  type FixtureResolutionMetadata,
  type ProjectionParameterCatalog,
  type ProjectionPolicyPin,
} from "@fas/analysis";
import type { MatchId } from "@fas/match";
import {
  buildEvaluationHistoryRecord,
  computeContributionReport,
  computePredictionCalibrationReport,
  computeProjectionDiagnosticsReport,
  computeValidationReport,
  ConflictProjectionReplaySidecarError,
  runProjectionReplayReport,
  type ContributionReport,
  type EvaluationHistoryRecord,
  type EvaluationHistoryRepository,
  type PredictionCalibrationReport,
  type ProjectionDiagnosticsReport,
  type ProjectionReplayReport,
  type ProjectionReplaySidecarRepository,
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
  | "PROJECTION_REPLAY_SIDECAR_FAILED"
  | "PROJECTION_REPLAY_REPORT_FAILED"
  | "PROJECTION_DIAGNOSTICS_REPORT_FAILED"
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

export interface GenerateMatchReportOptions {
  readonly fixtureResolution?: FixtureResolutionMetadata;
}

export type GenerateMatchReportResult =
  | AnalysisFailure
  | AnalysisReport
  | ReportGenerationFailure;

function attachAnalysisProvenance(
  report: AnalysisReport,
  provenance: AnalysisProvenanceMetadata,
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
    analysisProvenance: provenance,
    ...(report.actualResult === undefined
      ? {}
      : { actualResult: report.actualResult }),
    ...(report.evaluation === undefined ? {} : { evaluation: report.evaluation }),
    ...(report.projectionFramework === undefined
      ? {}
      : { projectionFramework: report.projectionFramework }),
    ...(report.footballState === undefined
      ? {}
      : { footballState: report.footballState }),
    ...(report.analysisProvenance === undefined
      ? {}
      : { analysisProvenance: report.analysisProvenance }),
  });
}

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
  projectionReplay: ProjectionReplayReport | undefined,
  projectionDiagnostics: ProjectionDiagnosticsReport | undefined,
  projectionParameters: ProjectionParameterCatalog,
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
    ...(report.projectionFramework === undefined
      ? {}
      : { projectionFramework: report.projectionFramework }),
    ...(report.footballState === undefined
      ? {}
      : { footballState: report.footballState }),
    ...(report.analysisProvenance === undefined
      ? {}
      : { analysisProvenance: report.analysisProvenance }),
    ...(evaluationHistory.length === 0 ? {} : { evaluationHistory }),
    calibration,
    validation,
    contribution,
    ...(projectionReplay === undefined ? {} : { projectionReplay }),
    ...(projectionDiagnostics === undefined ? {} : { projectionDiagnostics }),
    projectionParameters,
  });
}

async function persistAndLoadHistory(
  analysis: AnalysisResult,
  report: AnalysisReport,
  repository: EvaluationHistoryRepository,
  sidecarRepository: ProjectionReplaySidecarRepository | undefined,
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

  if (sidecarRepository !== undefined) {
    try {
      await sidecarRepository.save({
        historyId: historyRecord.historyId,
        matchId: historyRecord.matchId,
        context: buildProjectionReplayContext(analysis),
      });
    } catch (error) {
      if (error instanceof ConflictProjectionReplaySidecarError) {
        throw error;
      }

      const reason =
        error instanceof Error ? error.message : "unknown sidecar persistence error";
      throw new Error(
        `Projection Replay Sidecar persistence failed after Evaluation History was saved (${reason}).`,
      );
    }
  }

  return repository.findByMatch(analysis.matchId);
}

export class GenerateMatchReportUseCase {
  readonly #analyzeMatch: AnalyzeMatchOperation;
  readonly #reportBuilder: AnalysisReportBuilder;
  readonly #evaluationHistoryRepository: EvaluationHistoryRepository | undefined;
  readonly #projectionReplaySidecarRepository:
    | ProjectionReplaySidecarRepository
    | undefined;
  readonly #projectionReplayPort = new AnalysisProjectionReplayPort();
  readonly #projectionPolicyPin: ProjectionPolicyPin;

  constructor(
    analyzeMatch: AnalyzeMatchOperation,
    reportBuilder: AnalysisReportBuilder,
    evaluationHistoryRepository?: EvaluationHistoryRepository,
    projectionReplaySidecarRepository?: ProjectionReplaySidecarRepository,
    projectionPolicyPin: ProjectionPolicyPin = "v2",
  ) {
    this.#analyzeMatch = analyzeMatch;
    this.#reportBuilder = reportBuilder;
    this.#evaluationHistoryRepository = evaluationHistoryRepository;
    this.#projectionReplaySidecarRepository = projectionReplaySidecarRepository;
    this.#projectionPolicyPin = projectionPolicyPin;
  }

  async execute(
    matchId: MatchId,
    options?: GenerateMatchReportOptions,
  ): Promise<GenerateMatchReportResult> {
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
      report = attachAnalysisProvenance(
        report,
        createAnalysisProvenanceMetadata({
          projectionPolicyPin: this.#projectionPolicyPin,
          ...(options?.fixtureResolution === undefined
            ? {}
            : { fixtureResolution: options.fixtureResolution }),
        }),
      );
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
        this.#projectionReplaySidecarRepository,
      );
    } catch (error) {
      if (error instanceof ConflictProjectionReplaySidecarError) {
        return failure("PROJECTION_REPLAY_SIDECAR_FAILED", error.message);
      }

      if (
        error instanceof Error &&
        error.message.startsWith(
          "Projection Replay Sidecar persistence failed after Evaluation History was saved",
        )
      ) {
        return failure("PROJECTION_REPLAY_SIDECAR_FAILED", error.message);
      }

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

    let projectionReplay: ProjectionReplayReport | undefined;
    let projectionDiagnostics: ProjectionDiagnosticsReport | undefined;

    if (this.#projectionReplaySidecarRepository !== undefined) {
      try {
        const replayResult = await runProjectionReplayReport({
          repository: this.#evaluationHistoryRepository,
          sidecarRepository: this.#projectionReplaySidecarRepository,
          replayPort: this.#projectionReplayPort,
          computedAt,
        });
        projectionReplay = replayResult.report;
        projectionDiagnostics = computeProjectionDiagnosticsReport({
          replayResult: replayResult.replayResult,
          sourceRecords: populationRecords,
          computedAt,
        });
      } catch {
        return failure(
          "PROJECTION_REPLAY_REPORT_FAILED",
          "Projection Replay Validation computation failed unexpectedly.",
        );
      }
    }

    return withOverlays(
      report,
      evaluationHistory,
      calibration,
      validation,
      contribution,
      projectionReplay,
      projectionDiagnostics,
      buildProjectionParameterCatalog(
        report.projectionFramework === undefined
          ? undefined
          : {
              usedVersionLabel: report.projectionFramework.parameterVersionLabel,
            },
      ),
    );
  }
}
