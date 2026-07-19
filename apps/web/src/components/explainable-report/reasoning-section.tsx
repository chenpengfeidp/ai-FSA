import { ChevronDown, ClipboardList, Layers3, Scale, Sparkles } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { zh } from "../../copy/zh";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ReasoningStage {
  readonly description: string;
  readonly icon: ReactNode;
  readonly title: string;
}

const stages: readonly ReasoningStage[] = Object.freeze([
  Object.freeze({
    title: zh.report.reasoningStages.evidence.title,
    description: zh.report.reasoningStages.evidence.description,
    icon: <ClipboardList aria-hidden="true" className="size-4" />,
  }),
  Object.freeze({
    title: zh.report.reasoningStages.features.title,
    description: zh.report.reasoningStages.features.description,
    icon: <Layers3 aria-hidden="true" className="size-4" />,
  }),
  Object.freeze({
    title: zh.report.reasoningStages.rules.title,
    description: zh.report.reasoningStages.rules.description,
    icon: <Scale aria-hidden="true" className="size-4" />,
  }),
  Object.freeze({
    title: zh.report.reasoningStages.recommendation.title,
    description: zh.report.reasoningStages.recommendation.description,
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
          <CardTitle id="reasoning-heading">{zh.report.reasoning}</CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.reasoningFlow}
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
