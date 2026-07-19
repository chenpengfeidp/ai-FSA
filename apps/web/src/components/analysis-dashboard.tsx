"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useAnalysisHistory } from "../hooks/use-analysis-history";
import { todaysMatches } from "../lib/todays-matches";
import type { MatchSummary } from "../types/match-center";
import { HomeHero } from "./home-hero";
import { MatchCard } from "./match-card";
import { OverviewMetrics } from "./overview-metrics";
import { PageContainer } from "./page-container";
import { PipelineStatus } from "./pipeline-status";
import { RecentAnalysis } from "./recent-analysis";
import { Divider } from "./ui/divider";

export function AnalysisDashboard(): ReactElement {
  const router = useRouter();
  const history = useAnalysisHistory();

  function analyze(match: MatchSummary): void {
    router.push(`/matches/${encodeURIComponent(match.id)}`);
  }

  return (
    <PageContainer>
      <div className="space-y-10 sm:space-y-12">
        <HomeHero />

        <section
          aria-labelledby="todays-matches-heading"
          className="animate-fade-in-delay-1 scroll-mt-20"
          id="todays-matches"
        >
          <div className="mb-5 flex flex-col justify-between gap-2 sm:mb-6 sm:flex-row sm:items-end">
            <div>
              <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.14em] text-primary">
                <CalendarDays aria-hidden="true" className="size-3.5" />
                Match Center
              </p>
              <h2
                className="mt-2 text-heading text-foreground"
                id="todays-matches-heading"
              >
                Today&apos;s Matches
              </h2>
            </div>
            <p className="text-body text-muted-foreground">
              {todaysMatches.length} fixtures available
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {todaysMatches.map((match) => (
              <MatchCard
                isAnalyzing={false}
                isDisabled={false}
                key={match.id}
                match={match}
                onAnalyze={analyze}
              />
            ))}
          </div>
        </section>

        <Divider className="my-0" />

        <RecentAnalysis entries={history.recent} />

        <OverviewMetrics metrics={history.metrics} />

        <PipelineStatus />
      </div>
    </PageContainer>
  );
}
