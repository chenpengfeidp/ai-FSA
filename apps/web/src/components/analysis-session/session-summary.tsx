import type { ReactElement } from "react";
import type { AnalysisSessionProgress } from "../../types/analysis-session";
import type { MatchSummary } from "../../types/match-center";
import { Card, CardContent } from "../ui/card";

export function SessionSummary({
  match,
  progress,
}: Readonly<{
  match: MatchSummary;
  progress: AnalysisSessionProgress;
}>): ReactElement {
  return (
    <Card className="overflow-hidden hover:translate-y-0">
      <CardContent className="space-y-5 p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary">
            Analysis Session
          </p>
          <h1 className="text-heading font-semibold tracking-tight text-foreground sm:text-display sm:leading-[2.5rem]">
            {match.homeTeam} vs {match.awayTeam}
          </h1>
          <p className="text-body text-muted-foreground">
            Watching the deterministic pipeline assemble a reviewable report.
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-caption font-semibold uppercase tracking-[0.12em] text-subtle">
              Match
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {match.homeTeam} vs {match.awayTeam}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-caption font-semibold uppercase tracking-[0.12em] text-subtle">
              Competition
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {match.competition}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-caption font-semibold uppercase tracking-[0.12em] text-subtle">
              Kickoff
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {match.kickoffTime}
            </dd>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-caption font-semibold uppercase tracking-[0.12em] text-subtle">
              Estimated duration
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {progress.estimatedDurationLabel}
            </dd>
          </div>
        </dl>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption font-semibold text-muted-foreground">
              Progress
            </p>
            <p className="text-caption font-semibold tabular-nums text-foreground">
              {progress.percent}% · {progress.completedCount}/{progress.totalCount}
            </p>
          </div>
          <div
            aria-label="Analysis session progress"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className="h-2 overflow-hidden rounded-full bg-surface-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${String(progress.percent)}%` }}
            />
          </div>
          {progress.runningLabel ? (
            <p className="text-caption text-muted-foreground">
              Running: {progress.runningLabel}
            </p>
          ) : (
            <p className="text-caption text-success-foreground">
              Session complete — opening workspace
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
