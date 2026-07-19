import type { ReactElement } from "react";
import type { DashboardMetrics } from "../types/dashboard";
import { Card, CardContent } from "./ui/card";

interface MetricCardDefinition {
  readonly label: string;
  readonly value: number;
}

export function OverviewMetrics({
  metrics,
}: Readonly<{ metrics: DashboardMetrics }>): ReactElement {
  const cards: readonly MetricCardDefinition[] = [
    { label: "Imported Matches", value: metrics.importedMatches },
    { label: "Evidence", value: metrics.evidence },
    { label: "Features", value: metrics.features },
    { label: "Rules", value: metrics.rules },
    { label: "Reports", value: metrics.reports },
  ];

  return (
    <section
      aria-labelledby="overview-heading"
      className="animate-fade-in-delay-3 space-y-4"
    >
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-heading text-foreground" id="overview-heading">
          Overview
        </h2>
        <p className="text-caption text-muted-foreground">Session metrics</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        {cards.map((card) => (
          <Card className="hover:translate-y-0" key={card.label}>
            <CardContent className="flex flex-col gap-2 px-4 py-4 sm:px-5 sm:py-5">
              <p className="text-caption font-medium text-muted-foreground">
                {card.label}
              </p>
              <p className="text-[1.75rem] font-bold tracking-tight text-foreground tabular-nums sm:text-display">
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
