import { CalendarRange } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  MatchContextEvidenceView,
  MatchContextMetricsView,
  MatchContextRecordView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function metricRows(
  metrics: MatchContextMetricsView,
): ReadonlyArray<Readonly<{ label: string; value: string }>> {
  const rows: Array<{ label: string; value: string }> = [];
  const pushNumber = (label: string, value: number | null): void => {
    if (value !== null) {
      rows.push({ label, value: String(value) });
    }
  };
  const pushText = (label: string, value: string | null): void => {
    if (value !== null) {
      rows.push({ label, value });
    }
  };

  pushNumber(zh.report.contextRestDays, metrics.restDays);
  pushNumber(zh.report.contextDaysSinceLastMatch, metrics.daysSinceLastMatch);
  pushNumber(zh.report.contextDaysUntilNextMatch, metrics.daysUntilNextMatch);
  pushNumber(zh.report.contextMatchesLast7, metrics.matchesInLast7Days);
  pushNumber(zh.report.contextMatchesLast14, metrics.matchesInLast14Days);
  pushNumber(zh.report.contextFixtureCongestion, metrics.fixtureCongestion);
  pushText(
    zh.report.contextHomeAway,
    metrics.homeAwayContext === null
      ? null
      : metrics.homeAwayContext === "home"
        ? zh.report.contextSideHome
        : zh.report.contextSideAway,
  );
  pushText(
    zh.report.contextTravel,
    metrics.travelContext === null
      ? null
      : metrics.travelContext === "home"
        ? zh.report.contextSideHome
        : zh.report.contextSideAway,
  );
  pushText(zh.report.contextVenueCity, metrics.venueCity);
  pushText(zh.report.contextCompetitionKind, metrics.competitionKind);
  pushText(zh.report.contextCompetitionType, metrics.competitionTypeLabel);
  if (metrics.isKnockout !== null) {
    rows.push({
      label: zh.report.contextKnockout,
      value: metrics.isKnockout ? zh.report.contextYes : zh.report.contextNo,
    });
  }
  pushText(zh.report.contextRound, metrics.roundLabel);
  pushText(
    zh.report.contextLeg,
    metrics.leg === null
      ? null
      : metrics.leg === "first"
        ? zh.report.contextLegFirst
        : zh.report.contextLegSecond,
  );
  pushText(zh.report.contextAggregate, metrics.aggregateScore);

  return Object.freeze(rows);
}

function MatchContextRecordCard({
  record,
}: Readonly<{ record: MatchContextRecordView }>): ReactElement {
  const rows = metricRows(record.metrics);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarRange aria-hidden="true" className="size-4 text-primary" />
        <p className="text-title text-foreground">
          {record.teamSide === "home"
            ? zh.report.contextHome
            : zh.report.contextAway}
        </p>
        {record.competitionName !== null ? (
          <Tag variant="muted">{record.competitionName}</Tag>
        ) : null}
        {record.season !== null ? <Tag variant="muted">{record.season}</Tag> : null}
      </div>
      {rows.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={`${record.teamSide}-${row.label}`}
              className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1"
            >
              <dt className="text-caption text-muted-foreground">{row.label}</dt>
              <dd className="text-body font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body text-muted-foreground">
          {zh.report.contextNoMetrics}
        </p>
      )}
      <p className="text-caption text-muted-foreground">
        {zh.report.evidenceSource(
          record.providerId,
          record.source,
          record.provenanceMethod,
        )}
      </p>
    </div>
  );
}

export function MatchContextEvidenceSection({
  matchContext,
}: Readonly<{ matchContext: MatchContextEvidenceView }>): ReactElement {
  return (
    <section aria-labelledby="match-context-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="match-context-heading">{zh.report.matchContext}</CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.matchContextHint}
          </p>
        </CardHeader>
        <CardContent>
          {matchContext.available ? (
            <div className="space-y-4">
              {matchContext.records.map((record) => (
                <MatchContextRecordCard
                  key={`${record.teamSide}-${record.observedAt}`}
                  record={record}
                />
              ))}
              <p className="text-caption text-muted-foreground">
                {matchContext.note}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-5 py-6">
              <p className="text-title text-foreground">
                {zh.report.noMatchContext}
              </p>
              <p className="mt-1 text-body text-muted-foreground">
                {matchContext.note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
