"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactElement } from "react";
import { zh } from "../copy/zh";
import { useAnalysisHistory } from "../hooks/use-analysis-history";
import { useUpcomingMatches } from "../hooks/use-upcoming-matches";
import {
  DEFAULT_HORIZON_DAYS,
  earliestMatchLocalDate,
  filterMatchCenterRows,
  formatLocalDate,
  windowEndDate,
} from "../lib/match-center-filter";
import type { MatchSummary } from "../types/match-center";
import { HomeHero } from "./home-hero";
import { MatchCard } from "./match-card";
import { MatchCenterFilters } from "./match-center-filters";
import { OverviewMetrics } from "./overview-metrics";
import { PageContainer } from "./page-container";
import { PipelineStatus } from "./pipeline-status";
import { RecentAnalysis } from "./recent-analysis";
import { Button } from "./ui/button";
import { Divider } from "./ui/divider";

export function AnalysisDashboard(): ReactElement {
  const router = useRouter();
  const history = useAnalysisHistory();
  const upcoming = useUpcomingMatches();
  const [startDate, setStartDate] = useState(() => formatLocalDate(new Date()));
  const [horizonDays, setHorizonDays] = useState(DEFAULT_HORIZON_DAYS);
  const [includeDemos, setIncludeDemos] = useState(false);

  const filteredMatches = useMemo(
    () =>
      filterMatchCenterRows(upcoming.matches, {
        startDate,
        horizonDays,
        includeDemos,
      }),
    [upcoming.matches, startDate, horizonDays, includeDemos],
  );

  const earliestAvailable = useMemo(
    () =>
      earliestMatchLocalDate(upcoming.matches, {
        includeDemos,
      }),
    [upcoming.matches, includeDemos],
  );

  const rangeEnd = windowEndDate(startDate, horizonDays);

  function analyze(match: MatchSummary): void {
    if (match.analyzable === false) {
      return;
    }

    router.push(`/matches/${encodeURIComponent(match.id)}/session`);
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
                {zh.matchCenter.eyebrow}
              </p>
              <h2
                className="mt-2 text-heading text-foreground"
                id="todays-matches-heading"
              >
                {zh.matchCenter.upcomingHeading}
              </h2>
            </div>
            <p className="text-body text-muted-foreground">
              {upcoming.isLoading
                ? zh.matchCenter.loadingFixtures
                : zh.matchCenter.fixturesAvailable(filteredMatches.length)}
            </p>
          </div>

          <div className="mb-5">
            <MatchCenterFilters
              footballDataProviderMode={upcoming.footballDataProviderMode}
              horizonDays={horizonDays}
              includeDemos={includeDemos}
              oddsProviderMode={upcoming.oddsProviderMode}
              onHorizonDaysChange={setHorizonDays}
              onIncludeDemosChange={setIncludeDemos}
              onStartDateChange={setStartDate}
              rangeEnd={rangeEnd}
              scheduleSource={upcoming.scheduleSource}
              shownCount={filteredMatches.length}
              startDate={startDate}
              totalCount={upcoming.matches.length}
              usedRecordedFallback={upcoming.usedRecordedFallback}
            />
          </div>

          {upcoming.isError ? (
            <p className="text-body text-red-700" role="alert">
              {upcoming.errorMessage ?? zh.matchCenter.loadError}
            </p>
          ) : null}

          {!upcoming.isLoading &&
          !upcoming.isError &&
          filteredMatches.length === 0 ? (
            <div className="space-y-3" role="status">
              <p className="text-body text-muted-foreground">
                {upcoming.matches.length > 0 && earliestAvailable !== undefined
                  ? zh.matchCenter.emptyFilteredOutsideWindow(
                      upcoming.matches.length,
                      earliestAvailable,
                    )
                  : zh.matchCenter.emptyFiltered}
              </p>
              {earliestAvailable !== undefined && earliestAvailable !== startDate ? (
                <Button
                  onClick={() => {
                    setStartDate(earliestAvailable);
                  }}
                  type="button"
                  variant="outline"
                >
                  {zh.matchCenter.jumpToEarliest(earliestAvailable)}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {filteredMatches.map((match) => (
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
