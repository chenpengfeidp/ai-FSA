import type { ReactElement } from "react";
import { buildExplainableReportView } from "../../lib/explainable-report";
import type { AnalysisReportDto } from "../../types/analysis";
import type { EvidenceDto } from "../../types/evidence";
import type { MatchSummary } from "../../types/match-center";
import { ConfidenceMeter } from "./confidence-meter";
import { EvidenceTimeline } from "./evidence-timeline";
import { ExplainablePipeline } from "./explainable-pipeline";
import { FeatureImportance } from "./feature-importance";
import { FinalRecommendation } from "./final-recommendation";
import { GoalRangeCard } from "./goal-range-card";
import { MostLikelyScoreCard } from "./most-likely-score-card";
import { PredictionHero } from "./prediction-hero";
import { WinnerPredictionCard } from "./winner-prediction-card";

export function ExplainableMatchReport({
  evidence,
  match,
  report,
}: Readonly<{
  evidence: readonly EvidenceDto[];
  match: MatchSummary;
  report: AnalysisReportDto;
}>): ReactElement {
  const view = buildExplainableReportView(match, report, evidence);

  return (
    <div className="space-y-8 sm:space-y-10">
      <PredictionHero
        confidence={view.confidence}
        header={view.header}
        prediction={view.winnerPrediction}
        recommendation={view.finalRecommendation}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <WinnerPredictionCard prediction={view.winnerPrediction} />
        <MostLikelyScoreCard score={view.mostLikelyScore} />
      </div>

      <GoalRangeCard goalRange={view.goalRange} />
      <ConfidenceMeter confidence={view.confidence} />
      <ExplainablePipeline rules={view.ruleEvaluations} />
      <FeatureImportance features={view.featureImportance} />
      <EvidenceTimeline items={view.evidenceTimeline} />
      <FinalRecommendation recommendation={view.finalRecommendation} />
    </div>
  );
}
