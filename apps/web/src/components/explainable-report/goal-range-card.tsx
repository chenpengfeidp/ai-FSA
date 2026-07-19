import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { cn } from "../../lib/utils";
import type { GoalRangeView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function GoalRangeCard({
  goalRange,
}: Readonly<{ goalRange: GoalRangeView }>): ReactElement {
  return (
    <Card className="animate-fade-in-delay-2 h-full hover:translate-y-0">
      <CardHeader className="border-b-0 pb-0">
        <CardTitle>{zh.report.goalRange}</CardTitle>
        <p className="text-caption text-muted-foreground">
          {goalRange.available ? zh.report.goalRangeRecommended : goalRange.note}
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <ul className="grid gap-3 sm:grid-cols-3">
          {goalRange.options.map((option) => (
            <li key={option.id}>
              <div
                className={cn(
                  "rounded-xl border px-4 py-5 text-center transition-colors duration-200",
                  option.recommended
                    ? "border-primary bg-primary-muted shadow-sm"
                    : "border-border bg-surface-muted/60 text-muted-foreground",
                )}
              >
                <p
                  className={cn(
                    "text-title",
                    option.recommended ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {option.label}
                </p>
                {option.recommended ? (
                  <p className="mt-2 text-caption font-semibold text-primary">
                    {zh.report.recommended}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
