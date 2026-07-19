import { ClipboardList, FileText, Layers3, Scale, Trophy } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardMetrics } from "../types/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface MetricCardDefinition {
  readonly description: string;
  readonly icon: ReactElement;
  readonly label: string;
  readonly value: number;
}

export function OverviewMetrics({
  metrics,
}: Readonly<{ metrics: DashboardMetrics }>): ReactElement {
  const cards: readonly MetricCardDefinition[] = [
    {
      label: "Imported Matches",
      description: "Distinct matches analyzed in this session history.",
      value: metrics.importedMatches,
      icon: <Trophy aria-hidden="true" className="size-4" />,
    },
    {
      label: "Evidence",
      description: "Evidence records produced by successful imports.",
      value: metrics.evidence,
      icon: <ClipboardList aria-hidden="true" className="size-4" />,
    },
    {
      label: "Features",
      description: "Deterministic features extracted from evidence.",
      value: metrics.features,
      icon: <Layers3 aria-hidden="true" className="size-4" />,
    },
    {
      label: "Rules",
      description: "Rule evaluations generated across analyses.",
      value: metrics.rules,
      icon: <Scale aria-hidden="true" className="size-4" />,
    },
    {
      label: "Reports",
      description: "Completed analysis reports available for review.",
      value: metrics.reports,
      icon: <FileText aria-hidden="true" className="size-4" />,
    },
  ];

  return (
    <section aria-labelledby="overview-heading" className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-blue-600">Product overview</p>
        <h2
          className="mt-1 text-2xl font-bold tracking-tight text-slate-950"
          id="overview-heading"
        >
          Overview
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="border-b-0 pb-0">
              <div className="flex items-center justify-between gap-3">
                <CardDescription>{card.label}</CardDescription>
                <span className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  {card.icon}
                </span>
              </div>
              <CardTitle className="text-3xl tabular-nums">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-slate-500">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
