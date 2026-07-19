import { ChevronDown, ClipboardList, Layers3, Scale, Sparkles } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ReasoningStage {
  readonly description: string;
  readonly icon: ReactNode;
  readonly title: string;
}

const stages: readonly ReasoningStage[] = Object.freeze([
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

export function ReasoningSection(): ReactElement {
  return (
    <section
      aria-labelledby="reasoning-heading"
      className="scroll-mt-28"
      id="reasoning"
    >
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="reasoning-heading">Reasoning</CardTitle>
          <p className="text-caption text-muted-foreground">
            Evidence → Features → Rules → Recommendation
          </p>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col">
            {stages.map((stage, index) => (
              <li className="flex flex-col" key={stage.title}>
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
        </CardContent>
      </Card>
    </section>
  );
}
