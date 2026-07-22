import { Crosshair } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ExpectedGoalsContextView,
  ExpectedGoalsMetricsView,
  ExpectedGoalsRecordView,
  ExpectedGoalsWindowId,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function windowLabel(window: ExpectedGoalsWindowId): string {
  switch (window) {
    case "overall":
      return zh.report.xgWindowOverall;
    case "home":
      return zh.report.xgWindowHome;
    case "away":
      return zh.report.xgWindowAway;
    case "recent":
      return zh.report.xgWindowRecent;
    case "last5":
      return zh.report.xgWindowLast5;
    case "last10":
      return zh.report.xgWindowLast10;
    case "fixture":
      return zh.report.xgWindowFixture;
  }
}

function metricRows(
  metrics: ExpectedGoalsMetricsView,
): ReadonlyArray<Readonly<{ label: string; value: string }>> {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: number | null): void => {
    if (value !== null) {
      rows.push({ label, value: value.toFixed(2) });
    }
  };

  push(zh.report.xgMetricXg, metrics.xg);
  push(zh.report.xgMetricXga, metrics.xga);
  push(zh.report.xgMetricNonPenaltyXg, metrics.nonPenaltyXg);
  push(zh.report.xgMetricNonPenaltyXga, metrics.nonPenaltyXga);
  push(zh.report.xgMetricExpectedPoints, metrics.expectedPoints);
  push(zh.report.xgMetricExpectedGoalDifference, metrics.expectedGoalDifference);

  return Object.freeze(rows);
}

function ExpectedGoalsRecordCard({
  record,
}: Readonly<{ record: ExpectedGoalsRecordView }>): ReactElement {
  const rows = metricRows(record.metrics);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Crosshair aria-hidden="true" className="size-4 text-primary" />
        <p className="text-title text-foreground">
          {record.teamSide === "home" ? zh.report.xgHome : zh.report.xgAway}
        </p>
        <Tag variant="muted">{windowLabel(record.window)}</Tag>
        {record.competitionName !== null ? (
          <Tag variant="muted">{record.competitionName}</Tag>
        ) : null}
        {record.season !== null ? <Tag variant="muted">{record.season}</Tag> : null}
      </div>
      {rows.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={`${record.teamSide}-${record.window}-${row.label}`}
              className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1"
            >
              <dt className="text-caption text-muted-foreground">{row.label}</dt>
              <dd className="text-body font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body text-muted-foreground">{zh.report.xgNoMetrics}</p>
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

export function ExpectedGoalsContextSection({
  expectedGoals,
}: Readonly<{ expectedGoals: ExpectedGoalsContextView }>): ReactElement {
  return (
    <section aria-labelledby="expected-goals-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="expected-goals-heading">
            {zh.report.expectedGoals}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.expectedGoalsHint}
          </p>
        </CardHeader>
        <CardContent>
          {expectedGoals.available ? (
            <div className="space-y-4">
              {expectedGoals.records.map((record) => (
                <ExpectedGoalsRecordCard
                  key={`${record.teamSide}-${record.window}-${record.observedAt}`}
                  record={record}
                />
              ))}
              <p className="text-caption text-muted-foreground">
                {expectedGoals.note}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-5 py-6">
              <p className="text-title text-foreground">
                {zh.report.noExpectedGoals}
              </p>
              <p className="mt-1 text-body text-muted-foreground">
                {expectedGoals.note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
