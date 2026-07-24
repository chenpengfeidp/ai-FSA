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
import { AdvancedStatisticsContextSection } from "./advanced-statistics-context";
import { AvailabilityContextSection } from "./availability-context";
import { ClubIntelligenceEvidenceSection } from "./club-intelligence-evidence";
import { ExpectedGoalsContextSection } from "./expected-goals-context";
import { MarketEvidenceSection } from "./market-evidence";
import { MatchContextEvidenceSection } from "./match-context-evidence";
import { LineupContextSection } from "./lineup-context";
import { PlayersContextSection } from "./player-context";
import { RefereeContextSection } from "./referee-context";
import { VenueContextSection } from "./venue-context";
import { CalibrationSection } from "./calibration-section";
import { ContributionSection } from "./contribution-section";
import { EvaluationHistorySection } from "./evaluation-history-section";
import { EvaluationSection } from "./evaluation-section";
import { ValidationSection } from "./validation-section";
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

      <EvaluationSection
        actualResult={report.actualResult}
        evaluation={report.evaluation}
      />

      <EvaluationHistorySection history={report.evaluationHistory} />

      <CalibrationSection calibration={report.calibration} />

      <ValidationSection validation={report.validation} />

      <ContributionSection contribution={report.contribution} />

      <ReasoningSection />

      <WorkspaceSection id="venue">
        <VenueContextSection venue={view.venue} />
      </WorkspaceSection>

      <WorkspaceSection id="referee">
        <RefereeContextSection referee={view.referee} />
      </WorkspaceSection>

      <WorkspaceSection id="players">
        <PlayersContextSection players={view.players} />
      </WorkspaceSection>

      <WorkspaceSection id="lineups">
        <LineupContextSection lineups={view.lineups} />
      </WorkspaceSection>

      <WorkspaceSection id="advanced-statistics">
        <AdvancedStatisticsContextSection statistics={view.advancedStatistics} />
      </WorkspaceSection>

      <WorkspaceSection id="expected-goals">
        <ExpectedGoalsContextSection expectedGoals={view.expectedGoals} />
      </WorkspaceSection>

      <WorkspaceSection id="club-intelligence">
        <ClubIntelligenceEvidenceSection clubIntelligence={view.clubIntelligence} />
      </WorkspaceSection>

      <WorkspaceSection id="match-context">
        <MatchContextEvidenceSection matchContext={view.matchContext} />
      </WorkspaceSection>

      <WorkspaceSection id="market-evidence">
        <MarketEvidenceSection marketEvidence={view.marketEvidence} />
      </WorkspaceSection>

      <WorkspaceSection id="availability">
        <AvailabilityContextSection availability={view.availability} />
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
