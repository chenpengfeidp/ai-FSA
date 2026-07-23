import {
  Activity,
  Ban,
  CloudSun,
  MapPin,
  Newspaper,
  Scale,
  Shirt,
  Trophy,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import type { ReactElement } from "react";
import { formatEvidenceTimestamp } from "../../lib/explainable-report";
import { zh } from "../../copy/zh";
import type { EvidenceTimelineItemView } from "../../types/explainable-report";
import type { EvidenceType } from "../../types/evidence";
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

function evidenceIcon(type: EvidenceType): ReactElement {
  const className = "size-4";

  switch (type) {
    case "INJURY":
      return <Activity aria-hidden="true" className={className} />;
    case "SUSPENSION":
      return <Ban aria-hidden="true" className={className} />;
    case "TEAM_FORM":
      return <Workflow aria-hidden="true" className={className} />;
    case "HEAD_TO_HEAD":
      return <Users aria-hidden="true" className={className} />;
    case "WEATHER":
      return <CloudSun aria-hidden="true" className={className} />;
    case "LINEUP":
      return <Shirt aria-hidden="true" className={className} />;
    case "NEWS":
      return <Newspaper aria-hidden="true" className={className} />;
    case "VENUE":
      return <MapPin aria-hidden="true" className={className} />;
    case "PLAYER":
      return <UserRound aria-hidden="true" className={className} />;
    case "CLUB_INTELLIGENCE":
    case "EXPECTED_GOALS":
    case "MATCH_CONTEXT":
    case "MATCH_RESULT":
    case "ODDS":
    case "RANKING":
    case "STATISTICS":
      return <Scale aria-hidden="true" className={className} />;
    default:
      return <Trophy aria-hidden="true" className={className} />;
  }
}

export function EvidenceTimeline({
  items,
}: Readonly<{ items: readonly EvidenceTimelineItemView[] }>): ReactElement {
  return (
    <section aria-labelledby="evidence-timeline-heading">
      <Card className="animate-fade-in-delay-2 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="evidence-timeline-heading">{zh.report.evidence}</CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.evidenceHint}
          </p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-title text-foreground">{zh.report.noEvidence}</p>
              <p className="mt-2 text-body text-muted-foreground">
                {zh.report.noEvidenceDescription}
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0 border-l-2 border-primary/20 pl-8">
              {items.map((item, index) => (
                <li className="relative pb-8 last:pb-0" key={item.id}>
                  <span className="absolute -left-[2.35rem] top-0 flex size-9 items-center justify-center rounded-full border border-primary/20 bg-primary-muted text-primary shadow-sm">
                    {evidenceIcon(item.type)}
                  </span>
                  <article className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-md">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-title text-foreground">{item.title}</p>
                      <Tag variant="muted">{item.type}</Tag>
                      <StatusBadge
                        label={item.freshness}
                        status={freshnessStatus(item.freshness)}
                      />
                      <StatusBadge label={item.quality} status="INFO" />
                      <StatusBadge label={item.confidence} status="INFO" />
                    </div>
                    <p className="mt-2 text-caption font-medium text-subtle">
                      {zh.report.step(
                        index + 1,
                        formatEvidenceTimestamp(item.timestamp),
                      )}
                    </p>
                    <p className="mt-1 text-caption text-muted-foreground">
                      {zh.report.evidenceSource(
                        item.providerId,
                        item.source,
                        item.provenanceMethod,
                      )}
                    </p>
                    <p className="mt-3 text-body leading-6 text-foreground">
                      {item.detail}
                    </p>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
