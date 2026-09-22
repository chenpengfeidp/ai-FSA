import {
  HistoricalEvaluationIntakeError,
  type HistoricalEvaluationIntakeCommand,
  type HistoricalEvaluationIntakeResult,
  type HistoricalIntakeReplaySidecarInput,
} from "../domain/historical-evaluation-intake.js";
import type { HistoricalIntakeAuthorization } from "../domain/historical-intake-production-authorization.js";
import type { EvaluationHistoryRepository } from "../repository/evaluation-history-repository.js";
import { DuplicateEvaluationHistoryError } from "../repository/evaluation-history-repository.js";
import type { ProjectionReplaySidecarRepository } from "../repository/projection-replay-sidecar-repository.js";
import { assessProjectionReplayEligibility } from "../replay/assess-projection-replay-eligibility.js";
import { computeProjectionReplaySidecarContentSha256 } from "../replay/sidecar-content-sha256.js";
import type { ActualMatchResult } from "../domain/actual-match-result.js";
import type {
  PredictionEvaluationRecord,
  SealedPredictionInput,
} from "../domain/prediction-evaluation.js";
import { evaluatePrediction } from "./evaluate-prediction.js";
import { validateHistoricalPredictionSeal } from "./validate-historical-prediction-seal.js";
import { validateVerifiedRealWorldActual } from "./validate-verified-real-world-actual.js";
import { assertHistoricalIntakeTemporalIntegrity } from "./assert-historical-intake-temporal-integrity.js";
import { assertHistoricalIntakeProductionAuthorization } from "./assert-historical-intake-production-authorization.js";
import { buildHistoricalIntakeHistoryRecord } from "./build-historical-intake-history-record.js";
import { createHistoricalIntakeAuthorization } from "./create-historical-intake-authorization.js";
import { PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY } from "./historical-intake-production-authorization.v1.js";
import { isHistoricalIntakeEvaluationHistoryRecord } from "../domain/evaluation-history.js";

export interface IngestHistoricalEvaluationInput {
  readonly command: HistoricalEvaluationIntakeCommand;
  readonly historyRepository: EvaluationHistoryRepository;
  readonly sidecarRepository?: ProjectionReplaySidecarRepository;
}

export type EvaluatePredictionFn = (input: {
  readonly prediction: SealedPredictionInput;
  readonly actual: ActualMatchResult;
  readonly evaluatedAt: string;
}) => PredictionEvaluationRecord;

/**
 * Internal intake entry used by tests. Not part of the `@fas/statistics` public export.
 */
export interface IngestHistoricalEvaluationWithAuthorizationInput
  extends IngestHistoricalEvaluationInput {
  readonly authorization: HistoricalIntakeAuthorization;
  readonly evaluatePredictionFn?: EvaluatePredictionFn;
}

const productionHistoricalIntakeAuthorization = createHistoricalIntakeAuthorization(
  PRODUCTION_HISTORICAL_INTAKE_AUTHORIZATION_POLICY,
);

function validateReplaySidecar(
  sidecar: HistoricalIntakeReplaySidecarInput,
  matchId: string,
  kickoff: string,
): HistoricalEvaluationIntakeError | undefined {
  if (sidecar.reconstructed === true) {
    return new HistoricalEvaluationIntakeError(
      "INVALID_REPLAY_PROVENANCE",
      "Reconstructed replay sidecars cannot be bound to historical intake.",
    );
  }

  if (sidecar.context.matchId !== matchId) {
    return new HistoricalEvaluationIntakeError(
      "INVALID_REPLAY_PROVENANCE",
      "Replay sidecar matchId does not bind to the seal.",
    );
  }

  const generatedAt = Date.parse(sidecar.context.generatedAt);
  const kickoffMs = Date.parse(kickoff);

  if (Number.isNaN(generatedAt) || generatedAt >= kickoffMs) {
    return new HistoricalEvaluationIntakeError(
      "INVALID_REPLAY_PROVENANCE",
      "Replay sidecar generatedAt must be PRE_MATCH.",
    );
  }

  if (sidecar.contentSha256 !== undefined) {
    const expected = computeProjectionReplaySidecarContentSha256(sidecar.context);

    if (expected !== sidecar.contentSha256) {
      return new HistoricalEvaluationIntakeError(
        "INVALID_REPLAY_PROVENANCE",
        "Replay sidecar contentSha256 does not match the sealed context.",
      );
    }
  }

  return undefined;
}

/**
 * Internal Historical Evaluation Intake with an injected authorization policy.
 * Production code must call `ingestHistoricalEvaluation`, which always binds
 * the empty-by-default v1 production registry.
 */
