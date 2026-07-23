import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { EvaluationHistoryRecordDto } from "../../types/analysis";
import { WorkspaceSection } from "./workspace-section";

export function EvaluationHistorySection({
  history,
}: Readonly<{
  history: readonly EvaluationHistoryRecordDto[] | undefined;
}>): ReactElement {
  return (
    <WorkspaceSection id="evaluation-history">
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {zh.report.evaluationHistory}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            {zh.report.evaluationHistoryHint}
          </p>
        </div>
        {history === undefined || history.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {zh.report.evaluationHistoryUnavailable}
          </p>
        ) : (
          <ul className="space-y-3">
            {history.map((record) => (
              <li
                key={record.historyId}
                className="border-t border-zinc-200 pt-3 text-sm text-zinc-800 first:border-t-0 first:pt-0"
              >
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500">{zh.report.historyMatch}</dt>
                    <dd className="font-medium">
                      {record.homeTeam} vs {record.awayTeam}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{zh.report.historySeason}</dt>
                    <dd className="font-medium">{record.season}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{zh.report.historyDate}</dt>
                    <dd className="font-medium">{record.matchDate}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{zh.report.historyCompetition}</dt>
                    <dd className="font-medium">
                      {record.competitionName ??
                        record.competitionId ??
                        zh.report.actualCompetitionUnknown}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{zh.report.historyPins}</dt>
                    <dd className="font-medium break-all">
                      {record.featureModelVersion} · {record.ruleSetVersion} ·{" "}
                      {record.projectionModelVersion}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{zh.report.historyConfidence}</dt>
                    <dd className="font-medium">
                      {record.confidence.predictionConfidence} (
                      {record.confidence.confidenceBand})
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-zinc-500">{zh.report.historyRecordedAt}</dt>
                    <dd className="font-medium">{record.recordedAt}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WorkspaceSection>
  );
}
