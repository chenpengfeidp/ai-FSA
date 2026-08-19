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
  resolveOfflineProjectionCalibrationArtifact,
  type OfflineProjectionCalibrationLabel,
} from "../projection-v2/projection-calibration-governance.js";
import type { ProjectionParameterArtifact } from "../projection-v2/projection-parameter-artifact.js";
import { buildScenarioSet } from "../scenario/scenario-set.js";
import {
  buildFeatureBundleFromSealedReplayContext,
  buildRuleResultsFromSealedReplayContext,
} from "./sealed-replay-context-builders.js";

export type OfflineProjectionCalibrationReplayErrorCode =
  | "MISSING_SIDECAR"
  | "INVALID_SIDECAR_HASH"
  | "UNSUPPORTED_SIDECAR_SCHEMA"
  | "INCOMPLETE_REPLAY_CONTEXT"
  | "INVALID_PARAMETER_LABEL"
  | "PRODUCTION_IMPLICIT_OVERRIDE"
  | "MISSING_REQUIRED_REPLAY_ARTIFACT"
  | "MATCH_ID_MISMATCH";

export interface OfflineProjectionCalibrationReplayResult {
  readonly kind: "offline_projection_calibration_replay";
  readonly modelVersion: "offlineProjectionCalibrationReplay.v1.p2k.cal2";
  readonly historyId: string;
  readonly matchId: string;
  readonly projectionCalibrationLabel: OfflineProjectionCalibrationLabel;
  readonly productionPromoted: false;
  readonly isProductionDefault: boolean;
  readonly historicalReplayContext: {
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
  };
  readonly prediction: SealedPredictionInput;
  readonly projectionChecksum: string;
  readonly metadata: ProjectionReplayMetadata | undefined;
  readonly offlineParameterArtifactId: string;
  readonly offlineParameterArtifactChecksum: string;
  readonly offlineParameterVersionLabel: string;
  readonly limitations: readonly string[];
}

export type OfflineProjectionCalibrationReplayOutcome =
  | { readonly ok: true; readonly value: OfflineProjectionCalibrationReplayResult }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: OfflineProjectionCalibrationReplayErrorCode;
        readonly message: string;
        readonly eligibilityReasons?: readonly ProjectionReplayEligibilityReason[];
      };
    };

function fail(
  code: OfflineProjectionCalibrationReplayErrorCode,
  message: string,
  eligibilityReasons?: readonly ProjectionReplayEligibilityReason[],
): OfflineProjectionCalibrationReplayOutcome {
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
): OfflineProjectionCalibrationReplayOutcome {
  if (reasons.includes("MISSING_SIDECAR")) {
    return fail(
      "MISSING_SIDECAR",
      "Offline Projection calibration replay requires a Projection Replay Sidecar.",
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

  return fail(
    "INCOMPLETE_REPLAY_CONTEXT",
    "Projection Replay Sidecar is not replay-complete for offline calibration override.",
    reasons,
  );
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
      mostLikely: Object.freeze({ ...input.scenarios.mostLikely }),
      secondLikely: Object.freeze({ ...input.scenarios.secondLikely }),
      upset: Object.freeze({ ...input.scenarios.upset }),
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

/**
 * Offline-only Projection parameter calibration replay (P2K-CAL-2).
 *
 * Consumes sealed Sidecar context only. Swaps the Projection parameter artifact
 * while preserving Features, Rules, Evidence, and Match Script (Baseline A).
 */
export function runOfflineProjectionCalibrationReplay(input: {
  readonly history: EvaluationHistoryRecord;
  readonly sidecar: ProjectionReplaySidecarRecord | undefined;
  readonly projectionCalibrationLabel: string | undefined;
}): OfflineProjectionCalibrationReplayOutcome {
  const resolved = resolveOfflineProjectionCalibrationArtifact({
    calibrationLabel: input.projectionCalibrationLabel,
  });

  if (!resolved.ok) {
    return fail(resolved.error.code, resolved.error.message);
  }

  const eligibility = assessProjectionReplayEligibility({
    history: input.history,
    sidecar: input.sidecar,
    hashContext: computeProjectionReplaySidecarContentSha256,
  });

  if (!eligibility.replayComplete || input.sidecar === undefined) {
    return mapEligibilityFailure(eligibility.reasons);
  }

  const sidecar = input.sidecar;
  const context = sidecar.context;
  const parameters: ProjectionParameterArtifact = resolved.value;

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

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      kind: "offline_projection_calibration_replay" as const,
      modelVersion: "offlineProjectionCalibrationReplay.v1.p2k.cal2" as const,
      historyId: input.history.historyId,
      matchId: input.history.matchId,
      projectionCalibrationLabel: resolved.label,
      productionPromoted: false as const,
      isProductionDefault: resolved.isProductionDefault,
      historicalReplayContext: Object.freeze({
        matchId: context.matchId,
        featureBundleChecksum: context.featureBundleChecksum,
        featureModelVersion: context.featureModelVersion,
        featureNames: Object.freeze(context.features.map((feature) => feature.name)),
        ruleIds: Object.freeze(context.rules.map((rule) => rule.ruleId)),
        ruleNames: Object.freeze(context.rules.map((rule) => rule.ruleName)),
        evidenceRefs: Object.freeze([...context.evidenceRefs]),
        requiredEvidencePresentCount: context.requiredEvidencePresentCount,
        generatedAt: context.generatedAt,
        contentSha256: sidecar.contentSha256,
        schemaVersion: sidecar.schemaVersion,
        parameterVersionLabel: context.parameterVersionLabel,
        parameterArtifactId: context.parameterArtifactId,
        parameterArtifactChecksum: context.parameterArtifactChecksum,
      }),
      prediction,
      projectionChecksum: projectionResult.projection.checksum,
      metadata,
      offlineParameterArtifactId: parameters.artifactId,
      offlineParameterArtifactChecksum: parameters.checksum,
      offlineParameterVersionLabel: parameters.versionLabel,
      limitations: Object.freeze([
        "Offline-only Projection calibration replay (P2K-CAL-2).",
        "Historical sealed Sidecar context is immutable across baseline and candidate.",
        "Production default remains projection.v3.replay unless explicitly promoted.",
        "Calibration candidate is NON-DEFAULT / NOT production promoted.",
        "No population Winner / Draw / Goal Range promotion claims from offline replay alone.",
      ]),
    }),
  });
}
