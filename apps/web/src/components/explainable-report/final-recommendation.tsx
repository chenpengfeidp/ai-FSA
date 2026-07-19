import type { ReactElement } from "react";
import type { FinalRecommendationView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Divider } from "../ui/divider";
import { StatusBadge } from "../ui/status-badge";

export function FinalRecommendation({
  recommendation,
}: Readonly<{ recommendation: FinalRecommendationView }>): ReactElement {
  const rows = [
    { label: "Recommended Winner", value: recommendation.recommendedWinner },
    { label: "Recommended Score", value: recommendation.recommendedScore },
    {
      label: "Recommended Goal Range",
      value: recommendation.recommendedGoalRange,
    },
    { label: "Confidence", value: recommendation.confidence },
  ] as const;

  return (
    <section aria-labelledby="final-recommendation-heading">
      <Card className="animate-fade-in-delay-3 overflow-hidden hover:translate-y-0">
        <CardHeader className="border-b border-border bg-primary-muted/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle id="final-recommendation-heading">
              Final Recommendation
            </CardTitle>
            <StatusBadge label={recommendation.confidence} status="SUCCESS" />
          </div>
          <p className="text-caption text-muted-foreground">
            Human-readable summary from the deterministic report
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                className="rounded-xl border border-border bg-surface-muted/50 px-4 py-4"
                key={row.label}
              >
                <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
                  {row.label}
                </dt>
                <dd className="mt-2 text-title text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>

          {recommendation.summaryLines.length > 0 ? (
            <>
              <Divider className="my-0" />
              <ul className="space-y-2">
                {recommendation.summaryLines.map((line) => (
                  <li className="text-body text-muted-foreground" key={line}>
                    {line}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
