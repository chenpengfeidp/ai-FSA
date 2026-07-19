import type { ReactElement } from "react";
import type { WinnerPredictionView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function WinnerPredictionCard({
  prediction,
}: Readonly<{ prediction: WinnerPredictionView }>): ReactElement {
  return (
    <Card className="animate-fade-in-delay-1 h-full">
      <CardHeader className="border-b-0 pb-0">
        <CardTitle>Winner Prediction</CardTitle>
        <p className="text-caption text-muted-foreground">
          Relative weight from deterministic rule scores
        </p>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <p className="text-title text-foreground">{prediction.homeTeam}</p>
              <p className="text-display font-bold tabular-nums text-foreground">
                {prediction.homePercent}%
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${prediction.homePercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <p className="text-title text-foreground">{prediction.awayTeam}</p>
              <p className="text-display font-bold tabular-nums text-muted-foreground">
                {prediction.awayPercent}%
              </p>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-secondary transition-[width] duration-500"
                style={{ width: `${prediction.awayPercent}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
