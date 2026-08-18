import { createHash } from "node:crypto";

import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { ReplayCohort } from "../domain/replay-cohort.js";
import type {
  SealedCohortOfflineReplayMemberResult,
  SealedCohortOfflineReplayRun,
} from "../domain/sealed-cohort-offline-replay-run.js";
import { SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION } from "../domain/sealed-cohort-offline-replay-run.js";
import type { SealedPredictionInput } from "../domain/prediction-evaluation.js";
import {
  SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
  SealedCohortPopulationEvaluationError,
  type PopulationMetricComparisonRow,
  type PopulationMetricValue,
  type PopulationWinnerBreakdown,
  type SealedCohortPopulationEvaluation,
} from "../domain/sealed-cohort-population-evaluation.js";
import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import type { PopulationEvaluationRepository } from "../repository/population-evaluation-repository.js";
import type { ReplayCohortRepository } from "../repository/replay-cohort-repository.js";
import type { ReplayRunRepository } from "../repository/replay-run-repository.js";
import { computePredictionCalibrationReport } from "../reliability/compute-prediction-calibration-report.js";
import {
  computeProjectionReplayMetrics,
  pearsonCorrelation,
  type ProjectionReplayMetrics,
} from "../replay/projection-replay-metrics.js";
import { evaluatePrediction } from "./evaluate-prediction.js";

const BASELINE_LABEL = "r1b.candidate.a.baseline" as const;
const CANDIDATE_LABEL = "r1b.candidate.c.sideAwareOpen" as const;

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export interface ComputeSealedCohortPopulationEvaluationInput {
  readonly evaluationRunId: string;
  readonly cohortId: string;
  readonly baselineReplayRunId: string;
  readonly candidateReplayRunId: string;
  readonly computedAt: string;
  readonly cohortRepository: ReplayCohortRepository;
  readonly replayRunRepository: ReplayRunRepository;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly populationEvaluationRepository?: PopulationEvaluationRepository;
}

export type ComputeSealedCohortPopulationEvaluationOutcome =
  | { readonly ok: true; readonly value: SealedCohortPopulationEvaluation }
  | {
      readonly ok: false;
      readonly error: SealedCohortPopulationEvaluationError;
    };

interface PairedScoredMember {
  readonly historyId: string;
  readonly matchId: string;
  readonly actualWinner: "home" | "draw" | "away";
  readonly baselineMetrics: ProjectionReplayMetrics;
  readonly candidateMetrics: ProjectionReplayMetrics;
  readonly baselineHistory: EvaluationHistoryRecord;
  readonly candidateHistory: EvaluationHistoryRecord;
}

