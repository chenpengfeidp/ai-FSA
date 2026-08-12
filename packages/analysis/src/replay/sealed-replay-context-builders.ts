import { createFeature, createFeatureBundle } from "@fas/feature";
import { createMatchId } from "@fas/match";
import { createRuleResult } from "@fas/rule";
import type { SealedProjectionReplayContext } from "@fas/statistics";

/** Rebuild FeatureBundle from a sealed replay sidecar (no Provider / Evidence reload). */
export function buildFeatureBundleFromSealedReplayContext(
  context: SealedProjectionReplayContext,
) {
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

/** Rebuild RuleResults from a sealed replay sidecar (no live Rule re-evaluation). */
export function buildRuleResultsFromSealedReplayContext(
  context: SealedProjectionReplayContext,
) {
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
