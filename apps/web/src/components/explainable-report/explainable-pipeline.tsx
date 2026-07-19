import {
  Check,
  ChevronDown,
  ClipboardList,
  Layers3,
  Scale,
  Sparkles,
  X,
} from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import type { RuleEvaluationItemView } from "../../types/explainable-report";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface PipelineStage {
  readonly description: string;
  readonly icon: ReactNode;
  readonly title: string;
}

const stages: readonly PipelineStage[] = Object.freeze([
  Object.freeze({
    title: "Evidence",
    description: "Collected match evidence enters the pipeline.",
    icon: <ClipboardList aria-hidden="true" className="size-4" />,
  }),
  Object.freeze({
    title: "Features",
    description: "Deterministic features are extracted from evidence.",
    icon: <Layers3 aria-hidden="true" className="size-4" />,
  }),
  Object.freeze({
    title: "Rules",
    description: "Every deterministic rule is evaluated with explicit weight.",
    icon: <Scale aria-hidden="true" className="size-4" />,
  }),
  Object.freeze({
    title: "Recommendation",
    description: "A human-readable recommendation is composed for review.",
    icon: <Sparkles aria-hidden="true" className="size-4" />,
  }),
]);

export function ExplainablePipeline({
  rules,
}: Readonly<{ rules: readonly RuleEvaluationItemView[] }>): ReactElement {
  return (
    <section aria-labelledby="explainable-pipeline-heading">
      <Card className="animate-fade-in-delay-3 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="explainable-pipeline-heading">
            Explainable Pipeline
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            Evidence → Features → Rules → Recommendation
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="flex flex-col gap-0">
            {stages.map((stage, index) => (
              <li className="flex flex-col items-stretch" key={stage.title}>
                <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted/50 px-4 py-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-muted text-primary">
                    {stage.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-body font-semibold text-foreground">
                      {stage.title}
                    </p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {stage.description}
                    </p>
                  </div>
                </div>
                {index < stages.length - 1 ? (
                  <div
                    aria-hidden="true"
                    className="flex justify-center py-2 text-subtle"
                  >
                    <ChevronDown className="size-4" />
                  </div>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="space-y-3">
            <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
              Rule Evaluation
            </p>
            {rules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
                <p className="text-title text-foreground">No rules available</p>
                <p className="mt-2 text-body text-muted-foreground">
                  No rules were evaluated for this match.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {rules.map((rule) => {
                  const passed = rule.status === "PASS";

                  return (
                    <li
                      className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-4 transition-colors duration-200 hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:justify-between"
                      key={rule.ruleId}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={
                            passed
                              ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-success-muted text-success"
                              : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-error-muted text-error"
                          }
                        >
                          {passed ? (
                            <Check className="size-4" />
                          ) : (
                            <X className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="text-body font-semibold text-foreground">
                            {rule.title}
                          </p>
                          <p className="mt-1 text-caption text-muted-foreground">
                            {rule.explanation}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge variant={passed ? "PASS" : "FAIL"}>
                          {rule.status}
                        </Badge>
                        <Badge variant="default">
                          Weight {rule.weight >= 0 ? "+" : ""}
                          {rule.weight}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
