"use client";

import { ArrowLeft, Clock3, History } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { useAnalysisHistory } from "../../hooks/use-analysis-history";
import { cn } from "../../lib/utils";
import { todaysMatches } from "../../lib/todays-matches";
import { Button } from "../ui/button";
import { Divider } from "../ui/divider";

export function MatchWorkspaceSidebar({
  activeMatchId,
}: Readonly<{ activeMatchId?: string | undefined }>): ReactElement {
  const history = useAnalysisHistory();

  return (
    <aside className="flex h-full flex-col gap-6">
      <div>
        <Button asChild className="w-full justify-start" variant="ghost">
          <Link href="/">
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to Match Center
          </Link>
        </Button>
      </div>

      <div className="space-y-3">
        <p className="px-2 text-caption font-semibold uppercase tracking-[0.14em] text-subtle">
          Match List
        </p>
        <ul className="space-y-1">
          {todaysMatches.map((match) => {
            const active = match.id === activeMatchId;

            return (
              <li key={match.id}>
                <Link
                  className={cn(
                    "block rounded-xl border px-3 py-3 transition-colors duration-200",
                    active
                      ? "border-primary/30 bg-primary-muted text-foreground"
                      : "border-transparent hover:border-border hover:bg-surface-muted",
                  )}
                  href={`/matches/${encodeURIComponent(match.id)}`}
                >
                  <p className="text-caption font-semibold text-primary">
                    {match.competition}
                  </p>
                  <p className="mt-1 text-body font-semibold text-foreground">
                    {match.homeTeam} vs {match.awayTeam}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-caption text-muted-foreground">
                    <Clock3 aria-hidden="true" className="size-3" />
                    {match.kickoffTime}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <Divider className="my-0" />

      <div className="space-y-3">
        <p className="flex items-center gap-2 px-2 text-caption font-semibold uppercase tracking-[0.14em] text-subtle">
          <History aria-hidden="true" className="size-3.5" />
          Recent Analyses
        </p>
        {history.recent.length === 0 ? (
          <p className="px-2 text-caption leading-5 text-muted-foreground">
            Analyze a match to populate recent history.
          </p>
        ) : (
          <ul className="space-y-1">
            {history.recent.slice(0, 6).map((entry) => {
              const active = entry.matchId === activeMatchId;

              return (
                <li key={entry.matchId}>
                  <Link
                    className={cn(
                      "block rounded-xl border px-3 py-3 transition-colors duration-200",
                      active
                        ? "border-primary/30 bg-primary-muted"
                        : "border-transparent hover:border-border hover:bg-surface-muted",
                    )}
                    href={`/matches/${encodeURIComponent(entry.matchId)}`}
                  >
                    <p className="text-body font-semibold text-foreground">
                      {entry.homeTeam} vs {entry.awayTeam}
                    </p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {entry.competition}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
