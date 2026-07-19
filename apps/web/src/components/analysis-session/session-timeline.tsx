"use client";

import { Check, LoaderCircle } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { cn } from "../../lib/utils";
import type { AnalysisSessionStageView } from "../../types/analysis-session";

function StageMarker({
  status,
}: Readonly<{ status: AnalysisSessionStageView["status"] }>): ReactElement {
  if (status === "completed") {
    return (
      <span className="flex size-9 items-center justify-center rounded-full bg-success text-primary-foreground shadow-sm">
        <Check aria-hidden="true" className="size-4" />
      </span>
    );
  }

  if (status === "running") {
    return (
      <span className="session-stage-pulse flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
      </span>
    );
  }

  return (
    <span className="flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface text-subtle">
      <span aria-hidden="true" className="size-2 rounded-full bg-subtle" />
    </span>
  );
}

function statusLabel(status: AnalysisSessionStageView["status"]): string {
  if (status === "completed") {
    return zh.session.statusCompleted;
  }

  if (status === "running") {
    return zh.session.statusRunning;
  }

  return zh.session.statusPending;
}

export function SessionTimeline({
  stages,
}: Readonly<{
  stages: readonly AnalysisSessionStageView[];
}>): ReactElement {
  return (
    <ol aria-label={zh.session.stagesAria} className="relative space-y-0">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;

        return (
          <li
            className={cn(
              "relative flex gap-4 pb-6 last:pb-0",
              stage.status === "running" && "session-stage-enter",
              stage.status === "completed" && "session-stage-complete",
            )}
            key={stage.id}
          >
            <div className="relative flex flex-col items-center">
              <StageMarker status={stage.status} />
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-2 w-px flex-1 min-h-8",
                    stage.status === "completed" ? "bg-success/50" : "bg-border",
                  )}
                />
              ) : null}
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 rounded-xl border px-4 py-3 transition-[border-color,background-color,box-shadow,transform,opacity] duration-300",
                stage.status === "running" &&
                  "border-primary/35 bg-primary-muted shadow-sm",
                stage.status === "completed" && "border-border bg-surface shadow-sm",
                stage.status === "pending" &&
                  "border-transparent bg-surface-muted/50 opacity-70",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-body font-semibold text-foreground">
                  {stage.label}
                </p>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-caption font-semibold uppercase tracking-wide",
                    stage.status === "completed" &&
                      "bg-success-muted text-success-foreground",
                    stage.status === "running" &&
                      "bg-primary text-primary-foreground",
                    stage.status === "pending" && "bg-surface-muted text-subtle",
                  )}
                >
                  {statusLabel(stage.status)}
                </span>
              </div>
              <p className="mt-1.5 text-caption leading-5 text-muted-foreground">
                {stage.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
