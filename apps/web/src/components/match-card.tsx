import { Clock3, Search } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../copy/zh";
import type { MatchSummary } from "../types/match-center";
import { LoadingSpinner } from "./loading-spinner";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Tag } from "./ui/tag";

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
  const analyzable = match.analyzable !== false;
  const disabled = isDisabled || !analyzable;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardContent className="flex h-full flex-col gap-6 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Tag variant="primary">{match.competition}</Tag>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-3.5" />
            {match.kickoffTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full bg-secondary text-title font-bold text-secondary-foreground shadow-sm"
            >
              {teamInitial(match.homeTeam)}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                {zh.matchCard.home}
              </p>
              <p className="truncate text-body font-semibold text-foreground">
                {match.homeTeam}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1 px-1">
            <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-caption font-bold tracking-[0.2em] text-muted-foreground">
              {zh.matchCard.vs}
            </span>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-title font-bold text-foreground"
            >
              {teamInitial(match.awayTeam)}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                {zh.matchCard.away}
              </p>
              <p className="truncate text-body font-semibold text-foreground">
                {match.awayTeam}
              </p>
            </div>
          </div>
        </div>

        <Button
          aria-label={
            analyzable
              ? zh.matchCard.analyzeAria(matchup)
              : zh.matchCard.evidenceIncompleteAria(matchup)
          }
          className="mt-auto w-full transition-transform duration-200 hover:scale-[1.01]"
          disabled={disabled}
          onClick={() => onAnalyze(match)}
          type="button"
          variant="primary"
        >
          {isAnalyzing ? (
            <LoadingSpinner />
          ) : (
            <>
              <Search aria-hidden="true" className="size-4" />
              {analyzable ? zh.matchCard.analyze : zh.matchCard.evidenceIncomplete}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