function roundRatio(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function requireTimestamp(value: string): string {
  if (!isoTimestampPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new SealedCohortPopulationEvaluationError(
      "INVALID_COMPUTED_AT",
      "computedAt must be a valid ISO 8601 timestamp.",
    );
  }
  return value;
}

function contextsEqual(
  left: Extract<SealedCohortOfflineReplayMemberResult, { status: "success" }>,
  right: Extract<SealedCohortOfflineReplayMemberResult, { status: "success" }>,
): boolean {
  return (
    JSON.stringify(left.historicalReplayContext) ===
    JSON.stringify(right.historicalReplayContext)
  );
}

function availableMetric(hits: number, sampleSize: number): PopulationMetricValue {
  if (sampleSize === 0) {
    return notAvailableMetric(
      0,
      "Subgroup sample size is zero; accuracy is not available.",
    );
  }

  return Object.freeze({
    availability: "available",
    value: roundRatio(hits / sampleSize),
    hitCount: hits,
    sampleSize,
    unavailableReason: undefined,
  });
}

function availableScoreMetric(
  value: number | undefined,
  sampleSize: number,
  unavailableReasonWhenMissing: string,
): PopulationMetricValue {
  if (value === undefined || sampleSize === 0) {
    return Object.freeze({
      availability: "not_available",
      value: undefined,
      hitCount: undefined,
      sampleSize,
      unavailableReason: unavailableReasonWhenMissing,
    });
  }

  return Object.freeze({
    availability: "available",
    value: roundRatio(value),
    hitCount: undefined,
    sampleSize,
    unavailableReason: undefined,
  });
}

function notAvailableMetric(
  sampleSize: number,
  reason: string,
): PopulationMetricValue {
  return Object.freeze({
    availability: "not_available",
    value: undefined,
    hitCount: undefined,
    sampleSize,
    unavailableReason: reason,
  });
}

function comparisonRow(
  metricId: string,
  metricLabel: string,
  baseline: PopulationMetricValue,
  candidate: PopulationMetricValue,
): PopulationMetricComparisonRow {
  const delta =
    baseline.availability === "available" &&
    candidate.availability === "available" &&
    baseline.value !== undefined &&
    candidate.value !== undefined
      ? roundRatio(candidate.value - baseline.value)
      : undefined;

  return Object.freeze({
    metricId,
    metricLabel,
    baseline,
    candidate,
    delta,
  });
}

function historyWithReplayPrediction(
  source: EvaluationHistoryRecord,
  prediction: SealedPredictionInput,
  evaluatedAt: string,
): EvaluationHistoryRecord {
  const evaluation = evaluatePrediction({
    prediction,
    actual: source.actualResult,
    evaluatedAt,
  });

  return Object.freeze({
    ...source,
    predictionSnapshot: prediction,
    evaluation,
  });
}

function indexResultsByHistoryId(
  run: SealedCohortOfflineReplayRun,
): Map<string, SealedCohortOfflineReplayMemberResult> {
  const map = new Map<string, SealedCohortOfflineReplayMemberResult>();
  for (const result of run.results) {
    if (map.has(result.historyId)) {
      throw new SealedCohortPopulationEvaluationError(
        "MEMBERSHIP_SET_MISMATCH",
        `Duplicate historyId "${result.historyId}" in Replay Run "${run.replayRunId}".`,
      );
    }
    map.set(result.historyId, result);
  }
  return map;
}

function validateRunAgainstCohort(
  run: SealedCohortOfflineReplayRun,
  cohort: ReplayCohort,
  role: "baseline" | "candidate",
): void {
  if (run.schemaVersion !== SEALED_COHORT_OFFLINE_REPLAY_RUN_SCHEMA_VERSION) {
    throw new SealedCohortPopulationEvaluationError(
      "UNSUPPORTED_REPLAY_RUN_SCHEMA",
      `${role} Replay Run schemaVersion "${run.schemaVersion}" is unsupported.`,
    );
  }

  if (run.cohortId !== cohort.cohortId) {
    throw new SealedCohortPopulationEvaluationError(
      "COHORT_ID_MISMATCH",
      `${role} Replay Run cohortId "${run.cohortId}" does not match sealed cohort "${cohort.cohortId}".`,
    );
  }

  if (run.membershipDigestSha256 !== cohort.membershipDigestSha256) {
    throw new SealedCohortPopulationEvaluationError(
      "RUN_MEMBERSHIP_DIGEST_MISMATCH",
      `${role} Replay Run membershipDigestSha256 does not match sealed cohort digest.`,
    );
  }

  const expectedLabel = role === "baseline" ? BASELINE_LABEL : CANDIDATE_LABEL;
  if (run.matchScriptCalibrationLabel !== expectedLabel) {
    throw new SealedCohortPopulationEvaluationError(
      "CALIBRATION_LABEL_MISMATCH",
      `${role} Replay Run label is "${run.matchScriptCalibrationLabel}"; expected "${expectedLabel}".`,
    );
  }

  if (run.productionPromoted !== false) {
    throw new SealedCohortPopulationEvaluationError(
      "CALIBRATION_LABEL_MISMATCH",
      `${role} Replay Run must record productionPromoted=false.`,
    );
  }

  if (run.results.length !== cohort.members.length) {
    throw new SealedCohortPopulationEvaluationError(
      "MEMBERSHIP_SET_MISMATCH",
      `${role} Replay Run result count (${run.results.length}) does not match sealed cohort size (${cohort.members.length}).`,
    );
  }
}

function computeChecksum(
  body: Omit<SealedCohortPopulationEvaluation, "checksum">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify(body, (_key, value) => (value === undefined ? null : value)),
    )
    .digest("hex");
}

