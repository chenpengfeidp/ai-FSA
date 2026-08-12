import type { EvaluationHistoryRecord } from "@fas/statistics";
import {
  assessProjectionReplayEligibility,
  computeProjectionReplaySidecarContentSha256,
  type ProjectionReplayEligibilityReason,
  type ProjectionReplayMetadata,
  type ProjectionReplaySidecarRecord,
  type SealedPredictionInput,
  type SealedProjectionReplayContext,
} from "@fas/statistics";
import { computeMatchProjection } from "../projection/compute-match-projection.js";
import {
  FOOTBALL_STATE_DIMENSION_IDS,
  FOOTBALL_STATE_DIMENSION_LABELS,
} from "../projection-v2/football-state/football-state-dimensions.js";
import {
  resolveOfflineMatchScriptParameterSet,
  type OfflineMatchScriptCalibrationLabel,
} from "../projection-v2/match-script/match-script-calibration-governance.js";
import {
  checksumForProjectionParameterPayload,
  createProjectionParameterArtifact,
  type ProjectionParameterArtifact,
} from "../projection-v2/projection-parameter-artifact.js";
import { getProjectionParameterArtifactByVersionLabel } from "../projection-v2/projection-parameter-registry.js";
import { buildScenarioSet } from "../scenario/scenario-set.js";
import {
  buildFeatureBundleFromSealedReplayContext,
  buildRuleResultsFromSealedReplayContext,
} from "./sealed-replay-context-builders.js";

export type OfflineMatchScriptReplayErrorCode =
  | "MISSING_SIDECAR"
  | "INVALID_SIDECAR_HASH"
  | "UNSUPPORTED_SIDECAR_SCHEMA"
  | "INCOMPLETE_REPLAY_CONTEXT"
  | "INVALID_PARAMETER_LABEL"
  | "PRODUCTION_IMPLICIT_OVERRIDE"
  | "MISSING_REQUIRED_REPLAY_ARTIFACT"
  | "MATCH_ID_MISMATCH";

export interface OfflineHistoricalReplayContextIdentity {
  readonly matchId: string;
  readonly featureBundleChecksum: string;
  readonly featureModelVersion: string;
  readonly featureNames: readonly string[];
  readonly ruleIds: readonly string[];
  readonly ruleNames: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly requiredEvidencePresentCount: number;
  readonly generatedAt: string;
  readonly contentSha256: string;
  readonly schemaVersion: string;
  readonly parameterVersionLabel: string | undefined;
  readonly parameterArtifactId: string | undefined;
  readonly parameterArtifactChecksum: string | undefined;
}

export interface OfflineMatchScriptReplayResult {
  readonly kind: "offline_match_script_replay";
  readonly modelVersion: "offlineMatchScriptReplay.v1.p2k.d";
  readonly historyId: string;
  readonly matchId: string;
  readonly matchScriptCalibrationLabel: OfflineMatchScriptCalibrationLabel;
  readonly matchScriptParameterPolicyVersion: string;
  /** Always false — offline A/B never promotes Candidate C. */
  readonly productionPromoted: false;
  /** True only when Baseline A was explicitly selected. */
  readonly isProductionDefault: boolean;
  readonly historicalReplayContext: OfflineHistoricalReplayContextIdentity;
  readonly prediction: SealedPredictionInput;
  readonly projectionChecksum: string;
  readonly metadata: ProjectionReplayMetadata | undefined;
  readonly offlineParameterArtifactId: string;
  readonly offlineParameterArtifactChecksum: string;
  readonly limitations: readonly string[];
}

export type OfflineMatchScriptReplayOutcome =
  | { readonly ok: true; readonly value: OfflineMatchScriptReplayResult }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: OfflineMatchScriptReplayErrorCode;
        readonly message: string;
        readonly eligibilityReasons?: readonly ProjectionReplayEligibilityReason[];
      };
    };

function fail(
  code: OfflineMatchScriptReplayErrorCode,
  message: string,
  eligibilityReasons?: readonly ProjectionReplayEligibilityReason[],
): OfflineMatchScriptReplayOutcome {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code,
      message,
      ...(eligibilityReasons === undefined ? {} : { eligibilityReasons }),
    }),
  });
}

