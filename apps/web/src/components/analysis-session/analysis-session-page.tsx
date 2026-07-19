"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ReactElement } from "react";
import { zh } from "../../copy/zh";
import { useAnalysisSessionStages } from "../../hooks/use-analysis-session-stages";
import { useMatchDetail } from "../../hooks/use-match-detail";
import { useUpcomingMatches } from "../../hooks/use-upcoming-matches";
import { findMatchById } from "../../lib/todays-matches";
import { AppTopNav } from "../app-top-nav";
import { EmptyState } from "../empty-state";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { SessionSummary } from "./session-summary";
import { SessionTimeline } from "./session-timeline";

export function AnalysisSessionPage({
  matchId,
}: Readonly<{ matchId: string }>): ReactElement {
  const router = useRouter();
  const upcoming = useUpcomingMatches();
  const match = findMatchById(matchId, upcoming.matches);
  const matchFound = match !== undefined;

  // Prefetch the existing deterministic analysis so Workspace reuses cache.
  useMatchDetail(matchId, matchFound);

  const handleComplete = useCallback((): void => {
    router.replace(`/matches/${encodeURIComponent(matchId)}`);
  }, [matchId, router]);

  const session = useAnalysisSessionStages({
    enabled: matchFound,
    onComplete: handleComplete,
  });

  return (
    <div className="min-h-screen bg-background">
      <AppTopNav eyebrow={zh.session.navEyebrow} />

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {match === undefined ? (
          <EmptyState
            action={
              <Button asChild variant="outline">
                <Link href="/">{zh.session.backToMatchCenter}</Link>
              </Button>
            }
            description={zh.session.matchNotFoundDescription(matchId)}
            title={zh.session.matchNotFound}
          />
        ) : (
          <div className="animate-fade-in space-y-6">
            <SessionSummary match={match} progress={session.progress} />

            <Card className="hover:translate-y-0">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6 space-y-1">
                  <h2 className="text-title font-semibold text-foreground">
                    {zh.session.timelineHeading}
                  </h2>
                  <p className="text-body text-muted-foreground">
                    {zh.session.timelineDescription}
                  </p>
                </div>
                <SessionTimeline stages={session.stages} />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
