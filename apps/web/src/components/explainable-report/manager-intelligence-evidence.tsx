import { UserRound } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ManagerIntelligenceContextView,
  ManagerIntelligenceRecordView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function metricRows(
  record: ManagerIntelligenceRecordView,
): ReadonlyArray<Readonly<{ label: string; value: string }>> {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | number | null): void => {
    if (value !== null) {
      rows.push({ label, value: String(value) });
    }
  };

  push(zh.report.managerMetricId, record.managerId);
  push(zh.report.managerMetricNationality, record.nationality);
  push(zh.report.managerMetricAge, record.age);
  push(zh.report.managerMetricAppointmentDate, record.appointmentDate);
  push(zh.report.managerMetricTenureDays, record.tenureDays);
  push(
    zh.report.managerMetricInterimStatus,
    record.interimManagerStatus === null
      ? null
      : record.interimManagerStatus
        ? zh.report.managerInterimYes
        : zh.report.managerInterimNo,
  );
  push(
    zh.report.managerMetricPreviousClubs,
    record.previousClubs === null ? null : record.previousClubs.join(", "),
  );

  return Object.freeze(rows);
}

function ManagerIntelligenceRecordCard({
  record,
}: Readonly<{ record: ManagerIntelligenceRecordView }>): ReactElement {
  const rows = metricRows(record);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <UserRound aria-hidden="true" className="size-4 text-primary" />
        <p className="text-title text-foreground">{record.managerName}</p>
        <Tag variant="muted">
          {record.teamSide === "home"
            ? zh.report.managerHome
            : zh.report.managerAway}
          {" · "}
          {record.teamName}
        </Tag>
        <Tag variant={record.matchManagerConfirmed ? "primary" : "muted"}>
          {record.matchManagerConfirmed
            ? zh.report.managerMatchConfirmed
            : zh.report.managerMatchUnconfirmed}
        </Tag>
        {record.competitionName !== null ? (
          <Tag variant="muted">{record.competitionName}</Tag>
        ) : null}
        {record.season !== null ? <Tag variant="muted">{record.season}</Tag> : null}
      </div>
      {rows.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={`${record.teamSide}-${record.managerName}-${row.label}`}
              className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1"
            >
              <dt className="text-caption text-muted-foreground">{row.label}</dt>
              <dd className="text-body font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body text-muted-foreground">
          {zh.report.managerNoMetrics}
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

export function ManagerIntelligenceEvidenceSection({
  managerIntelligence,
}: Readonly<{ managerIntelligence: ManagerIntelligenceContextView }>): ReactElement {
  return (
    <section aria-labelledby="manager-intelligence-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="manager-intelligence-heading">
            {zh.report.managerIntelligence}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.managerIntelligenceHint}
          </p>
        </CardHeader>
        <CardContent>
          {managerIntelligence.available ? (
            <div className="space-y-4">
              {managerIntelligence.records.map((record) => (
                <ManagerIntelligenceRecordCard
                  key={`${record.teamSide}-${record.managerName}-${record.observedAt}`}
                  record={record}
                />
              ))}
              <p className="text-caption text-muted-foreground">
                {managerIntelligence.note}
              </p>
            </div>
          ) : (
            <p className="text-body text-muted-foreground">
              {zh.report.noManagerIntelligence}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