function mapEligibilityFailure(
  reasons: readonly ProjectionReplayEligibilityReason[],
): OfflineMatchScriptReplayOutcome {
  if (reasons.includes("MISSING_SIDECAR")) {
    return fail(
      "MISSING_SIDECAR",
      "Offline Match Script replay requires a Projection Replay Sidecar.",
      reasons,
    );
  }

  if (reasons.includes("INVALID_SIDECAR_HASH")) {
    return fail(
      "INVALID_SIDECAR_HASH",
      "Projection Replay Sidecar contentSha256 does not match sealed context.",
      reasons,
    );
  }

  if (reasons.includes("UNSUPPORTED_SIDECAR_SCHEMA")) {
    return fail(
      "UNSUPPORTED_SIDECAR_SCHEMA",
      "Projection Replay Sidecar schemaVersion is not supported.",
      reasons,
    );
  }

  if (reasons.includes("MATCH_ID_MISMATCH")) {
    return fail(
      "MATCH_ID_MISMATCH",
      "History matchId does not match sealed Projection Replay Sidecar.",
      reasons,
    );
  }

  if (
    reasons.includes("MISSING_FEATURES") ||
    reasons.includes("MISSING_RULES") ||
    reasons.includes("MISSING_REPLAY_CONTEXT")
  ) {
    return fail(
      "INCOMPLETE_REPLAY_CONTEXT",
      "Sealed Projection Replay Sidecar context is incomplete for offline replay.",
      reasons,
    );
  }

  if (reasons.includes("PARAMETER_ARTIFACT_UNPINNED")) {
    return fail(
      "MISSING_REQUIRED_REPLAY_ARTIFACT",
      "Sealed Projection Replay Sidecar is missing a pinned parameterVersionLabel.",
      reasons,
    );
  }

  return fail(
    "INCOMPLETE_REPLAY_CONTEXT",
    "Projection Replay Sidecar is not replay-complete for offline Match Script override.",
    reasons,
  );
}

function buildHistoricalIdentity(input: {
  readonly sidecar: ProjectionReplaySidecarRecord;
  readonly context: SealedProjectionReplayContext;
}): OfflineHistoricalReplayContextIdentity {
  return Object.freeze({
    matchId: input.context.matchId,
    featureBundleChecksum: input.context.featureBundleChecksum,
    featureModelVersion: input.context.featureModelVersion,
    featureNames: Object.freeze(
      input.context.features.map((feature) => feature.name),
    ),
    ruleIds: Object.freeze(input.context.rules.map((rule) => rule.ruleId)),
    ruleNames: Object.freeze(input.context.rules.map((rule) => rule.ruleName)),
    evidenceRefs: Object.freeze([...input.context.evidenceRefs]),
    requiredEvidencePresentCount: input.context.requiredEvidencePresentCount,
    generatedAt: input.context.generatedAt,
    contentSha256: input.sidecar.contentSha256,
    schemaVersion: input.sidecar.schemaVersion,
    parameterVersionLabel: input.context.parameterVersionLabel,
    parameterArtifactId: input.context.parameterArtifactId,
    parameterArtifactChecksum: input.context.parameterArtifactChecksum,
  });
}

function buildOfflineProjectionParameters(input: {
  readonly base: ProjectionParameterArtifact;
  readonly matchScript: NonNullable<ProjectionParameterArtifact["matchScript"]>;
  readonly calibrationLabel: OfflineMatchScriptCalibrationLabel;
}): ProjectionParameterArtifact {
  const checksum = checksumForProjectionParameterPayload({
    versionLabel: input.base.versionLabel,
    lambda: input.base.lambda,
    matchScript: input.matchScript,
    footballState: input.base.footballState,
    confidence: input.base.confidence,
    recommendation: input.base.recommendation,
    matrixMerge: input.base.matrixMerge,
  });

  return createProjectionParameterArtifact({
    artifactId: `offline.p2k.d:${input.base.artifactId}:${input.calibrationLabel}`,
    versionLabel: input.base.versionLabel,
    policyVersion: input.base.policyVersion,
    frameworkVersion: input.base.frameworkVersion,
    status: input.base.status,
    qualified: false,
    checksum,
    limitations: Object.freeze([
      ...input.base.limitations,
      "P2K-D offline Match Script parameter override; not a production pin.",
      `Offline calibrationLabel=${input.calibrationLabel}.`,
      "Does not refresh Evidence, Features, Rules, or Football State from live Providers.",
      "Candidate C remains NON-DEFAULT / not population validated / not production promoted.",
    ]),
    lambda: input.base.lambda,
    footballState: input.base.footballState,
    confidence: input.base.confidence,
    recommendation: input.base.recommendation,
    matrixMerge: input.base.matrixMerge,
    matchScript: input.matchScript,
  });
}

