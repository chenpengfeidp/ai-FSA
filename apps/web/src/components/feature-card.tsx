import type { ReactElement } from "react";
import { formatJsonValue, formatTimestamp } from "../lib/utils";
import type { FeatureDto } from "../types/analysis";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function FeatureCard({
  feature,
}: Readonly<{ feature: FeatureDto }>): ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{feature.name}</CardTitle>
        <CardDescription>
          Generated {formatTimestamp(feature.generatedAt)} UTC
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Value
          </p>
          <p className="mt-1 text-sm font-medium text-slate-950">
            {formatJsonValue(feature.value)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Source Evidence
          </p>
          <code className="mt-1 inline-block rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
            {feature.sourceEvidenceId}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
