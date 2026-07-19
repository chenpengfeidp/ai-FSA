import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { cn } from "../../lib/utils";
import type { FeatureImportanceItemView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

export function FeatureImportance({
  features,
}: Readonly<{
  features: readonly FeatureImportanceItemView[];
}>): ReactElement {
  return (
    <section aria-labelledby="feature-importance-heading">
      <Card className="animate-fade-in-delay-3 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="feature-importance-heading">
            {zh.report.featureImportance}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.featureImportanceHint}
          </p>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-title text-foreground">{zh.report.noFeatures}</p>
              <p className="mt-2 text-body text-muted-foreground">
                {zh.report.noFeaturesDescription}
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {features.map((feature) => {
                const positive = feature.polarity === "positive";

                return (
                  <li className="space-y-2" key={feature.featureId}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="text-body font-semibold text-foreground">
                          {feature.label}
                        </p>
                        <Tag variant={positive ? "primary" : "muted"}>
                          {positive ? zh.report.positive : zh.report.negative}
                        </Tag>
                      </div>
                      <p
                        className={cn(
                          "text-caption font-semibold tabular-nums",
                          positive ? "text-success" : "text-error",
                        )}
                      >
                        {positive ? "+" : "−"}
                        {feature.percent}%
                      </p>
                    </div>
                    <p className="truncate text-caption text-muted-foreground">
                      {feature.valueLabel}
                    </p>
                    <div className="relative h-3 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className={cn(
                          "absolute inset-y-0 rounded-full transition-[width] duration-500",
                          positive ? "left-0 bg-success" : "right-0 bg-error",
                        )}
                        style={{ width: `${feature.percent}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
