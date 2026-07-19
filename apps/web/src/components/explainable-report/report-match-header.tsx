import { CalendarClock, Trophy } from "lucide-react";
import type { ReactElement } from "react";
import type { ExplainableMatchHeader } from "../../types/explainable-report";
import { Card, CardContent } from "../ui/card";
import { Tag } from "../ui/tag";

export function ReportMatchHeader({
  header,
}: Readonly<{ header: ExplainableMatchHeader }>): ReactElement {
  return (
    <Card className="animate-fade-in overflow-hidden hover:translate-y-0">
      <CardContent className="relative px-6 py-6 sm:px-8 sm:py-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--fas-primary-muted),transparent_50%)]"
        />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Tag variant="primary">
              <Trophy aria-hidden="true" className="size-3.5" />
              {header.competition}
            </Tag>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-caption font-semibold text-muted-foreground">
              <CalendarClock aria-hidden="true" className="size-3.5" />
              Kickoff {header.kickoffTime}
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                Home
              </p>
              <p className="mt-1 truncate text-heading text-foreground">
                {header.homeTeam}
              </p>
            </div>
            <span className="rounded-full border border-border bg-surface-muted px-4 py-1.5 text-caption font-bold tracking-[0.2em] text-muted-foreground">
              VS
            </span>
            <div className="min-w-0 flex-1 text-center sm:text-right">
              <p className="text-caption font-semibold uppercase tracking-wide text-subtle">
                Away
              </p>
              <p className="mt-1 truncate text-heading text-foreground">
                {header.awayTeam}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