function buildSealedPrediction(input: {
  readonly context: SealedProjectionReplayContext;
  readonly projection: ReturnType<typeof computeMatchProjection>["projection"];
  readonly scenarios: ReturnType<typeof buildScenarioSet>;
  readonly confidence: EvaluationHistoryRecord["confidence"];
}): SealedPredictionInput {
  return Object.freeze({
    matchId: input.context.matchId,
    projectionChecksum: input.projection.checksum,
    projectionStatus: input.projection.status,
    pHome: input.projection.pHome,
    pDraw: input.projection.pDraw,
    pAway: input.projection.pAway,
    topScorelines: Object.freeze(
      input.projection.topScorelines.map((scoreline) =>
        Object.freeze({ ...scoreline }),
      ),
    ),
    goalRange: Object.freeze({ ...input.projection.goalRange }),
    predictionConfidence: input.confidence.predictionConfidence,
    confidenceBand: input.confidence.confidenceBand,
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: input.scenarios.mostLikely.slot,
        winner: input.scenarios.mostLikely.winner,
        homeGoals: input.scenarios.mostLikely.homeGoals,
        awayGoals: input.scenarios.mostLikely.awayGoals,
        probability: input.scenarios.mostLikely.probability,
      }),
      secondLikely: Object.freeze({
        slot: input.scenarios.secondLikely.slot,
        winner: input.scenarios.secondLikely.winner,
        homeGoals: input.scenarios.secondLikely.homeGoals,
        awayGoals: input.scenarios.secondLikely.awayGoals,
        probability: input.scenarios.secondLikely.probability,
      }),
      upset: Object.freeze({
        slot: input.scenarios.upset.slot,
        winner: input.scenarios.upset.winner,
        homeGoals: input.scenarios.upset.homeGoals,
        awayGoals: input.scenarios.upset.awayGoals,
        probability: input.scenarios.upset.probability,
      }),
    }),
    rules: Object.freeze(
      input.context.rules.map((rule) =>
        Object.freeze({
          ruleName: rule.ruleName,
          status: rule.status,
          channel: rule.channel,
        }),
      ),
    ),
    featureNames: Object.freeze(
      input.context.features.map((feature) => feature.name),
    ),
    projectionModelVersion: input.projection.projectionModelVersion,
    featureModelVersion: input.context.featureModelVersion,
    ruleSetVersion: "rule.mvp.m1b.manager",
  });
}

function buildReplayMetadata(input: {
  readonly projectionResult: ReturnType<typeof computeMatchProjection>;
  readonly confidence: EvaluationHistoryRecord["confidence"];
}): ProjectionReplayMetadata | undefined {
  const footballState = input.projectionResult.footballState;
  const framework = input.projectionResult.projectionFramework;

  if (footballState === undefined && framework === undefined) {
    return undefined;
  }

  const footballStateDimensions = Object.freeze(
    (footballState?.dimensions ?? []).map((dimension) =>
      Object.freeze({
        dimensionId: dimension.id,
        dimensionLabel: dimension.label,
        level: dimension.level,
      }),
    ),
  );
  const activeMatchScripts = Object.freeze(
    (framework?.activeMatchScripts ?? []).map((script) =>
      Object.freeze({
        scriptId: script.scriptId,
        label: script.label,
        weight: script.weight,
      }),
    ),
  );

  if (footballStateDimensions.length === 0 && activeMatchScripts.length === 0) {
    return undefined;
  }

  return Object.freeze({
    projectionConfidence: input.confidence.predictionConfidence,
    footballStateDimensions:
      footballStateDimensions.length > 0
        ? footballStateDimensions
        : FOOTBALL_STATE_DIMENSION_IDS.map((dimensionId) =>
            Object.freeze({
              dimensionId,
              dimensionLabel: FOOTBALL_STATE_DIMENSION_LABELS[dimensionId],
              level: "absent" as const,
            }),
          ),
    activeMatchScripts,
    ...(framework === undefined
      ? {}
      : {
          parameterArtifactId: framework.parameterArtifactId,
          parameterVersionLabel: framework.parameterVersionLabel,
          parameterArtifactChecksum: framework.parameterArtifactChecksum,
        }),
  });
}

