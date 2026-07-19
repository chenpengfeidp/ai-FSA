import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { MostLikelyScoreView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";

export function MostLikelyScoreCard({
  score,
}: Readonly<{ score: MostLikelyScoreView }>): ReactElement {
  return (
    <Card className="animate-fade-in-delay-1 h-full hover:translate-y-0">
      <CardHeader className="border-b-0 pb-0">
        <CardTitle>{zh.report.mostLikelyScore}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col items-center justify-center gap-4 pt-4 text-center">
        {score.available && score.homeGoals !== null && score.awayGoals !== null ? (
          <p className="text-[3rem] font-bold tracking-tight text-foreground tabular-nums sm:text-[3.5rem]">
            {score.homeGoals}
            <span className="mx-3 text-subtle">:</span>
            {score.awayGoals}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[2.5rem] font-bold tracking-tight text-subtle tabular-nums">
              — <span className="mx-1">:</span> —
            </p>
            <p className="max-w-xs text-caption text-muted-foreground">
              {score.note}
            </p>
          </div>
        )}
        <StatusBadge
          label={zh.report.confidenceLabel(
            zh.report.confidenceLevel(score.confidence),
          )}
          status="INFO"
        />
      </CardContent>
    </Card>
  );
}
