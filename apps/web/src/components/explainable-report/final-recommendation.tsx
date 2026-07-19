import { ArrowRight, ShieldCheck } from "lucide-react";
import type { ReactElement } from "react";
import type { FinalRecommendationView } from "../../types/explainable-report";
import { Card, CardContent } from "../ui/card";
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
        <div className="border-b border-border bg-gradient-to-r from-secondary via-secondary to-primary px-6 py-6 text-secondary-foreground sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.16em] text-secondary-foreground/80">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                Final Recommendation
              </p>
              <h2
                className="text-heading text-secondary-foreground"
                id="final-recommendation-heading"
              >
                {recommendation.recommendedWinner}
              </h2>
              <p className="max-w-xl text-body text-secondary-foreground/80">
                Premium summary composed from deterministic report outputs.
              </p>
            </div>
            <StatusBadge
              className="border-white/20 bg-white/15 text-white"
              label={recommendation.confidence}
              status="SUCCESS"
            />
          </div>
        </div>

        <CardContent className="space-y-6 px-6 py-6 sm:px-8">
          <dl className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                className="rounded-2xl border border-border bg-surface-muted/40 px-5 py-4 transition-colors duration-200 hover:bg-surface-muted/70"
                key={row.label}
              >
                <dt className="text-caption font-semibold uppercase tracking-wide text-subtle">
                  {row.label}
                </dt>
                <dd className="mt-2 flex items-center gap-2 text-title text-foreground">
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-primary"
                  />
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          {recommendation.summaryLines.length > 0 ? (
            <>
              <Divider className="my-0" />
              <ul className="space-y-2">
                {recommendation.summaryLines.map((line) => (
                  <li
                    className="rounded-lg bg-surface-muted/50 px-3 py-2 text-body text-muted-foreground"
                    key={line}
                  >
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
