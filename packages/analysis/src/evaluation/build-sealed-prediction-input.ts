import type { AnalysisResult } from "../domain/analysis-result.js";
import type { SealedPredictionInput } from "@fas/statistics";

/**
 * Maps a sealed AnalysisResult into Statistics evaluation input.
 * Does not read MATCH_RESULT for Projection — Actual is supplied separately.
 */
export function buildSealedPredictionInput(
  analysis: AnalysisResult,
): SealedPredictionInput {
  const { projection, scenarios, intelligenceConfidence, ruleResults, features } =
    analysis;

  return Object.freeze({
    matchId: analysis.matchId,
    projectionChecksum: projection.checksum,
    projectionStatus: projection.status,
    pHome: projection.pHome,
    pDraw: projection.pDraw,
    pAway: projection.pAway,
    topScorelines: Object.freeze(
      projection.topScorelines.map((scoreline) => Object.freeze({ ...scoreline })),
    ),
    goalRange: Object.freeze({ ...projection.goalRange }),
    predictionConfidence: intelligenceConfidence.predictionConfidence,
    confidenceBand: intelligenceConfidence.confidenceBand,
    scenarios: Object.freeze({
      mostLikely: Object.freeze({
        slot: scenarios.mostLikely.slot,
        winner: scenarios.mostLikely.winner,
        homeGoals: scenarios.mostLikely.homeGoals,
        awayGoals: scenarios.mostLikely.awayGoals,
        probability: scenarios.mostLikely.probability,
      }),
      secondLikely: Object.freeze({
        slot: scenarios.secondLikely.slot,
        winner: scenarios.secondLikely.winner,
        homeGoals: scenarios.secondLikely.homeGoals,
        awayGoals: scenarios.secondLikely.awayGoals,
        probability: scenarios.secondLikely.probability,
      }),
      upset: Object.freeze({
        slot: scenarios.upset.slot,
        winner: scenarios.upset.winner,
        homeGoals: scenarios.upset.homeGoals,
        awayGoals: scenarios.upset.awayGoals,
        probability: scenarios.upset.probability,
      }),
    }),
    rules: Object.freeze(
      ruleResults.map((rule) =>
        Object.freeze({
          ruleName: rule.ruleName,
          status: rule.status,
          channel: rule.channel,
        }),
      ),
    ),
    featureNames: Object.freeze(features.map((feature) => feature.name)),
    projectionModelVersion: projection.projectionModelVersion,
    featureModelVersion: analysis.featureBundle.featureModelVersion,
    ruleSetVersion: "rule.mvp.l1b.club",
  });
}
