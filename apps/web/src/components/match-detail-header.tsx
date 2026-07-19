import { CalendarClock, Trophy } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../copy/zh";
import type { MatchStatus, MatchSummary } from "../types/match-center";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

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

export function MatchDetailHeader({
  match,
  status,
}: Readonly<{
  match: MatchSummary;
  status: MatchStatus;
}>): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Trophy aria-hidden="true" className="size-4 text-primary" />
          {match.competition}
        </CardDescription>
        <CardTitle className="text-heading">
          {match.homeTeam} vs {match.awayTeam}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
              {zh.matchDetail.homeTeam}
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {match.homeTeam}
            </dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
              {zh.matchDetail.awayTeam}
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {match.awayTeam}
            </dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
              {zh.matchDetail.competition}
            </dt>
            <dd className="mt-1 text-body font-semibold text-foreground">
              {match.competition}
            </dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
              {zh.matchDetail.kickoff}
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-body font-semibold text-foreground">
              <CalendarClock aria-hidden="true" className="size-4 text-subtle" />
              {match.kickoffTime}
            </dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
              {zh.matchDetail.status}
            </dt>
            <dd className="mt-1">
              <Badge variant={statusVariant(status)}>{status}</Badge>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
