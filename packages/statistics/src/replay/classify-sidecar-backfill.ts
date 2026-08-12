import type { EvaluationHistoryRecord } from "../domain/evaluation-history.js";
import type { ProjectionReplayEligibilityAssessment } from "./assess-projection-replay-eligibility.js";
import type { ProjectionReplaySidecarRecord } from "./projection-replay-sidecar-record.js";

/**
 * Backfill safety classification (P2K-C).
 *
 * SAFE_TO_BACKFILL is reserved for cases where original sealed replay inputs
 * can be reconstructed without changing historical semantics. Re-analyzing a
 * match through today's Provider → Feature → Rule path is NEVER safe.
 */
export type SidecarBackfillClassification =
  | "NOT_REQUIRED"
  | "SAFE_TO_BACKFILL"
  | "MANUAL_REVIEW_REQUIRED"
  | "PERMANENTLY_INELIGIBLE";

export interface SidecarBackfillAssessment {
  readonly historyId: string;
  readonly classification: SidecarBackfillClassification;
  readonly automaticBackfillAllowed: boolean;
  readonly rationale: string;
}

/**
 * Pure backfill policy. Never triggers reanalysis or Evidence regeneration.
 */
export function classifySidecarBackfill(input: {
  readonly history: EvaluationHistoryRecord;
  readonly sidecar: ProjectionReplaySidecarRecord | undefined;
  readonly eligibility: ProjectionReplayEligibilityAssessment;
}): SidecarBackfillAssessment {
  const { history, sidecar, eligibility } = input;

  if (eligibility.replayComplete) {
    return Object.freeze({
      historyId: history.historyId,
      classification: "NOT_REQUIRED",
      automaticBackfillAllowed: false,
      rationale:
        "Sidecar is already replay-complete; no backfill write is required.",
    });
  }

  if (eligibility.reasons.includes("INVALID_SIDECAR_HASH")) {
    return Object.freeze({
      historyId: history.historyId,
      classification: "PERMANENTLY_INELIGIBLE",
      automaticBackfillAllowed: false,
      rationale:
        "Stored contentSha256 does not match canonical context JSON; automatic replacement would contaminate historical replay provenance.",
    });
  }

  if (eligibility.reasons.includes("MATCH_ID_MISMATCH")) {
    return Object.freeze({
      historyId: history.historyId,
      classification: "PERMANENTLY_INELIGIBLE",
      automaticBackfillAllowed: false,
      rationale:
        "Sidecar matchId does not match Evaluation History; do not auto-repair.",
    });
  }

  if (eligibility.reasons.includes("MISSING_SIDECAR")) {
    return Object.freeze({
      historyId: history.historyId,
      classification: "MANUAL_REVIEW_REQUIRED",
      automaticBackfillAllowed: false,
      rationale:
        "Legacy History without Sidecar cannot prove original Feature/Rule seal; reanalyze-via-Provider is unsafe. Attach only a human-verified sealed Sidecar.",
    });
  }

  if (eligibility.reasons.includes("UNSUPPORTED_SIDECAR_SCHEMA")) {
    return Object.freeze({
      historyId: history.historyId,
      classification: "MANUAL_REVIEW_REQUIRED",
      automaticBackfillAllowed: false,
      rationale:
        "Sidecar schema is unsupported; migrate or re-seal only under explicit review.",
    });
  }

  if (
    eligibility.reasons.includes("MISSING_FEATURES") ||
    eligibility.reasons.includes("MISSING_RULES") ||
    eligibility.reasons.includes("MISSING_REPLAY_CONTEXT")
  ) {
    return Object.freeze({
      historyId: history.historyId,
      classification: "MANUAL_REVIEW_REQUIRED",
      automaticBackfillAllowed: false,
      rationale:
        "Sidecar payload is incomplete for V2 replay; fabricating Features/Rules from live Providers is forbidden.",
    });
  }

  // Defensive default: never claim SAFE without proven sealed reconstruction path.
  void sidecar;
  return Object.freeze({
    historyId: history.historyId,
    classification: "MANUAL_REVIEW_REQUIRED",
    automaticBackfillAllowed: false,
    rationale:
      "No SAFE_TO_BACKFILL reconstruction path is proven in-repository; default is not safe.",
  });
}