function buildLimitations(input: {
  readonly sampleSize: number;
  readonly failedBaselineCount: number;
  readonly failedCandidateCount: number;
  readonly excludedCount: number;
  readonly calibrationQualified: boolean;
}): readonly string[] {
  const limitations: string[] = [
    "Descriptive population measurement only — not a promotion decision.",
    "Baseline A and Candidate C are scored on the identical paired evaluation population.",
    "Actual match outcomes are used only during this evaluation step.",
    "Candidate C remains NON-DEFAULT and is not production-promoted by P2K-G.",
    "Production Match Script (GOVERNED_MATCH_SCRIPT_PARAMETER_SET) is unchanged.",
    "Statistical significance / confidence intervals are not supported by existing infrastructure.",
  ];

  if (input.sampleSize === 0) {
    limitations.push(
      "Final evaluation sample size is 0; accuracy and calibration metrics are NOT AVAILABLE.",
    );
  }

  if (input.failedBaselineCount > 0 || input.failedCandidateCount > 0) {
    limitations.push(
      "Failed replay members are reported in coverage and excluded from the paired metric population (never scored asymmetrically).",
    );
  }

  if (input.excludedCount > 0) {
    limitations.push(
      `${input.excludedCount} paired success(es) excluded from metrics because evaluation metrics were undefined.`,
    );
  }

  if (!input.calibrationQualified && input.sampleSize > 0) {
    limitations.push(
      "A2 calibration sample is below the qualified threshold; Brier/ECE are directional only.",
    );
  }

  if (input.calibrationQualified && input.sampleSize > 0) {
    limitations.push(
      "A2 calibration sample meets the minimum qualified threshold; calibration qualification is not Candidate C superiority and is not a promotion decision.",
    );
  }

  return Object.freeze(limitations);
}

/**
 * P2K-G: evaluate Baseline A vs Candidate C on one SEALED cohort using persisted
 * offline Replay Runs and Evaluation History actual outcomes.
 */
