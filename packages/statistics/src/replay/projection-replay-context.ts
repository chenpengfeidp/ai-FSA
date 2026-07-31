import type { SealedRuleSnapshot } from "../domain/prediction-evaluation.js";

export type SealedReplayFeatureValue = string | number | boolean | null;

export interface SealedReplayFeatureSnapshot {
  readonly name: string;
  readonly value: SealedReplayFeatureValue;
}

export interface SealedRuleReplaySnapshot extends SealedRuleSnapshot {
  readonly ruleId: string;
  readonly weight: number;
  readonly score: number;
}

/**
 * Immutable upstream inputs for offline projection replay.
 * Stored outside Evaluation History rows — never mutates sealed History.
 */
export interface SealedProjectionReplayContext {
  readonly matchId: string;
  readonly featureModelVersion: string;
  readonly featureBundleChecksum: string;
  readonly featureBundleStatus:
    | "blocked"
    | "completed_nonempty"
    | "degraded"
    | "failed";
  readonly evidenceRefs: readonly string[];
  readonly features: readonly SealedReplayFeatureSnapshot[];
  readonly rules: readonly SealedRuleReplaySnapshot[];
  readonly requiredEvidencePresentCount: number;
  readonly generatedAt: string;
  /** P2J — parameter version used when the sidecar was sealed (optional for legacy). */
  readonly parameterArtifactId?: string;
  readonly parameterVersionLabel?: string;
  readonly parameterArtifactChecksum?: string;
}

export type ProjectionReplaySidecar = Readonly<
  Record<string, SealedProjectionReplayContext | undefined>
>;
