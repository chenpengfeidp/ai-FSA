/**
 * Validation / diagnostic only (P2K-G-RECOVERY).
 *
 * Distinguishes P2K-C `replayComplete` from offline P2K-D/F executability.
 * Does not mutate History/Sidecar and does not change P2K-C contracts.
 */
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
  type EvaluationHistoryRecord,
  type ProjectionReplaySidecarRecord,
} from "@fas/statistics";

import { getProjectionParameterArtifactByVersionLabel } from "../projection-v2/projection-parameter-registry.js";
import { assessSealedReplayRuleRebuild } from "./assess-sealed-replay-rule-rebuild.js";

export type OfflineReplayExecutabilityReason =
  | "MISSING_SIDECAR"
  | "P2K_C_REPLAY_INCOMPLETE"
  | "PARAMETER_PROVENANCE_MISSING"
  | "PARAMETER_VERSION_LABEL_UNKNOWN"
  | "RULE_RESULT_NOT_REBUILDABLE";

export interface OfflineReplayParameterProvenance {
  readonly parameterVersionLabel: string | undefined;
  readonly parameterArtifactId: string | undefined;
  readonly parameterArtifactChecksum: string | undefined;
  readonly complete: boolean;
  readonly registryRecognized: boolean;
}

export interface OfflineReplayExecutabilityAssessment {
  /** Canonical P2K-C completeness — informational; not redefined here. */
  readonly replayComplete: boolean;
  /** Canonical P2K-C outcomeEvaluable — informational. */
  readonly outcomeEvaluable: boolean;
  /** Canonical P2K-C replayEligible — informational. */
  readonly replayEligible: boolean;
  readonly ruleResultRebuildable: boolean;
  readonly parameterProvenance: OfflineReplayParameterProvenance;
  /**
   * True only when sealed context can enter P2K-D/F offline Match Script replay
   * without fabricating parameter pins or regenerating Evidence/Features/Rules.
   */
  readonly offlineReplayExecutable: boolean;
  readonly reasons: readonly OfflineReplayExecutabilityReason[];
}

/**
 * Assess whether History+Sidecar can execute offline Replay (P2K-D/F).
 * Fail-closed: missing/unknown parameter provenance or non-rebuildable rules
 * yield offlineReplayExecutable=false with explicit reasons.
 */
export function assessOfflineReplayExecutability(input: {
  readonly history: EvaluationHistoryRecord;
  readonly sidecar: ProjectionReplaySidecarRecord | undefined;
}): OfflineReplayExecutabilityAssessment {
  const eligibility = assessProjectionReplayEligibility({
    history: input.history,
    sidecar: input.sidecar,
    hashContext: computeProjectionReplaySidecarContentSha256,
  });

  const reasons: OfflineReplayExecutabilityReason[] = [];

  if (input.sidecar === undefined) {
    reasons.push("MISSING_SIDECAR");
    return Object.freeze({
      replayComplete: eligibility.replayComplete,
      outcomeEvaluable: eligibility.outcomeEvaluable,
      replayEligible: eligibility.replayEligible,
      ruleResultRebuildable: false,
      parameterProvenance: Object.freeze({
        parameterVersionLabel: undefined,
        parameterArtifactId: undefined,
        parameterArtifactChecksum: undefined,
        complete: false,
        registryRecognized: false,
      }),
      offlineReplayExecutable: false,
      reasons: Object.freeze(reasons),
    });
  }

  if (!eligibility.replayComplete) {
    reasons.push("P2K_C_REPLAY_INCOMPLETE");
  }

  const context = input.sidecar.context;
  const parameterVersionLabel = context.parameterVersionLabel?.trim() || undefined;
  const parameterArtifactId = context.parameterArtifactId?.trim() || undefined;
  const parameterArtifactChecksum =
    context.parameterArtifactChecksum?.trim() || undefined;

  const provenancePresent =
    parameterVersionLabel !== undefined &&
    parameterArtifactId !== undefined &&
    parameterArtifactChecksum !== undefined;

  if (!provenancePresent) {
    reasons.push("PARAMETER_PROVENANCE_MISSING");
  }

  const registryArtifact =
    parameterVersionLabel === undefined
      ? undefined
      : getProjectionParameterArtifactByVersionLabel(parameterVersionLabel);
  const registryRecognized = registryArtifact !== undefined;

  if (provenancePresent && !registryRecognized) {
    reasons.push("PARAMETER_VERSION_LABEL_UNKNOWN");
  }

  const rebuild = assessSealedReplayRuleRebuild(context);
  if (!rebuild.rebuildable) {
    reasons.push("RULE_RESULT_NOT_REBUILDABLE");
  }

  const parameterProvenance = Object.freeze({
    parameterVersionLabel,
    parameterArtifactId,
    parameterArtifactChecksum,
    complete: provenancePresent,
    registryRecognized,
  });

  const offlineReplayExecutable =
    eligibility.replayComplete &&
    provenancePresent &&
    registryRecognized &&
    rebuild.rebuildable;

  return Object.freeze({
    replayComplete: eligibility.replayComplete,
    outcomeEvaluable: eligibility.outcomeEvaluable,
    replayEligible: eligibility.replayEligible,
    ruleResultRebuildable: rebuild.rebuildable,
    parameterProvenance,
    offlineReplayExecutable,
    reasons: Object.freeze(reasons),
  });
}
