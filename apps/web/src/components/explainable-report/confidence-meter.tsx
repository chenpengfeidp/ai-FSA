import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { cn } from "../../lib/utils";
import type { ConfidenceMeterView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

const LEVELS = ["Low", "Medium", "High", "Very High"] as const;

function gaugeColor(level: ConfidenceMeterView["level"]): string {
  switch (level) {
    case "Very High":
      return "bg-success";
    case "High":
      return "bg-primary";
    case "Medium":
      return "bg-warning";
    case "Low":
      return "bg-error";
  }
}

function gaugeTrack(level: ConfidenceMeterView["level"]): string {
  switch (level) {
    case "Very High":
      return "from-success/20 via-success/10 to-transparent";
    case "High":
      return "from-primary/20 via-primary/10 to-transparent";
    case "Medium":
      return "from-warning/20 via-warning/10 to-transparent";
    case "Low":
      return "from-error/20 via-error/10 to-transparent";
  }
}

export function ConfidenceMeter({
  confidence,
}: Readonly<{ confidence: ConfidenceMeterView }>): ReactElement {
  const levelLabel = zh.report.confidenceLevel(confidence.level);

  return (
    <Card className="animate-fade-in-delay-2 hover:translate-y-0">
      <CardHeader className="border-b-0 pb-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>{zh.report.confidenceGauge}</CardTitle>
            <p className="mt-1 text-caption text-muted-foreground">
              {zh.report.confidenceGaugeHint(
                confidence.passCount,
                confidence.ruleCount,
              )}
            </p>
          </div>
          <p
            className={cn(
              "rounded-full px-3 py-1 text-body font-semibold",
              confidence.level === "Very High" &&
                "bg-success-muted text-success-foreground",
              confidence.level === "High" && "bg-primary-muted text-info-foreground",
              confidence.level === "Medium" &&
                "bg-warning-muted text-warning-foreground",
              confidence.level === "Low" && "bg-error-muted text-error-foreground",
            )}
          >
            {levelLabel}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div
          className={cn(
            "rounded-2xl border border-border bg-gradient-to-r p-5",
            gaugeTrack(confidence.level),
          )}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
              {zh.report.gauge}
            </p>
            <p className="text-title font-bold tabular-nums text-foreground">
              {confidence.percent}%
            </p>
          </div>
          <div className="relative h-5 overflow-hidden rounded-full bg-surface/80 shadow-inner">
            <div
              aria-label={zh.report.confidenceLabel(levelLabel)}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={confidence.percent}
              aria-valuetext={levelLabel}
              className={cn(
                "h-full rounded-full shadow-sm transition-[width] duration-500",
                gaugeColor(confidence.level),
              )}
              role="progressbar"
              style={{ width: `${confidence.percent}%` }}
            />
          </div>
        </div>

        <ol className="grid grid-cols-4 gap-2">
          {LEVELS.map((level) => {
            const active = level === confidence.level;

            return (
              <li
                className={cn(
                  "rounded-lg border px-2 py-2 text-center text-caption transition-colors duration-200",
                  active
                    ? "border-primary bg-primary-muted font-semibold text-primary"
                    : "border-transparent bg-surface-muted text-subtle",
                )}
                key={level}
              >
                {zh.report.confidenceLevel(level)}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
