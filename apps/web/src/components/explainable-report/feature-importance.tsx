import type { ReactElement } from "react";
import type { FeatureImportanceItemView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function FeatureImportance({
  features,
}: Readonly<{
  features: readonly FeatureImportanceItemView[];
}>): ReactElement {
  return (
    <section aria-labelledby="feature-importance-heading">
      <Card className="animate-fade-in-delay-3 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="feature-importance-heading">Feature Importance</CardTitle>
          <p className="text-caption text-muted-foreground">
            Deterministic features weighted by linked rule scores
          </p>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-title text-foreground">No features available</p>
              <p className="mt-2 text-body text-muted-foreground">
                No features were extracted for this match.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {features.map((feature) => (
                <li className="space-y-2" key={feature.featureId}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-body font-semibold text-foreground">
                        {feature.label}
                      </p>
                      <p className="truncate text-caption text-muted-foreground">
                        {feature.valueLabel}
                      </p>
                    </div>
                    <p className="text-caption font-semibold tabular-nums text-muted-foreground">
                      {feature.percent}%
                    </p>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${feature.percent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
