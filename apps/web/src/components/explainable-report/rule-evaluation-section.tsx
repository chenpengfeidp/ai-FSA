import { Check, X } from "lucide-react";
import type { ReactElement } from "react";
import type { RuleEvaluationItemView } from "../../types/explainable-report";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function RuleEvaluationSection({
  rules,
}: Readonly<{ rules: readonly RuleEvaluationItemView[] }>): ReactElement {
  return (
    <section
      aria-labelledby="rule-evaluation-heading"
      className="scroll-mt-28"
      id="rules"
    >
      <Card className="animate-fade-in-delay-3 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="rule-evaluation-heading">Rule Evaluation</CardTitle>
          <p className="text-caption text-muted-foreground">
            PASS / FAIL outcomes with deterministic weights
          </p>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
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
                    className="flex flex-col gap-3 rounded-xl border border-border bg-surface-muted/40 px-4 py-4 transition-colors duration-200 hover:bg-surface-muted/70 sm:flex-row sm:items-center sm:justify-between"
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
                      <Badge variant={passed ? "PASS" : "FAIL"}>{rule.status}</Badge>
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
        </CardContent>
      </Card>
    </section>
  );
}
