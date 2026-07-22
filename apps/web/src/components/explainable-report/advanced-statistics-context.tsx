import { BarChart3 } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  AdvancedStatisticsContextView,
  AdvancedTeamStatisticsView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function metricRows(
  stats: AdvancedTeamStatisticsView,
): ReadonlyArray<Readonly<{ label: string; value: string }>> {
  const rows: Array<{ label: string; value: string }> = [];
  const push = (label: string, value: number | null, suffix = ""): void => {
    if (value !== null) {
      rows.push({ label, value: `${String(value)}${suffix}` });
    }
  };

  push(zh.report.statShots, stats.shotsTotal);
  push(zh.report.statShotsOnTarget, stats.shotsOnTarget);
  push(zh.report.statShotsOffTarget, stats.shotsOffTarget);
  push(zh.report.statPossession, stats.possessionPct, "%");
  push(zh.report.statCorners, stats.corners);
  push(zh.report.statYellowCards, stats.yellowCards);
  push(zh.report.statRedCards, stats.redCards);
  push(zh.report.statAttacks, stats.attacks);
  push(zh.report.statDangerousAttacks, stats.dangerousAttacks);
  push(zh.report.statFouls, stats.fouls);
  push(zh.report.statSaves, stats.saves);
  push(zh.report.statPassingAccuracy, stats.passingAccuracyPct, "%");

  return Object.freeze(rows);
}

function TeamAdvancedStats({
  heading,
  stats,
}: Readonly<{
  heading: string;
  stats: AdvancedTeamStatisticsView;
}>): ReactElement {
  const rows = metricRows(stats);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <BarChart3 aria-hidden="true" className="size-4 text-primary" />
        <p className="text-title text-foreground">{heading}</p>
        <Tag variant="muted">
          {stats.scope === "fixture"
            ? zh.report.statScopeFixture
            : zh.report.statScopeSeason}
        </Tag>
      </div>
      {rows.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1"
            >
              <dt className="text-caption text-muted-foreground">{row.label}</dt>
              <dd className="text-body font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body text-muted-foreground">{zh.report.statNoMetrics}</p>
      )}
      <p className="text-caption text-muted-foreground">
        {zh.report.evidenceSource(stats.providerId, stats.source, "statistics")}
      </p>
    </div>
  );
}

export function AdvancedStatisticsContextSection({
  statistics,
}: Readonly<{ statistics: AdvancedStatisticsContextView }>): ReactElement {
  return (
    <section aria-labelledby="advanced-statistics-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="advanced-statistics-heading">
            {zh.report.advancedStatistics}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.advancedStatisticsHint}
          </p>
        </CardHeader>
        <CardContent>
          {statistics.available ? (
            <div className="space-y-4">
              {statistics.home !== null ? (
                <TeamAdvancedStats
                  heading={zh.report.statHome}
                  stats={statistics.home}
                />
              ) : null}
              {statistics.away !== null ? (
                <TeamAdvancedStats
                  heading={zh.report.statAway}
                  stats={statistics.away}
                />
              ) : null}
              <p className="text-caption text-muted-foreground">{statistics.note}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-5 py-6">
              <p className="text-title text-foreground">
                {zh.report.noAdvancedStatistics}
              </p>
              <p className="mt-1 text-body text-muted-foreground">
                {statistics.note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
