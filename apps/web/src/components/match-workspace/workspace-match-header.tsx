import { CalendarClock, Trophy } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { MatchStatus, MatchSummary } from "../../types/match-center";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Tag } from "../ui/tag";

function statusVariant(
  status: MatchStatus,
): "default" | "FAIL" | "INFO" | "SUCCESS" {
  switch (status) {
    case "ANALYZED":
      return "SUCCESS";
    case "FAILED":
      return "FAIL";
    case "LOADING":
      return "INFO";
    default:
      return "default";
  }
}

export function WorkspaceMatchHeader({
  match,
  status,
}: Readonly<{
  match: MatchSummary;
  status: MatchStatus;
}>): ReactElement {
  return (
    <Card className="animate-fade-in overflow-hidden hover:translate-y-0">
      <CardContent className="relative px-6 py-7 sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--fas-primary-muted),transparent_55%)]"
        />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag variant="primary">
              <Trophy aria-hidden="true" className="size-3.5" />
              {match.competition}
            </Tag>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              {zh.workspace.kickoff(match.kickoffTime)}
            </span>
            <Badge variant={statusVariant(status)}>{status}</Badge>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-caption font-semibold uppercase tracking-[0.16em] text-primary">
                {zh.workspace.aiAnalysisWorkspace}
              </p>
              <h1 className="text-[1.75rem] font-bold tracking-tight text-foreground sm:text-[2.25rem] sm:leading-tight">
                {match.homeTeam}
                <span className="mx-3 text-subtle">{zh.workspace.vs}</span>
                {match.awayTeam}
              </h1>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:text-right">
              <div>
                <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
                  {zh.workspace.home}
                </dt>
                <dd className="mt-1 text-body font-semibold text-foreground">
                  {match.homeTeam}
                </dd>
              </div>
              <div>
                <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
                  {zh.workspace.away}
                </dt>
                <dd className="mt-1 text-body font-semibold text-foreground">
                  {match.awayTeam}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
