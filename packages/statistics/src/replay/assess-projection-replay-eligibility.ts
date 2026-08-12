import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import {
  canonicalSidecarContextJson,
  isSupportedProjectionReplaySidecarSchemaVersion,
  type ProjectionReplaySidecarRecord,
} from "./projection-replay-sidecar-record.js";
import type { SealedProjectionReplayContext } from "./projection-replay-context.js";

/**
 * Deterministic eligibility reasons (P2K-C).
 * Completeness failures block V2 replay cohort membership.
 * Informational reasons may accompany a complete result.
 */
export type ProjectionReplayEligibilityReason =
  | "MISSING_SIDECAR"
  | "UNSUPPORTED_SIDECAR_SCHEMA"
  | "INVALID_SIDECAR_HASH"
  | "MISSING_REPLAY_CONTEXT"
  | "MATCH_ID_MISMATCH"
  | "MISSING_FEATURES"
  | "MISSING_RULES"
  | "PARAMETER_ARTIFACT_UNPINNED"
  | "OUTCOME_NOT_FINISHED"
  | "EVALUATION_NOT_SCORED";

export interface ProjectionReplayEligibilityAssessment {
  readonly historyId: string;
  readonly matchId: string;
  /** Sidecar present, supported, integrity-valid, and sufficient for V2 replay port. */
  readonly replayComplete: boolean;
  /**
   * History outcome can be used for scored population metrics.
   * Distinct from replayComplete — current History domain only admits FINISHED+scored,
   * but the distinction is preserved for cohort filters and future outcome states.
   */
  readonly outcomeEvaluable: boolean;
  /** Canonical future-cohort gate: replayComplete && outcomeEvaluable. */
  readonly replayEligible: boolean;
  readonly reasons: readonly ProjectionReplayEligibilityReason[];
}

export type SidecarContentSha256Fn = (
  context: SealedProjectionReplayContext,
) => string;

function hasUsableReplayContext(
  context: SealedProjectionReplayContext,
): readonly ProjectionReplayEligibilityReason[] {
  const reasons: ProjectionReplayEligibilityReason[] = [];

  if (context.features.length === 0) {
    reasons.push("MISSING_FEATURES");
  }

  if (context.rules.length === 0) {
    reasons.push("MISSING_RULES");
  }

  if (
    context.featureModelVersion.trim().length === 0 ||
    context.featureBundleChecksum.trim().length === 0 ||
    context.generatedAt.trim().length === 0 ||
    !Number.isFinite(context.requiredEvidencePresentCount)
  ) {
    reasons.push("MISSING_REPLAY_CONTEXT");
  }

  return reasons;
}

/**
 * Pure eligibility assessment for one Evaluation History row + optional Sidecar record.
 * Does not load Evidence, reanalyze matches, or fabricate Sidecars.
 */
export function assessProjectionReplayEligibility(input: {
  readonly history: EvaluationHistoryRecord;
  readonly sidecar: ProjectionReplaySidecarRecord | undefined;
  readonly hashContext: SidecarContentSha256Fn;
}): ProjectionReplayEligibilityAssessment {
  const { history, sidecar, hashContext } = input;
  const reasons: ProjectionReplayEligibilityReason[] = [];

  const outcomeFinished = history.actualResult.matchStatus === "FINISHED";
  const evaluationScored = history.evaluation.status === "scored";

  if (!outcomeFinished) {
    reasons.push("OUTCOME_NOT_FINISHED");
  }

  if (!evaluationScored) {
    reasons.push("EVALUATION_NOT_SCORED");
  }

  const outcomeEvaluable = outcomeFinished && evaluationScored;

  if (sidecar === undefined) {
    reasons.push("MISSING_SIDECAR");
    return Object.freeze({
      historyId: history.historyId,
      matchId: history.matchId,
      replayComplete: false,
      outcomeEvaluable,
      replayEligible: false,
      reasons: Object.freeze(reasons),
    });
  }

  if (!isSupportedProjectionReplaySidecarSchemaVersion(sidecar.schemaVersion)) {
    reasons.push("UNSUPPORTED_SIDECAR_SCHEMA");
  }

  const recomputed = hashContext(sidecar.context);
  if (recomputed !== sidecar.contentSha256) {
    reasons.push("INVALID_SIDECAR_HASH");
  }

  if (sidecar.context.matchId !== history.matchId) {
    reasons.push("MATCH_ID_MISMATCH");
  }

  if (sidecar.matchId !== history.matchId) {
    if (!reasons.includes("MATCH_ID_MISMATCH")) {
      reasons.push("MATCH_ID_MISMATCH");
    }
  }

  reasons.push(...hasUsableReplayContext(sidecar.context));

  const parameterPinned =
    typeof sidecar.context.parameterVersionLabel === "string" &&
    sidecar.context.parameterVersionLabel.trim().length > 0;

  if (!parameterPinned) {
    reasons.push("PARAMETER_ARTIFACT_UNPINNED");
  }

  const completenessBlockers = new Set<ProjectionReplayEligibilityReason>([
    "MISSING_SIDECAR",
    "UNSUPPORTED_SIDECAR_SCHEMA",
    "INVALID_SIDECAR_HASH",
    "MISSING_REPLAY_CONTEXT",
    "MATCH_ID_MISMATCH",
    "MISSING_FEATURES",
    "MISSING_RULES",
  ]);

  const replayComplete = reasons.every(
    (reason) => !completenessBlockers.has(reason),
  );

  return Object.freeze({
    historyId: history.historyId,
    matchId: history.matchId,
    replayComplete,
    outcomeEvaluable,
    replayEligible: replayComplete && outcomeEvaluable,
    reasons: Object.freeze(reasons),
  });
}

/** Convenience: hash input bytes for adapters that share the Prisma SHA-256 contract. */
export function sidecarContextBytesForHash(
  context: SealedProjectionReplayContext,
): string {
  return canonicalSidecarContextJson(context);
}