/**
 * Offline-only Projection V2 replay under an explicit Match Script calibration label.
 *
 * Consumes the sealed Projection Replay Sidecar only — no live Provider, Evidence,
 * Feature, or Rule regeneration. Baseline A and Candidate C must share the same
 * historical context; only the Match Script parameter set differs.
 *
 * Does not promote Candidate C and does not change production defaults.
 */
export function runOfflineMatchScriptReplay(input: {
  readonly history: EvaluationHistoryRecord;
  readonly sidecar: ProjectionReplaySidecarRecord | undefined;
  readonly matchScriptCalibrationLabel: string | undefined;
}): OfflineMatchScriptReplayOutcome {
  const resolved = resolveOfflineMatchScriptParameterSet({
    calibrationLabel: input.matchScriptCalibrationLabel,
  });

  if (!resolved.ok) {
    return fail(resolved.error.code, resolved.error.message);
  }

  const eligibility = assessProjectionReplayEligibility({
    history: input.history,
    sidecar: input.sidecar,
    hashContext: computeProjectionReplaySidecarContentSha256,
  });

  // Offline A/B requires a complete sealed sidecar context; outcome scoring is
  // not required for parameter-override projection (population metrics are P2K-G+).
  if (!eligibility.replayComplete || input.sidecar === undefined) {
    return mapEligibilityFailure(eligibility.reasons);
  }

  if (eligibility.reasons.includes("PARAMETER_ARTIFACT_UNPINNED")) {
    return mapEligibilityFailure(eligibility.reasons);
  }

  const sidecar = input.sidecar;
  const context = sidecar.context;

  const pinnedLabel = context.parameterVersionLabel?.trim() ?? "";
  if (pinnedLabel.length === 0) {
    return fail(
      "MISSING_REQUIRED_REPLAY_ARTIFACT",
      "Sealed Projection Replay Sidecar is missing a pinned parameterVersionLabel.",
      eligibility.reasons,
    );
  }

  const baseArtifact = getProjectionParameterArtifactByVersionLabel(pinnedLabel);
  if (baseArtifact === undefined) {
    return fail(
      "MISSING_REQUIRED_REPLAY_ARTIFACT",
      `Pinned parameterVersionLabel is not in the Projection parameter registry: ${pinnedLabel}`,
      eligibility.reasons,
    );
  }

  const parameters = buildOfflineProjectionParameters({
    base: baseArtifact,
    matchScript: resolved.value,
    calibrationLabel: resolved.label,
  });

  const featureBundle = buildFeatureBundleFromSealedReplayContext(context);
  const ruleResults = buildRuleResultsFromSealedReplayContext(context);
  const projectionResult = computeMatchProjection({
    featureBundle,
    ruleResults,
    requiredEvidencePresentCount: context.requiredEvidencePresentCount,
    projectionPolicyPin: "v2",
    parameters,
  });
  const scenarios = buildScenarioSet(projectionResult.projection);
  const prediction = buildSealedPrediction({
    context,
    projection: projectionResult.projection,
    scenarios,
    confidence: input.history.confidence,
  });
  const metadata = buildReplayMetadata({
    projectionResult,
    confidence: input.history.confidence,
  });
  const historicalReplayContext = buildHistoricalIdentity({
    sidecar,
    context,
  });

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "offline_match_script_replay" as const,
      modelVersion: "offlineMatchScriptReplay.v1.p2k.d" as const,
      historyId: input.history.historyId,
      matchId: input.history.matchId,
      matchScriptCalibrationLabel: resolved.label,
      matchScriptParameterPolicyVersion: resolved.value.policyVersion,
      productionPromoted: false as const,
      isProductionDefault: resolved.isProductionDefault,
      historicalReplayContext,
      prediction,
      projectionChecksum: projectionResult.projection.checksum,
      metadata,
      offlineParameterArtifactId: parameters.artifactId,
      offlineParameterArtifactChecksum: parameters.checksum,
      limitations: Object.freeze([
        "Offline-only Match Script parameter override (P2K-D).",
        "Historical sealed Sidecar context is immutable across Baseline A and Candidate C.",
        "Production default remains GOVERNED_MATCH_SCRIPT_PARAMETER_SET = Baseline A.",
        "Candidate C is NON-DEFAULT, not population validated, and not production promoted.",
        "No population Winner / Draw / Exact Score / Goal Range / BTTS / O-U / confidence claims.",
      ]),
    }),
  });
}
