import { Activity } from "lucide-react";
import type { ReactElement } from "react";
import type { AnalysisReportDto } from "../types/analysis";
import type { MatchSummary } from "../types/match-center";
import { AnalysisCard } from "./analysis-card";
import { ErrorPanel } from "./error-panel";
import { Card, CardContent } from "./ui/card";

export function RecentAnalysis({
  errorMessage,
  match,
  report,
}: Readonly<{
  errorMessage: string | undefined;
  match: MatchSummary | undefined;
  report: AnalysisReportDto | undefined;
}>): ReactElement {
  return (
    <section aria-labelledby="recent-analysis-heading" className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Latest result</p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
          id="recent-analysis-heading"
        >
          Recent Analysis
        </h2>
      </div>

      {errorMessage ? <ErrorPanel message={errorMessage} /> : null}

      {match && report ? (
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {match.competition}
              </p>
              <p className="mt-1 font-semibold text-slate-950">
                {match.homeTeam} vs {match.awayTeam}
              </p>
            </div>
            <p className="text-sm font-medium text-slate-500">
              Kickoff {match.kickoffTime}
            </p>
          </div>
          <AnalysisCard report={report} />
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Activity aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No analysis yet</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Choose a match above to run the existing deterministic analysis
              workflow.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
