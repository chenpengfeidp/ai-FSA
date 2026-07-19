import { CircleDot } from "lucide-react";
import type { ReactElement } from "react";
import { formatEvidenceTimestamp } from "../../lib/explainable-report";
import type { EvidenceTimelineItemView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";
import { Tag } from "../ui/tag";

function freshnessStatus(
  freshness: EvidenceTimelineItemView["freshness"],
): "INFO" | "SUCCESS" | "WARNING" {
  switch (freshness) {
    case "fresh":
      return "SUCCESS";
    case "stale":
      return "WARNING";
    default:
      return "INFO";
  }
}

export function EvidenceTimeline({
  items,
}: Readonly<{ items: readonly EvidenceTimelineItemView[] }>): ReactElement {
  return (
    <section aria-labelledby="evidence-timeline-heading">
      <Card className="animate-fade-in-delay-3 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="evidence-timeline-heading">Evidence Timeline</CardTitle>
          <p className="text-caption text-muted-foreground">
            Chronological evidence used by the deterministic pipeline
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-title text-foreground">No evidence available</p>
              <p className="mt-2 text-body text-muted-foreground">
                No evidence records were returned for this match.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0 border-l border-border pl-6">
              {items.map((item) => (
                <li className="relative pb-8 last:pb-0" key={item.id}>
                  <span className="absolute -left-[1.9rem] top-1 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-sm">
                    <CircleDot aria-hidden="true" className="size-3.5" />
                  </span>
                  <div className="rounded-xl border border-border bg-surface-muted/40 px-4 py-4 transition-colors duration-200 hover:bg-surface-muted/70">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-title text-foreground">{item.title}</p>
                      <Tag variant="muted">{item.type}</Tag>
                      <StatusBadge
                        label={item.freshness}
                        status={freshnessStatus(item.freshness)}
                      />
                      <StatusBadge label={item.quality} status="INFO" />
                    </div>
                    <p className="mt-2 text-caption text-muted-foreground">
                      {formatEvidenceTimestamp(item.timestamp)}
                    </p>
                    <p className="mt-2 text-body text-foreground">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
