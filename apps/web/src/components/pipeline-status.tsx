import { ChevronRight } from "lucide-react";
import { Fragment, type ReactElement } from "react";
import type { PipelineStage } from "../types/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { StatusBadge } from "./ui/status-badge";

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
      <Card className="hover:translate-y-0">
        <CardHeader className="border-b-0 pb-0">
          <CardTitle id="pipeline-status-heading">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <ol className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-y-3">
            {pipelineStages.map((stage, index) => (
              <Fragment key={stage.name}>
                <li className="min-w-0 md:min-w-[6.5rem] md:flex-1">
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/70 px-3 py-2.5 md:flex-col md:items-start md:gap-2">
                    <span className="text-body font-semibold text-foreground">
                      {stage.name}
                    </span>
                    <StatusBadge label="Healthy" status="SUCCESS" />
                  </div>
                </li>
                {index < pipelineStages.length - 1 ? (
                  <li
                    aria-hidden="true"
                    className="flex items-center justify-center text-subtle md:px-0.5"
                  >
                    <span className="md:hidden">↓</span>
                    <ChevronRight className="hidden size-4 md:block" />
                  </li>
                ) : null}
              </Fragment>
            ))}
          </ol>
        </CardContent>
      </Card>
    </section>
  );
}
