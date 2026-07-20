import type { ReactElement } from "react";
import { buildExplainableReportView } from "../../lib/explainable-report";
import type { AnalysisReportDto } from "../../types/analysis";
import type { EvidenceDto } from "../../types/evidence";
import type { MatchSummary } from "../../types/match-center";
import { DeveloperDetails } from "./developer-details";
import { EvidenceTimeline } from "./evidence-timeline";
import { FeatureImportance } from "./feature-importance";
import { FinalRecommendation } from "./final-recommendation";
import { PredictionHero } from "./prediction-hero";
import { ReasoningSection } from "./reasoning-section";
import { RuleEvaluationSection } from "./rule-evaluation-section";
import { PlayersContextSection } from "./player-context";
import { VenueContextSection } from "./venue-context";
import { WinnerPredictionCard } from "./winner-prediction-card";
import { WorkspaceSection } from "./workspace-section";

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
    <div className="space-y-10 sm:space-y-12">
      <WorkspaceSection id="prediction">
        <PredictionHero
          confidence={view.confidence}
          header={view.header}
          prediction={view.winnerPrediction}
          recommendation={view.finalRecommendation}
        />
        <WinnerPredictionCard prediction={view.winnerPrediction} />
      </WorkspaceSection>

      <ReasoningSection />

      <WorkspaceSection id="venue">
        <VenueContextSection venue={view.venue} />
      </WorkspaceSection>

      <WorkspaceSection id="players">
        <PlayersContextSection players={view.players} />
      </WorkspaceSection>

      <WorkspaceSection id="evidence">
        <EvidenceTimeline items={view.evidenceTimeline} />
      </WorkspaceSection>

      <WorkspaceSection id="features">
        <FeatureImportance features={view.featureImportance} />
      </WorkspaceSection>

      <RuleEvaluationSection rules={view.ruleEvaluations} />

      <WorkspaceSection id="recommendation">
        <FinalRecommendation recommendation={view.finalRecommendation} />
      </WorkspaceSection>

      <DeveloperDetails report={report} />
    </div>
  );
}
