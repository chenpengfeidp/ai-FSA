"use client";

import { Activity, CalendarClock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { formatTimestamp } from "../lib/utils";
import type { AnalysisHistoryEntry } from "../types/dashboard";
import { Card, CardContent } from "./ui/card";

export function RecentAnalysis({
  entries,
}: Readonly<{
  entries: readonly AnalysisHistoryEntry[];
}>): ReactElement {
  const router = useRouter();

  return (
    <section aria-labelledby="recent-analysis-heading" className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Latest results</p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
          id="recent-analysis-heading"
        >
          Recent Analysis
        </h2>
      </div>

      {entries.length > 0 ? (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.matchId}>
              <button
                aria-label={`Open analysis for ${entry.homeTeam} vs ${entry.awayTeam}`}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 text-left shadow-sm hover:border-blue-200 hover:bg-blue-50/40"
                onClick={() => {
                  router.push(`/matches/${encodeURIComponent(entry.matchId)}`);
                }}
                type="button"
              >
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {entry.competition}
                  </p>
                  <p className="font-semibold text-slate-950">
                    {entry.homeTeam} vs {entry.awayTeam}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock aria-hidden="true" className="size-3.5" />
                      Kickoff {entry.kickoffTime}
                    </span>
                    <span>Analyzed {formatTimestamp(entry.analyzedAt)} UTC</span>
                  </div>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-slate-400"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Activity aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-4 font-semibold text-slate-900">No analysis yet</p>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Analyze a match to populate overview metrics and recent results.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
