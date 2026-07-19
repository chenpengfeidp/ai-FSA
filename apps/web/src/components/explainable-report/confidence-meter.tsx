import type { ReactElement } from "react";
import type { ConfidenceMeterView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const LEVELS = ["Low", "Medium", "High", "Very High"] as const;

export function ConfidenceMeter({
  confidence,
}: Readonly<{ confidence: ConfidenceMeterView }>): ReactElement {
  return (
    <Card className="animate-fade-in-delay-2 hover:translate-y-0">
      <CardHeader className="border-b-0 pb-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>Confidence Meter</CardTitle>
            <p className="mt-1 text-caption text-muted-foreground">
              Based on deterministic rule pass rate ({confidence.passCount}/
              {confidence.ruleCount})
            </p>
          </div>
          <p className="text-heading text-foreground">{confidence.level}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="h-4 overflow-hidden rounded-full bg-surface-muted">
          <div
            aria-label={`Confidence ${confidence.level}`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={confidence.percent}
            aria-valuetext={confidence.level}
            className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-[width] duration-500"
            role="progressbar"
            style={{ width: `${confidence.percent}%` }}
          />
        </div>
        <ol className="grid grid-cols-4 gap-2 text-center">
          {LEVELS.map((level) => (
            <li
              className={
                level === confidence.level
                  ? "text-caption font-semibold text-primary"
                  : "text-caption text-subtle"
              }
              key={level}
            >
              {level}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