export async function computeSealedCohortPopulationEvaluation(
  input: ComputeSealedCohortPopulationEvaluationInput,
): Promise<ComputeSealedCohortPopulationEvaluationOutcome> {
  try {
    const evaluationRunId = input.evaluationRunId.trim();
    if (evaluationRunId.length === 0) {
      throw new SealedCohortPopulationEvaluationError(
        "EMPTY_EVALUATION_RUN_ID",
        "evaluationRunId must be a non-empty string.",
      );
    }

    const computedAt = requireTimestamp(input.computedAt);

    const cohort = await input.cohortRepository.findByCohortId(input.cohortId);
    if (cohort === undefined) {
      throw new SealedCohortPopulationEvaluationError(
        "COHORT_NOT_FOUND",
        `Replay Cohort "${input.cohortId}" was not found.`,
      );
    }

    if (cohort.status !== "SEALED") {
      throw new SealedCohortPopulationEvaluationError(
        "COHORT_NOT_SEALED",
        `Replay Cohort "${cohort.cohortId}" is ${cohort.status}; population evaluation requires SEALED.`,
      );
    }

    if (
      !/^[0-9a-f]{64}$/.test(cohort.membershipDigestSha256) ||
      cohort.membershipDigestSha256.length === 0
    ) {
      throw new SealedCohortPopulationEvaluationError(
        "MEMBERSHIP_DIGEST_MISMATCH",
        "Sealed cohort membershipDigestSha256 is missing or malformed.",
      );
    }

    const baselineRun = await input.replayRunRepository.findByReplayRunId(
      input.baselineReplayRunId,
    );
    if (baselineRun === undefined) {
      throw new SealedCohortPopulationEvaluationError(
        "BASELINE_RUN_NOT_FOUND",
        `Baseline Replay Run "${input.baselineReplayRunId}" was not found.`,
      );
    }

    const candidateRun = await input.replayRunRepository.findByReplayRunId(
      input.candidateReplayRunId,
    );
    if (candidateRun === undefined) {
      throw new SealedCohortPopulationEvaluationError(
        "CANDIDATE_RUN_NOT_FOUND",
        `Candidate Replay Run "${input.candidateReplayRunId}" was not found.`,
      );
    }

    validateRunAgainstCohort(baselineRun, cohort, "baseline");
    validateRunAgainstCohort(candidateRun, cohort, "candidate");

    if (baselineRun.membershipDigestSha256 !== candidateRun.membershipDigestSha256) {
      throw new SealedCohortPopulationEvaluationError(
        "MEMBERSHIP_DIGEST_MISMATCH",
        "Baseline and Candidate Replay Runs have different membershipDigestSha256 values.",
      );
    }

    const baselineByHistory = indexResultsByHistoryId(baselineRun);
    const candidateByHistory = indexResultsByHistoryId(candidateRun);

    let successfulBaselineReplayCount = 0;
    let successfulCandidateReplayCount = 0;
    let failedBaselineCount = 0;
    let failedCandidateCount = 0;
    let pairedSuccessfulCount = 0;
    let excludedCount = 0;
    const scored: PairedScoredMember[] = [];

    for (const member of cohort.members) {
      const baselineResult = baselineByHistory.get(member.historyId);
      const candidateResult = candidateByHistory.get(member.historyId);

      if (baselineResult === undefined || candidateResult === undefined) {
        throw new SealedCohortPopulationEvaluationError(
          "MEMBERSHIP_SET_MISMATCH",
          `Missing Replay Run result for sealed member historyId "${member.historyId}".`,
        );
      }

      if (baselineResult.matchId !== member.matchId) {
        throw new SealedCohortPopulationEvaluationError(
          "MEMBERSHIP_SET_MISMATCH",
          `Baseline matchId mismatch for historyId "${member.historyId}".`,
        );
      }

      if (candidateResult.matchId !== member.matchId) {
        throw new SealedCohortPopulationEvaluationError(
          "MEMBERSHIP_SET_MISMATCH",
          `Candidate matchId mismatch for historyId "${member.historyId}".`,
        );
      }

      if (baselineResult.status === "success") {
        successfulBaselineReplayCount += 1;
      } else {
        failedBaselineCount += 1;
      }

      if (candidateResult.status === "success") {
        successfulCandidateReplayCount += 1;
      } else {
        failedCandidateCount += 1;
      }

      if (
        baselineResult.status !== "success" ||
        candidateResult.status !== "success"
      ) {
        continue;
      }

      if (!contextsEqual(baselineResult, candidateResult)) {
        throw new SealedCohortPopulationEvaluationError(
          "SAME_CONTEXT_VIOLATION",
          `Historical replay context differs for historyId "${member.historyId}".`,
        );
      }

      pairedSuccessfulCount += 1;

      const history = await input.historyRepository.findByHistoryId(
        member.historyId,
      );
      if (history === undefined) {
        throw new SealedCohortPopulationEvaluationError(
          "MISSING_HISTORY_OUTCOME",
          `Evaluation History "${member.historyId}" is missing; cannot score without actual outcome.`,
        );
      }

      if (history.actualResult === undefined) {
        throw new SealedCohortPopulationEvaluationError(
          "MISSING_HISTORY_OUTCOME",
          `Evaluation History "${member.historyId}" has no actualResult.`,
        );
      }

      if (history.matchId !== member.matchId) {
        throw new SealedCohortPopulationEvaluationError(
          "MEMBERSHIP_SET_MISMATCH",
          `History matchId mismatch for historyId "${member.historyId}".`,
        );
      }

      const baselineMetrics = computeProjectionReplayMetrics({
        prediction: baselineResult.prediction,
        actual: history.actualResult,
        evaluatedAt: computedAt,
      });
      const candidateMetrics = computeProjectionReplayMetrics({
        prediction: candidateResult.prediction,
        actual: history.actualResult,
        evaluatedAt: computedAt,
      });

      const baselineEval = evaluatePrediction({
        prediction: baselineResult.prediction,
        actual: history.actualResult,
        evaluatedAt: computedAt,
      });
      const candidateEval = evaluatePrediction({
        prediction: candidateResult.prediction,
        actual: history.actualResult,
        evaluatedAt: computedAt,
      });

      if (
        baselineEval.metrics === undefined ||
        candidateEval.metrics === undefined
      ) {
        excludedCount += 1;
        continue;
      }

      scored.push({
        historyId: member.historyId,
        matchId: member.matchId,
        actualWinner: history.actualResult.winner,
        baselineMetrics,
        candidateMetrics,
        baselineHistory: historyWithReplayPrediction(
          history,
          baselineResult.prediction,
          computedAt,
        ),
        candidateHistory: historyWithReplayPrediction(
          history,
          candidateResult.prediction,
          computedAt,
        ),
      });
    }

    // Extra historyIds in runs beyond sealed membership are already rejected by count equality
    // and per-member lookup; verify no orphan ids remain.
    for (const historyId of baselineByHistory.keys()) {
      if (!cohort.members.some((member) => member.historyId === historyId)) {
        throw new SealedCohortPopulationEvaluationError(
          "MEMBERSHIP_SET_MISMATCH",
          `Baseline Replay Run contains historyId "${historyId}" outside sealed cohort membership.`,
        );
      }
    }
    for (const historyId of candidateByHistory.keys()) {
      if (!cohort.members.some((member) => member.historyId === historyId)) {
        throw new SealedCohortPopulationEvaluationError(
          "MEMBERSHIP_SET_MISMATCH",
          `Candidate Replay Run contains historyId "${historyId}" outside sealed cohort membership.`,
        );
      }
    }

    const sampleSize = scored.length;
    const emptyReason =
      "No paired A/C successes with computable evaluation metrics on this sealed cohort.";

    let winnerHitsA = 0;
    let winnerHitsC = 0;
    let scoreHitsA = 0;
    let scoreHitsC = 0;
    let goalRangeHitsA = 0;
    let goalRangeHitsC = 0;
    let bttsHitsA = 0;
    let bttsHitsC = 0;
    let ouHitsA = 0;
    let ouHitsC = 0;

    let homeN = 0;
    let homeHitsA = 0;
    let homeHitsC = 0;
    let drawN = 0;
    let drawHitsA = 0;
    let drawHitsC = 0;
    let awayN = 0;
    let awayHitsA = 0;
    let awayHitsC = 0;

    const confA: number[] = [];
    const hitA: number[] = [];
    const confC: number[] = [];
    const hitC: number[] = [];
    const calibrationRecordsA: EvaluationHistoryRecord[] = [];
    const calibrationRecordsC: EvaluationHistoryRecord[] = [];

    for (const row of scored) {
      if (row.baselineMetrics.winnerHit) {
        winnerHitsA += 1;
      }
      if (row.candidateMetrics.winnerHit) {
        winnerHitsC += 1;
      }
      if (row.baselineMetrics.scoreHit) {
        scoreHitsA += 1;
      }
      if (row.candidateMetrics.scoreHit) {
        scoreHitsC += 1;
      }
      if (row.baselineMetrics.goalRangeHit) {
        goalRangeHitsA += 1;
      }
      if (row.candidateMetrics.goalRangeHit) {
        goalRangeHitsC += 1;
      }
      if (row.baselineMetrics.bttsHit) {
        bttsHitsA += 1;
      }
      if (row.candidateMetrics.bttsHit) {
        bttsHitsC += 1;
      }
      if (row.baselineMetrics.overUnderHit) {
        ouHitsA += 1;
      }
      if (row.candidateMetrics.overUnderHit) {
        ouHitsC += 1;
      }

      if (row.actualWinner === "home") {
        homeN += 1;
        if (row.baselineMetrics.winnerHit) {
          homeHitsA += 1;
        }
        if (row.candidateMetrics.winnerHit) {
          homeHitsC += 1;
        }
      } else if (row.actualWinner === "draw") {
        drawN += 1;
        if (row.baselineMetrics.drawHit) {
          drawHitsA += 1;
        }
        if (row.candidateMetrics.drawHit) {
          drawHitsC += 1;
        }
      } else {
        awayN += 1;
        if (row.baselineMetrics.winnerHit) {
          awayHitsA += 1;
        }
        if (row.candidateMetrics.winnerHit) {
          awayHitsC += 1;
        }
      }

      confA.push(row.baselineMetrics.predictionConfidence);
      hitA.push(row.baselineMetrics.winnerHitNumeric);
      confC.push(row.candidateMetrics.predictionConfidence);
      hitC.push(row.candidateMetrics.winnerHitNumeric);
      calibrationRecordsA.push(row.baselineHistory);
      calibrationRecordsC.push(row.candidateHistory);
    }

    const calibrationA = computePredictionCalibrationReport({
      records: Object.freeze(calibrationRecordsA),
      computedAt,
    });
    const calibrationC = computePredictionCalibrationReport({
      records: Object.freeze(calibrationRecordsC),
      computedAt,
    });

    const correlationA = pearsonCorrelation(confA, hitA);
    const correlationC = pearsonCorrelation(confC, hitC);

    const comparisons: PopulationMetricComparisonRow[] =
      sampleSize === 0
        ? [
            comparisonRow(
              "winnerAccuracy",
              "Match Result Accuracy",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "exactScoreAccuracy",
              "Exact Score Accuracy",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "goalRangeAccuracy",
              "Goal Range Accuracy",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "bttsAccuracy",
              "BTTS Accuracy",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "overUnderAccuracy",
              "Over/Under Accuracy",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "brierScore",
              "Brier Score",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "expectedCalibrationError",
              "Expected Calibration Error (ECE)",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
            comparisonRow(
              "confidenceCorrelation",
              "Confidence–Winner Hit Correlation",
              notAvailableMetric(0, emptyReason),
              notAvailableMetric(0, emptyReason),
            ),
          ]
        : [
            comparisonRow(
              "winnerAccuracy",
              "Match Result Accuracy",
              availableMetric(winnerHitsA, sampleSize),
              availableMetric(winnerHitsC, sampleSize),
            ),
            comparisonRow(
              "exactScoreAccuracy",
              "Exact Score Accuracy",
              availableMetric(scoreHitsA, sampleSize),
              availableMetric(scoreHitsC, sampleSize),
            ),
            comparisonRow(
              "goalRangeAccuracy",
              "Goal Range Accuracy",
              availableMetric(goalRangeHitsA, sampleSize),
              availableMetric(goalRangeHitsC, sampleSize),
            ),
            comparisonRow(
              "bttsAccuracy",
              "BTTS Accuracy",
              availableMetric(bttsHitsA, sampleSize),
              availableMetric(bttsHitsC, sampleSize),
            ),
            comparisonRow(
              "overUnderAccuracy",
              "Over/Under Accuracy",
              availableMetric(ouHitsA, sampleSize),
              availableMetric(ouHitsC, sampleSize),
            ),
            comparisonRow(
              "brierScore",
              "Brier Score",
              availableScoreMetric(
                calibrationA.brierScore.value,
                calibrationA.brierScore.sampleSize,
                "A2 Brier Score could not be computed for the paired population.",
              ),
              availableScoreMetric(
                calibrationC.brierScore.value,
                calibrationC.brierScore.sampleSize,
                "A2 Brier Score could not be computed for the paired population.",
              ),
            ),
            comparisonRow(
              "expectedCalibrationError",
              "Expected Calibration Error (ECE)",
              availableScoreMetric(
                calibrationA.expectedCalibrationError.value,
                calibrationA.expectedCalibrationError.sampleSize,
                "A2 ECE could not be computed for the paired population.",
              ),
              availableScoreMetric(
                calibrationC.expectedCalibrationError.value,
                calibrationC.expectedCalibrationError.sampleSize,
                "A2 ECE could not be computed for the paired population.",
              ),
            ),
            comparisonRow(
              "confidenceCorrelation",
              "Confidence–Winner Hit Correlation",
              availableScoreMetric(
                correlationA,
                sampleSize,
                "Pearson correlation requires at least 2 samples with non-zero variance.",
              ),
              availableScoreMetric(
                correlationC,
                sampleSize,
                "Pearson correlation requires at least 2 samples with non-zero variance.",
              ),
            ),
          ];

    const winnerBreakdown: PopulationWinnerBreakdown = Object.freeze({
      actualHome: comparisonRow(
        "winnerAccuracyActualHome",
        "Match Result Accuracy (actual Home)",
        sampleSize === 0
          ? notAvailableMetric(0, emptyReason)
          : availableMetric(homeHitsA, homeN),
        sampleSize === 0
          ? notAvailableMetric(0, emptyReason)
          : availableMetric(homeHitsC, homeN),
      ),
      actualDraw: comparisonRow(
        "winnerAccuracyActualDraw",
        "Match Result Accuracy (actual Draw / drawHit)",
        sampleSize === 0
          ? notAvailableMetric(0, emptyReason)
          : availableMetric(drawHitsA, drawN),
        sampleSize === 0
          ? notAvailableMetric(0, emptyReason)
          : availableMetric(drawHitsC, drawN),
      ),
      actualAway: comparisonRow(
        "winnerAccuracyActualAway",
        "Match Result Accuracy (actual Away)",
        sampleSize === 0
          ? notAvailableMetric(0, emptyReason)
          : availableMetric(awayHitsA, awayN),
        sampleSize === 0
          ? notAvailableMetric(0, emptyReason)
          : availableMetric(awayHitsC, awayN),
      ),
    });

    const body: Omit<SealedCohortPopulationEvaluation, "checksum"> = Object.freeze({
      evaluationRunId,
      schemaVersion: SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
      cohortId: cohort.cohortId,
      membershipDigestSha256: cohort.membershipDigestSha256,
      baselineReplayRunId: baselineRun.replayRunId,
      candidateReplayRunId: candidateRun.replayRunId,
      baselineCalibrationLabel: BASELINE_LABEL,
      candidateCalibrationLabel: CANDIDATE_LABEL,
      coverage: Object.freeze({
        totalSealedMembers: cohort.members.length,
        eligibleReplayMembers: cohort.members.length,
        successfulBaselineReplayCount,
        successfulCandidateReplayCount,
        pairedSuccessfulCount,
        failedBaselineCount,
        failedCandidateCount,
        excludedCount,
        finalEvaluationSampleSize: sampleSize,
      }),
      comparisons: Object.freeze(comparisons),
      winnerBreakdown,
      candidateCProductionPromoted: false,
      productionMatchScriptUnchanged: true,
      statisticalSignificanceSupported: false,
      createdAt: computedAt,
      limitations: buildLimitations({
        sampleSize,
        failedBaselineCount,
        failedCandidateCount,
        excludedCount,
        calibrationQualified: calibrationA.qualified && calibrationC.qualified,
      }),
    });

    const evaluation: SealedCohortPopulationEvaluation = Object.freeze({
      ...body,
      checksum: computeChecksum(body),
    });

    if (input.populationEvaluationRepository !== undefined) {
      await input.populationEvaluationRepository.save(evaluation);
    }

    return { ok: true, value: evaluation };
  } catch (error) {
    if (error instanceof SealedCohortPopulationEvaluationError) {
      return { ok: false, error };
    }
    throw error;
  }
}
