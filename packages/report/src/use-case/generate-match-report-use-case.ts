import {
  buildProjectionParameterCatalog,
  buildProjectionReplayContext,
  buildSealedPredictionInput,
  extractMatchContextForHistory,
  AnalysisProjectionReplayPort,
  createAnalysisProvenanceMetadata,
  type AnalysisProvenanceMetadata,
  type AnalysisResult,
  type AnalyzeMatchOptions,
  type AnalyzeMatchResult,
  type FixtureResolutionMetadata,
  type ProjectionParameterCatalog,
  type ProjectionPolicyPin,
} from "@fas/analysis";
import type { MatchId } from "@fas/match";
import {
  buildEvaluationHistoryRecord,
  capturePrematchPredictionSeal,
  computeContributionReport,
  computePredictionCalibrationReport,
  computeProjectionDiagnosticsReport,
  computeValidationReport,
  ConflictProjectionReplaySidecarError,
  PrematchPredictionSealError,
  runProjectionReplayReport,
  type Clock,
  type ContributionReport,
  type EvaluationHistoryRecord,
  type EvaluationHistoryRepository,
  type PrematchFixtureIdentity,
  type PrematchPredictionSealRepository,
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
  execute(
    matchId: MatchId,
    options?: AnalyzeMatchOptions,
  ): Promise<AnalyzeMatchResult>;
}

export interface AnalysisReportBuilder {
  build(analysis: AnalysisResult): AnalysisReport;
}

export type ReportGenerationErrorCode =
  | "ANALYSIS_FAILED"
  | "CALIBRATION_REPORT_FAILED"
  | "CONTRIBUTION_REPORT_FAILED"
  | "EVALUATION_HISTORY_FAILED"
  | "PREMATCH_SEAL_FAILED"
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

function isPrematchSealError(error: unknown): error is PrematchPredictionSealError {
  return (
    error instanceof PrematchPredictionSealError ||
    (error instanceof Error &&
      error.name === "PrematchPredictionSealError" &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPrematchFixtureIdentity(
  analysis: AnalysisResult,
): PrematchFixtureIdentity | undefined {
  const matchInfo = analysis.evidenceSet.find(
    (evidence) => evidence.type === "MATCH_INFO",
  );

  if (matchInfo === undefined || !isRecord(matchInfo.payload)) {
    return undefined;
  }

  const home =
    typeof matchInfo.payload.home === "string" ? matchInfo.payload.home.trim() : "";
  const away =
    typeof matchInfo.payload.away === "string" ? matchInfo.payload.away.trim() : "";
  const kickoff =
    typeof matchInfo.payload.kickoff === "string"
      ? matchInfo.payload.kickoff.trim()
      : "";
  const competitionId =
    typeof matchInfo.payload.competitionId === "string"
      ? matchInfo.payload.competitionId.trim()
      : "";
  const competitionName =
    typeof matchInfo.payload.competitionName === "string"
      ? matchInfo.payload.competitionName.trim()
      : typeof matchInfo.payload.competition === "string"
        ? matchInfo.payload.competition.trim()
        : "";
  const season =
    typeof matchInfo.payload.season === "string"
      ? matchInfo.payload.season.trim()
      : typeof matchInfo.payload.season === "number"
        ? String(matchInfo.payload.season)
        : "";

  if (
    home.length === 0 ||
    away.length === 0 ||
    kickoff.length === 0 ||
    competitionId.length === 0 ||
    competitionName.length === 0 ||
    season.length === 0
  ) {
    return undefined;
  }

  return Object.freeze({
    matchId: analysis.matchId,
    homeTeam: home,
    awayTeam: away,
    competitionId,
    competitionName,
    season,
    kickoff,
  });
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
  readonly #clock: Clock | undefined;
  readonly #prematchSealRepository: PrematchPredictionSealRepository | undefined;

  constructor(
    analyzeMatch: AnalyzeMatchOperation,
    reportBuilder: AnalysisReportBuilder,
    evaluationHistoryRepository?: EvaluationHistoryRepository,
    projectionReplaySidecarRepository?: ProjectionReplaySidecarRepository,
    projectionPolicyPin: ProjectionPolicyPin = "v2",
    clock?: Clock,
    prematchSealRepository?: PrematchPredictionSealRepository,
  ) {
    this.#analyzeMatch = analyzeMatch;
    this.#reportBuilder = reportBuilder;
    this.#evaluationHistoryRepository = evaluationHistoryRepository;
    this.#projectionReplaySidecarRepository = projectionReplaySidecarRepository;
    this.#projectionPolicyPin = projectionPolicyPin;
    this.#clock = clock;
    this.#prematchSealRepository = prematchSealRepository;
  }

  async execute(
    matchId: MatchId,
    options?: GenerateMatchReportOptions,
  ): Promise<GenerateMatchReportResult> {
    let analysis: AnalyzeMatchResult;
    const clock = this.#clock;
    const sealRepository = this.#prematchSealRepository;
    const captureEnabled = clock !== undefined && sealRepository !== undefined;
    const analysisTime = captureEnabled ? clock.now() : undefined;
    const cutoffOptions: AnalyzeMatchOptions | undefined =
      analysisTime === undefined
        ? undefined
        : { analysisTime, analysisCutoff: analysisTime };

    try {
      analysis = await this.#analyzeMatch.execute(matchId, cutoffOptions);
    } catch {
      return failure("ANALYSIS_FAILED", "Match analysis failed unexpectedly.");
    }

    if (
      !analysis.ok &&
      analysis.error.code === "SEAL_NOT_PRE_MATCH" &&
      cutoffOptions !== undefined
    ) {
      try {
        analysis = await this.#analyzeMatch.execute(matchId);
      } catch {
        return failure("ANALYSIS_FAILED", "Match analysis failed unexpectedly.");
      }
    }

    if (!analysis.ok) {
      return analysis;
    }

    if (captureEnabled && analysisTime !== undefined) {
      const fixture = extractPrematchFixtureIdentity(analysis.value);

      if (
        fixture !== undefined &&
        Date.parse(analysisTime) < Date.parse(fixture.kickoff)
      ) {
        const sealedAt = clock.now();
        const snapshot = buildSealedPredictionInput(analysis.value);
        const framework = analysis.value.projectionFramework;

        try {
          await capturePrematchPredictionSeal(
            {
              fixture,
              evidenceSet: analysis.value.evidenceSet,
              predictionSnapshot: snapshot,
              featureModelVersion: analysis.value.featureBundle.featureModelVersion,
              ruleSetVersion: snapshot.ruleSetVersion ?? "",
              projectionModelVersion: snapshot.projectionModelVersion,
              projectionPolicyPin: this.#projectionPolicyPin,
              ...(framework === undefined
                ? {}
                : {
                    parameterArtifactId: framework.parameterArtifactId,
                    parameterVersionLabel: framework.parameterVersionLabel,
                    parameterArtifactChecksum: framework.parameterArtifactChecksum,
                  }),
              analysisTime,
              analysisCutoff: analysisTime,
              sealedAt,
            },
            sealRepository,
          );
        } catch (error) {
          if (isPrematchSealError(error)) {
            if (error.code === "SEAL_NOT_PRE_MATCH") {
              // Past-kickoff runs produce a report without Class A.
            } else {
              return failure("PREMATCH_SEAL_FAILED", error.message);
            }
          } else {
            return failure(
              "PREMATCH_SEAL_FAILED",
              "Authentic PRE_MATCH seal persistence failed unexpectedly.",
            );
          }
        }
      }
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
