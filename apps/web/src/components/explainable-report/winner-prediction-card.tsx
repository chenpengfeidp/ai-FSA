import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { WinnerPredictionView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function WinnerPredictionCard({
  prediction,
}: Readonly<{ prediction: WinnerPredictionView }>): ReactElement {
  return (
    <Card className="animate-fade-in-delay-1 h-full hover:translate-y-0">
      <CardHeader className="border-b-0 pb-0">
        <CardTitle>{zh.report.winnerPrediction}</CardTitle>
        <p className="text-caption text-muted-foreground">
          {zh.report.winnerPredictionHint}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body font-semibold text-foreground">
              {prediction.homeTeam}
            </p>
            <p className="text-title font-bold tabular-nums text-foreground">
              {prediction.homePercent}%
            </p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{ width: `${prediction.homePercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body font-semibold text-foreground">
              {prediction.awayTeam}
            </p>
            <p className="text-title font-bold tabular-nums text-muted-foreground">
              {prediction.awayPercent}%
            </p>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-secondary transition-[width] duration-500"
              style={{ width: `${prediction.awayPercent}%` }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-full border border-border bg-surface-muted">
          <div className="flex h-3 w-full">
            <div
              className="bg-primary transition-[width] duration-500"
              style={{ width: `${prediction.homePercent}%` }}
            />
            <div
              className="bg-secondary transition-[width] duration-500"
              style={{ width: `${prediction.awayPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