export async function ingestHistoricalEvaluationWithAuthorization(
  input: IngestHistoricalEvaluationWithAuthorizationInput,
): Promise<HistoricalEvaluationIntakeResult> {
  const {
    command,
    historyRepository,
    sidecarRepository,
    authorization,
    evaluatePredictionFn = evaluatePrediction,
  } = input;

  try {
    const seal = validateHistoricalPredictionSeal(command.seal);
    const actual = validateVerifiedRealWorldActual(command.actual, seal);
    assertHistoricalIntakeTemporalIntegrity({ seal, actual });
    assertHistoricalIntakeProductionAuthorization(authorization, seal, actual);

    const evaluation = evaluatePredictionFn({
      prediction: seal.predictionSnapshot,
      actual: actual.actual,
      evaluatedAt: seal.generatedAt,
    });

    if (evaluation.status !== "scored") {
      return {
        status: "rejected",
        code: "RETROSPECTIVE_RECONSTRUCTION",
        message: evaluation.exclusionReason ?? "Prediction is not scored.",
      };
    }

    let sidecarFailure: HistoricalEvaluationIntakeError | undefined;
    if (command.replaySidecar !== undefined) {
      sidecarFailure = validateReplaySidecar(
        command.replaySidecar,
        seal.matchId,
        seal.kickoff,
      );
    }

    const sidecarContext =
      command.replaySidecar !== undefined && sidecarFailure === undefined
        ? command.replaySidecar.context
        : undefined;

    const persistableSidecar =
      sidecarContext !== undefined && sidecarRepository !== undefined;

    const draftHistory = buildHistoricalIntakeHistoryRecord({
      seal,
      actual,
      evaluation,
      intakeRecordedAt: command.intakeRecordedAt,
      replayComplete: false,
      replayEligible: false,
      replayReasons: Object.freeze(["MISSING_SIDECAR"]),
    });

    const sidecarRecord =
      persistableSidecar && sidecarContext !== undefined
        ? {
            historyId: draftHistory.historyId,
            matchId: seal.matchId,
            schemaVersion: "projection-replay-sidecar.p2k.b",
            contentSha256:
              computeProjectionReplaySidecarContentSha256(sidecarContext),
            context: sidecarContext,
          }
        : undefined;

    const eligibility = assessProjectionReplayEligibility({
      history: draftHistory,
      sidecar: sidecarRecord,
      hashContext: computeProjectionReplaySidecarContentSha256,
    });

    const history = buildHistoricalIntakeHistoryRecord({
      seal,
      actual,
      evaluation,
      intakeRecordedAt: command.intakeRecordedAt,
      replayComplete: eligibility.replayComplete,
      replayEligible: eligibility.replayEligible,
      replayReasons: eligibility.reasons,
    });

    const saved = await historyRepository.save(history);

    if (!isHistoricalIntakeEvaluationHistoryRecord(saved)) {
      return {
        status: "rejected",
        code: "UNSUPPORTED_HISTORY_SCHEMA_VERSION",
        message: "Historical intake cannot revive a non-intake History row.",
      };
    }

    let sidecarSaved = false;

    if (
      persistableSidecar &&
      sidecarContext !== undefined &&
      sidecarRepository !== undefined
    ) {
      try {
        await sidecarRepository.save({
          historyId: saved.historyId,
          matchId: seal.matchId,
          context: sidecarContext,
        });
        sidecarSaved = true;
      } catch {
        sidecarFailure = new HistoricalEvaluationIntakeError(
          "INVALID_REPLAY_PROVENANCE",
          "Replay sidecar could not be persisted.",
        );
      }
    }

    return {
      status: "accepted",
      history: saved,
      sidecarSaved,
      ...(sidecarFailure === undefined
        ? {}
        : { sidecarFailureCode: sidecarFailure.code }),
    };
  } catch (error: unknown) {
    if (error instanceof HistoricalEvaluationIntakeError) {
      return {
        status: "rejected",
        code: error.code,
        message: error.message,
      };
    }

    if (error instanceof DuplicateEvaluationHistoryError) {
      return {
        status: "rejected",
        code: "CONFLICTING_ACTUAL",
        message: error.message,
      };
    }

    throw error;
  }
}

/**
 * Library-only Historical Evaluation Intake command.
 * Always enforces the production v1 authorization registry (global false, no pairs).
 * Evaluates an immutable authenticated PRE_MATCH seal against a verified Actual.
 * Does not mutate the seal, Actual, Projection, Features, or Rules.
 */
export async function ingestHistoricalEvaluation(
  input: IngestHistoricalEvaluationInput,
): Promise<HistoricalEvaluationIntakeResult> {
  return ingestHistoricalEvaluationWithAuthorization({
    ...input,
    authorization: productionHistoricalIntakeAuthorization,
  });
}
