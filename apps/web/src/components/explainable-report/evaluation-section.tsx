import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ActualMatchResultDto,
  PredictionEvaluationDto,
} from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

function hitLabel(hit: boolean): string {
  return hit ? zh.report.evaluationHit : zh.report.evaluationMiss;
}

function winnerLabel(winner: "away" | "draw" | "home"): string {
  if (winner === "home") {
    return zh.report.evaluationWinnerHome;
  }

  if (winner === "away") {
    return zh.report.evaluationWinnerAway;
  }

  return zh.report.evaluationWinnerDraw;
}

export function EvaluationSection({
  actualResult,
  evaluation,
}: Readonly<{
  actualResult: ActualMatchResultDto | undefined;
  evaluation: PredictionEvaluationDto | undefined;
}>): ReactElement {
  return (
    <>
      <WorkspaceSection id="actual-result">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
              {zh.report.actualResult}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {zh.report.actualResultHint}
            </p>
          </div>
          {actualResult === undefined ? (
            <p className="text-sm text-zinc-500">
              {zh.report.actualResultUnavailable}
            </p>
          ) : (
            <dl className="grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">{zh.report.actualScore}</dt>
                <dd className="font-medium">
                  {actualResult.homeGoals}-{actualResult.awayGoals}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.actualWinner}</dt>
                <dd className="font-medium">{winnerLabel(actualResult.winner)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.actualTotalGoals}</dt>
                <dd className="font-medium">{actualResult.totalGoals}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.actualCompetition}</dt>
                <dd className="font-medium">
                  {actualResult.competitionName ??
                    zh.report.actualCompetitionUnknown}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">{zh.report.actualProvenance}</dt>
                <dd className="font-medium">
                  {actualResult.providerId} · {actualResult.providerMethod}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </WorkspaceSection>

      <WorkspaceSection id="evaluation">
        <div className="space-y-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
              {zh.report.evaluation}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{zh.report.evaluationHint}</p>
          </div>
          {evaluation === undefined ? (
            <p className="text-sm text-zinc-500">
              {zh.report.evaluationUnavailable}
            </p>
          ) : evaluation.status === "excluded" ? (
            <p className="text-sm text-zinc-500">
              {zh.report.evaluationExcluded}: {evaluation.exclusionReason}
            </p>
          ) : evaluation.metrics === undefined ? (
            <p className="text-sm text-zinc-500">
              {zh.report.evaluationUnavailable}
            </p>
          ) : (
            <dl className="grid gap-2 text-sm text-zinc-800 sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">{zh.report.metricWinnerHit}</dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.winnerHit)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricScoreHit}</dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.scoreHit)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricGoalHit}</dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.goalHit)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricGoalRangeHit}</dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.goalRangeHit)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.metricScenarioMostLikely}
                </dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.scenarioHit.mostLikely)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">
                  {zh.report.metricScenarioAlternative}
                </dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.scenarioHit.alternative)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricScenarioUpset}</dt>
                <dd className="font-medium">
                  {hitLabel(evaluation.metrics.scenarioHit.upset)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricConfidence}</dt>
                <dd className="font-medium">
                  {evaluation.metrics.confidenceCorrectness === "correct"
                    ? zh.report.confidenceCorrect
                    : evaluation.metrics.confidenceCorrectness === "incorrect"
                      ? zh.report.confidenceIncorrect
                      : zh.report.confidenceNotClaimed}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricRuleCoverage}</dt>
                <dd className="font-medium">
                  {(evaluation.metrics.ruleCoverage.agreementRatio * 100).toFixed(0)}
                  %{" · "}
                  {evaluation.metrics.ruleCoverage.pass}/
                  {evaluation.metrics.ruleCoverage.applicable}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">{zh.report.metricFeatureCoverage}</dt>
                <dd className="font-medium">
                  {(evaluation.metrics.featureCoverage.coverageRatio * 100).toFixed(
                    0,
                  )}
                  %{" · "}
                  {evaluation.metrics.featureCoverage.corePresent}/
                  {evaluation.metrics.featureCoverage.coreExpected}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">{zh.report.metricPaperReturn}</dt>
                <dd className="font-medium">
                  {evaluation.metrics.paperUnitReturn > 0 ? "+1" : "−1"}
                </dd>
                <p className="mt-1 text-xs text-zinc-500">
                  {evaluation.metrics.paperMetricDisclaimer}
                </p>
              </div>
            </dl>
          )}
        </div>
      </WorkspaceSection>
    </>
  );
}
