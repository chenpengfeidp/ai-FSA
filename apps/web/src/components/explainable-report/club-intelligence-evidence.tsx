import { Building2 } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  ClubIntelligenceContextView,
  ClubIntelligenceMetricsView,
  ClubIntelligenceRecordView,
  ClubIntelligenceWindowId,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function windowLabel(window: ClubIntelligenceWindowId): string {
  switch (window) {
    case "season":
      return zh.report.clubWindowSeason;
    case "current":
      return zh.report.clubWindowCurrent;
  }
}

function formatRecord(
  wins: number | null,
  draws: number | null,
  losses: number | null,
): string | null {
  if (wins === null || draws === null || losses === null) {
    return null;
  }

  return `${String(wins)}/${String(draws)}/${String(losses)}`;
}

function metricRows(
  metrics: ClubIntelligenceMetricsView,
): ReadonlyArray<Readonly<{ label: string; value: string }>> {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: string | number | null): void => {
    if (value !== null) {
      rows.push({ label, value: String(value) });
    }
  };

  push(zh.report.clubMetricLeagueRank, metrics.leagueRank);
  push(zh.report.clubMetricLeaguePoints, metrics.leaguePoints);
  push(zh.report.clubMetricGoalDifference, metrics.goalDifference);
  push(zh.report.clubMetricGoalsScored, metrics.goalsScored);
  push(zh.report.clubMetricGoalsConceded, metrics.goalsConceded);
  push(zh.report.clubMetricPlayed, metrics.played);
  push(zh.report.clubMetricWins, metrics.wins);
  push(zh.report.clubMetricDraws, metrics.draws);
  push(zh.report.clubMetricLosses, metrics.losses);
  push(
    zh.report.clubMetricHomeRecord,
    formatRecord(metrics.homeWins, metrics.homeDraws, metrics.homeLosses),
  );
  push(
    zh.report.clubMetricAwayRecord,
    formatRecord(metrics.awayWins, metrics.awayDraws, metrics.awayLosses),
  );
  push(zh.report.clubMetricCurrentForm, metrics.currentForm);
  push(zh.report.clubMetricPromotionRelegation, metrics.promotionRelegationStatus);
  push(zh.report.clubMetricManagerName, metrics.managerName);
  push(zh.report.clubMetricManagerStartDate, metrics.managerStartDate);
  push(zh.report.clubMetricManagerTenureDays, metrics.managerTenureDays);

  return Object.freeze(rows);
}

function ClubIntelligenceRecordCard({
  record,
}: Readonly<{ record: ClubIntelligenceRecordView }>): ReactElement {
  const rows = metricRows(record.metrics);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 aria-hidden="true" className="size-4 text-primary" />
        <p className="text-title text-foreground">
          {record.teamSide === "home" ? zh.report.clubHome : zh.report.clubAway}
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
        <p className="text-body text-muted-foreground">{zh.report.clubNoMetrics}</p>
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

export function ClubIntelligenceEvidenceSection({
  clubIntelligence,
}: Readonly<{ clubIntelligence: ClubIntelligenceContextView }>): ReactElement {
  return (
    <section aria-labelledby="club-intelligence-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="club-intelligence-heading">
            {zh.report.clubIntelligence}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.clubIntelligenceHint}
          </p>
        </CardHeader>
        <CardContent>
          {clubIntelligence.available ? (
            <div className="space-y-4">
              {clubIntelligence.records.map((record) => (
                <ClubIntelligenceRecordCard
                  key={`${record.teamSide}-${record.window}-${record.observedAt}`}
                  record={record}
                />
              ))}
              <p className="text-caption text-muted-foreground">
                {clubIntelligence.note}
              </p>
            </div>
          ) : (
            <p className="text-body text-muted-foreground">
              {zh.report.noClubIntelligence}
            </p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
