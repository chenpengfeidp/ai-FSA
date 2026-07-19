import { CalendarClock, Sparkles, Trophy } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { cn } from "../../lib/utils";
import type {
  ConfidenceMeterView,
  ExplainableMatchHeader,
  FinalRecommendationView,
  WinnerPredictionView,
} from "../../types/explainable-report";
import { Card, CardContent } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";
import { Tag } from "../ui/tag";

function confidenceTone(level: ConfidenceMeterView["level"]): string {
  switch (level) {
    case "Very High":
      return "from-success to-success/70";
    case "High":
      return "from-primary to-primary/70";
    case "Medium":
      return "from-warning to-warning/70";
    case "Low":
      return "from-error to-error/70";
  }
}

export function PredictionHero({
  confidence,
  header,
  prediction,
  recommendation,
}: Readonly<{
  confidence: ConfidenceMeterView;
  header: ExplainableMatchHeader;
  prediction: WinnerPredictionView;
  recommendation: FinalRecommendationView;
}>): ReactElement {
  const winnerLabel = prediction.recommendedTeam ?? recommendation.recommendedWinner;
  const summary = recommendation.summaryLines[0] ?? zh.report.analysisComplete;

  return (
    <section aria-labelledby="prediction-hero-heading" className="animate-fade-in">
      <Card className="overflow-hidden hover:translate-y-0">
        <CardContent className="relative px-6 py-8 sm:px-10 sm:py-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--fas-primary-muted),transparent_52%),linear-gradient(135deg,var(--fas-surface)_0%,var(--fas-background)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 top-0 size-64 rounded-full bg-primary/10 blur-3xl"
          />

          <div className="relative space-y-8">
            <div className="flex flex-wrap items-center gap-2">
              <Tag variant="primary">
                <Trophy aria-hidden="true" className="size-3.5" />
                {header.competition}
              </Tag>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/80 px-2.5 py-1 text-caption font-semibold text-muted-foreground backdrop-blur">
                <CalendarClock aria-hidden="true" className="size-3.5" />
                {zh.workspace.kickoff(header.kickoffTime)}
              </span>
              <StatusBadge
                label={zh.report.confidenceLevel(confidence.level)}
                status="SUCCESS"
              />
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
              <div className="space-y-5">
                <p className="inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.16em] text-primary">
                  <Sparkles aria-hidden="true" className="size-3.5" />
                  {zh.report.prediction}
                </p>
                <div className="space-y-2">
                  <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                    {zh.report.winner}
                  </p>
                  <h2
                    className="text-[2.25rem] font-bold tracking-tight text-foreground sm:text-[3rem] sm:leading-[3.25rem]"
                    id="prediction-hero-heading"
                  >
                    {winnerLabel}
                  </h2>
                  <p className="text-title font-normal text-muted-foreground">
                    {header.homeTeam}
                    <span className="mx-2 text-subtle">{zh.workspace.vs}</span>
                    {header.awayTeam}
                  </p>
                </div>
                <p className="max-w-xl text-body text-muted-foreground">{summary}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border border-border/80 bg-surface/80 px-5 py-4 shadow-sm backdrop-blur">
                  <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                    {zh.report.confidence}
                  </p>
                  <p className="mt-2 text-heading text-foreground">
                    {zh.report.confidenceLevel(confidence.level)}
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r transition-[width] duration-500",
                        confidenceTone(confidence.level),
                      )}
                      style={{ width: `${confidence.percent}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-border/80 bg-surface/80 px-5 py-4 shadow-sm backdrop-blur">
                  <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                    {zh.report.recommendation}
                  </p>
                  <p className="mt-2 text-title text-foreground">
                    {recommendation.recommendedWinner}
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {zh.report.scoreLine(recommendation.recommendedScore)} ·{" "}
                    {zh.report.rangeLine(recommendation.recommendedGoalRange)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
