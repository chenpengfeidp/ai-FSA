import { createFeature, createFeatureBundle } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { createRuleResult } from "@fas/rule";
import type {
  ProjectionReplayPort,
  ProjectionReplayPortInput,
  ProjectionReplayPortOutcome,
  ProjectionReplayMetadata,
  SealedPredictionInput,
  SealedProjectionReplayContext,
} from "@fas/statistics";
import type { AnalysisResult } from "../domain/analysis-result.js";
import { buildSealedPredictionInput } from "../evaluation/build-sealed-prediction-input.js";
import { computeMatchProjection } from "../projection/compute-match-projection.js";
import {
  FOOTBALL_STATE_DIMENSION_IDS,
  FOOTBALL_STATE_DIMENSION_LABELS,
} from "../projection-v2/football-state/football-state-dimensions.js";
import { buildScenarioSet } from "../scenario/scenario-set.js";
import { getProjectionParameterArtifactByVersionLabel } from "../projection-v2/projection-parameter-registry.js";

type EvaluationHistoryConfidence = Readonly<{
  predictionConfidence: number;
  confidenceBand: "high" | "low" | "medium" | "very_high";
}>;

function countRequiredEvidence(analysis: AnalysisResult): number {
  const evidenceSet = analysis.evidenceSet;
  const hasMatchInfo = evidenceSet.some(
    (evidence) => evidence.type === "MATCH_INFO",
  );
  const hasHomeForm = evidenceSet.some(
    (evidence) =>
      evidence.type === "TEAM_FORM" && evidence.payload.teamSide === "home",
  );
  const hasAwayForm = evidenceSet.some(
    (evidence) =>
      evidence.type === "TEAM_FORM" && evidence.payload.teamSide === "away",
  );
  const hasHomeStats = evidenceSet.some(
    (evidence) =>
      evidence.type === "STATISTICS" && evidence.payload.teamSide === "home",
  );
  const hasAwayStats = evidenceSet.some(
    (evidence) =>
      evidence.type === "STATISTICS" && evidence.payload.teamSide === "away",
  );

  return [hasMatchInfo, hasHomeForm, hasAwayForm, hasHomeStats, hasAwayStats].filter(
    Boolean,
  ).length;
}

function buildFeatureBundle(context: SealedProjectionReplayContext) {
  const matchId = createMatchId(context.matchId);
  const features = Object.freeze(
    context.features.map((feature) =>
      createFeature({
        featureId: `replay:${context.matchId}:${feature.name}`,
        matchId,
        name: feature.name,
        value: feature.value,
        explanation: `Replay feature ${feature.name}.`,
        sourceEvidenceId: context.evidenceRefs[0] ?? "replay:evidence",
        generatedAt: context.generatedAt,
      }),
    ),
  );

  return createFeatureBundle({
    matchId,
    features,
    evidenceRefs: Object.freeze([...context.evidenceRefs]),
    checksum: context.featureBundleChecksum,
    status: context.featureBundleStatus,
  });
}

function buildRuleResults(context: SealedProjectionReplayContext) {
  const matchId = createMatchId(context.matchId);

  return Object.freeze(
    context.rules.map((rule) =>
      createRuleResult({
        ruleId: rule.ruleId,
        matchId,
        ruleName: rule.ruleName,
        status: rule.status,
        score: rule.score,
        weight: rule.weight,
        channel: rule.channel,
        explanation: `Replay rule ${rule.ruleName}.`,
        sourceFeatureIds: Object.freeze([]),
        evaluatedAt: context.generatedAt,
      }),
    ),
  );
}

function buildSealedPredictionFromReplayProjection(input: {
  readonly context: SealedProjectionReplayContext;
  readonly projection: AnalysisResult["projection"];
  readonly scenarios: ReturnType<typeof buildScenarioSet>;
  readonly confidence: EvaluationHistoryConfidence;
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
    ruleSetVersion: "rule.mvp.p1b.player",
  });
}

export function buildProjectionReplayContext(
  analysis: AnalysisResult,
): SealedProjectionReplayContext {
  const framework = analysis.projectionFramework;

  return Object.freeze({
    matchId: analysis.matchId,
    featureModelVersion: analysis.featureBundle.featureModelVersion,
    featureBundleChecksum: analysis.featureBundle.checksum,
    featureBundleStatus: analysis.featureBundle.status,
    evidenceRefs: Object.freeze([...analysis.featureBundle.evidenceRefs]),
    features: Object.freeze(
      analysis.features.map((feature) =>
        Object.freeze({
          name: feature.name,
          value:
            typeof feature.value === "string" ||
            typeof feature.value === "number" ||
            typeof feature.value === "boolean" ||
            feature.value === null
              ? feature.value
              : JSON.stringify(feature.value),
        }),
      ),
    ),
    rules: Object.freeze(
      analysis.ruleResults.map((rule) =>
        Object.freeze({
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          status: rule.status,
          channel: rule.channel,
          weight: rule.weight,
          score: rule.score,
        }),
      ),
    ),
    requiredEvidencePresentCount: countRequiredEvidence(analysis),
    generatedAt: analysis.generatedAt,
    ...(framework === undefined
      ? {}
      : {
          parameterArtifactId: framework.parameterArtifactId,
          parameterVersionLabel: framework.parameterVersionLabel,
          parameterArtifactChecksum: framework.parameterArtifactChecksum,
        }),
  });
}

function buildReplayMetadata(input: {
  readonly projectionResult: ReturnType<typeof computeMatchProjection>;
  readonly confidence: EvaluationHistoryConfidence;
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

export class AnalysisProjectionReplayPort implements ProjectionReplayPort {
  replayV1(input: ProjectionReplayPortInput): ProjectionReplayPortOutcome {
    return Object.freeze({
      version: "v1",
      prediction: input.record.predictionSnapshot,
    });
  }

  replayV2(input: ProjectionReplayPortInput): ProjectionReplayPortOutcome {
    const context = input.replayContext;

    if (context === undefined) {
      return Object.freeze({
        version: "v2",
        reason: "Missing SealedProjectionReplayContext sidecar for V2 replay.",
      });
    }

    if (context.matchId !== input.record.matchId) {
      return Object.freeze({
        version: "v2",
        reason: "Replay context matchId does not match Evaluation History record.",
      });
    }

    const featureBundle = buildFeatureBundle(context);
    const ruleResults = buildRuleResults(context);
    const parameters =
      context.parameterVersionLabel === undefined
        ? undefined
        : getProjectionParameterArtifactByVersionLabel(
            context.parameterVersionLabel,
          );
    const projectionResult = computeMatchProjection({
      featureBundle,
      ruleResults,
      requiredEvidencePresentCount: context.requiredEvidencePresentCount,
      projectionPolicyPin: "v2",
      ...(parameters === undefined ? {} : { parameters }),
    });
    const scenarios = buildScenarioSet(projectionResult.projection);
    const prediction = buildSealedPredictionFromReplayProjection({
      context,
      projection: projectionResult.projection,
      scenarios,
      confidence: input.record.confidence,
    });
    const metadata = buildReplayMetadata({
      projectionResult,
      confidence: input.record.confidence,
    });

    return Object.freeze({
      version: "v2",
      prediction,
      ...(metadata === undefined ? {} : { metadata }),
    });
  }
}

export function buildSealedPredictionInputFromAnalysis(
  analysis: AnalysisResult,
): SealedPredictionInput {
  return buildSealedPredictionInput(analysis);
}
