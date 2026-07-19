import { CalendarClock, Trophy } from "lucide-react";
import type { ReactElement } from "react";
import type { MatchStatus, MatchSummary } from "../types/match-center";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

function statusVariant(status: MatchStatus): "default" | "fail" | "info" | "pass" {
  switch (status) {
    case "ANALYZED":
      return "pass";
    case "FAILED":
      return "fail";
    case "LOADING":
      return "info";
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
          <Trophy aria-hidden="true" className="size-4 text-blue-600" />
          {match.competition}
        </CardDescription>
        <CardTitle className="text-2xl">
          {match.homeTeam} vs {match.awayTeam}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Home Team
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">
              {match.homeTeam}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Away Team
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">
              {match.awayTeam}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Competition
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-950">
              {match.competition}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Kickoff
            </dt>
            <dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-950">
              <CalendarClock aria-hidden="true" className="size-4 text-slate-400" />
              {match.kickoffTime}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Status
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
