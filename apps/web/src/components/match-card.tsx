import { Clock3, Search } from "lucide-react";
import type { ReactElement } from "react";
import type { MatchSummary } from "../types/match-center";
import { LoadingSpinner } from "./loading-spinner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

function teamInitial(team: string): string {
  return team.slice(0, 1).toUpperCase();
}

export function MatchCard({
  isAnalyzing,
  isDisabled,
  match,
  onAnalyze,
}: Readonly<{
  isAnalyzing: boolean;
  isDisabled: boolean;
  match: MatchSummary;
  onAnalyze: (match: MatchSummary) => void;
}>): ReactElement {
  const matchup = `${match.homeTeam} vs ${match.awayTeam}`;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {match.competition}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Clock3 aria-hidden="true" className="size-3.5" />
            {match.kickoffTime}
          </span>
        </div>

        <div className="my-6 space-y-4">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white"
            >
              {teamInitial(match.homeTeam)}
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Home
              </p>
              <p className="font-semibold text-slate-950">{match.homeTeam}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-700"
            >
              {teamInitial(match.awayTeam)}
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Away
              </p>
              <p className="font-semibold text-slate-950">{match.awayTeam}</p>
            </div>
          </div>
        </div>

        <Button
          aria-label={`Analyze ${matchup}`}
          className="mt-auto w-full"
          disabled={isDisabled}
          onClick={() => onAnalyze(match)}
          type="button"
        >
          {isAnalyzing ? (
            <LoadingSpinner />
          ) : (
            <>
              <Search aria-hidden="true" className="size-4" />
              Analyze
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
