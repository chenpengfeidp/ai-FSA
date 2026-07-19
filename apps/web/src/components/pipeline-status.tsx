import { CheckCircle2 } from "lucide-react";
import type { ReactElement } from "react";
import type { PipelineStage } from "../types/dashboard";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

const pipelineStages: readonly PipelineStage[] = Object.freeze([
  Object.freeze({ name: "Provider", status: "healthy" }),
  Object.freeze({ name: "Normalizer", status: "healthy" }),
  Object.freeze({ name: "Evidence", status: "healthy" }),
  Object.freeze({ name: "Feature", status: "healthy" }),
  Object.freeze({ name: "Rule", status: "healthy" }),
  Object.freeze({ name: "Analysis", status: "healthy" }),
  Object.freeze({ name: "Report", status: "healthy" }),
]);

export function PipelineStatus(): ReactElement {
  return (
    <section aria-labelledby="pipeline-status-heading">
      <Card>
        <CardHeader>
          <CardTitle id="pipeline-status-heading">Pipeline Status</CardTitle>
          <CardDescription>
            Presentation-only health view of the deterministic analysis pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pipelineStages.map((stage) => (
              <li
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3"
                key={stage.name}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-4 text-emerald-600"
                  />
                  {stage.name}
                </span>
                <Badge variant="pass">{stage.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
