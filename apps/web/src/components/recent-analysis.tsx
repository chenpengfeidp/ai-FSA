"use client";

import { Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { zh } from "../copy/zh";
import { formatTimestamp } from "../lib/utils";
import type { AnalysisHistoryEntry } from "../types/dashboard";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { EmptyState } from "./ui/empty-state";
import { StatusBadge } from "./ui/status-badge";
import { Tag } from "./ui/tag";

export function RecentAnalysis({
  entries,
}: Readonly<{
  entries: readonly AnalysisHistoryEntry[];
}>): ReactElement {
  const router = useRouter();

  return (
    <section
      aria-labelledby="recent-analysis-heading"
      className="animate-fade-in-delay-2 space-y-4"
      id="recent-analysis"
    >
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-heading text-foreground" id="recent-analysis-heading">
          {zh.recentAnalysis.heading}
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-caption text-muted-foreground">
            {entries.length > 0
              ? zh.recentAnalysis.completedCount(entries.length)
              : zh.recentAnalysis.noReportsYet}
          </p>
          <Button asChild size="sm" variant="ghost">
            <Link href="/reports">{zh.recentAnalysis.openLibrary}</Link>
          </Button>
        </div>
      </div>

      {entries.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.matchId}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <Tag variant="muted">{entry.competition}</Tag>
                    <StatusBadge
                      label={zh.recentAnalysis.completed}
                      status="SUCCESS"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-title text-foreground">
                      {entry.homeTeam} vs {entry.awayTeam}
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {formatTimestamp(entry.analyzedAt)} UTC
                    </p>
                  </div>

                  <Button
                    aria-label={zh.recentAnalysis.openAnalysisAria(
                      entry.homeTeam,
                      entry.awayTeam,
                    )}
                    className="mt-auto w-full sm:w-auto"
                    onClick={() => {
                      router.push(`/matches/${encodeURIComponent(entry.matchId)}`);
                    }}
                    type="button"
                    variant="outline"
                  >
                    {zh.recentAnalysis.openAnalysis}
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          description={zh.recentAnalysis.emptyDescription}
          icon={<Activity aria-hidden="true" className="size-5" />}
          title={zh.recentAnalysis.emptyTitle}
        />
      )}
    </section>
  );
}
