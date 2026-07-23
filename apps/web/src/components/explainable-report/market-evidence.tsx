import { TrendingUp } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  MarketEvidenceRecordView,
  MarketEvidenceSummaryView,
  MarketEvidenceView,
  MarketSelectionView,
  MarketTypeView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function marketTypeLabel(marketType: MarketTypeView): string {
  switch (marketType) {
    case "asian_handicap":
      return zh.report.marketTypeAsianHandicap;
    case "european_1x2":
      return zh.report.marketTypeEuropean1x2;
    case "over_under":
      return zh.report.marketTypeOverUnder;
    default: {
      const _exhaustive: never = marketType;
      return _exhaustive;
    }
  }
}

function selectionLabel(selection: MarketSelectionView): string {
  switch (selection) {
    case "asian_away":
      return zh.report.marketSelectionAsianAway;
    case "asian_home":
      return zh.report.marketSelectionAsianHome;
    case "away":
      return zh.report.marketSelectionAway;
    case "draw":
      return zh.report.marketSelectionDraw;
    case "home":
      return zh.report.marketSelectionHome;
    case "over":
      return zh.report.marketSelectionOver;
    case "under":
      return zh.report.marketSelectionUnder;
    default: {
      const _exhaustive: never = selection;
      return _exhaustive;
    }
  }
}

function formatOptional(value: number | null): string | null {
  return value === null ? null : String(value);
}

function summaryRows(
  summary: MarketEvidenceSummaryView,
): ReadonlyArray<Readonly<{ label: string; value: string }>> {
  const rows: Array<{ label: string; value: string }> = [];
  const pushNumber = (label: string, value: number | null): void => {
    const formatted = formatOptional(value);
    if (formatted !== null) {
      rows.push({ label, value: formatted });
    }
  };
  const pushText = (label: string, value: string | null): void => {
    if (value !== null) {
      rows.push({ label, value });
    }
  };

  pushText(zh.report.marketObservedAt, summary.observedAt);
  pushText(zh.report.marketSource, summary.marketSource);
  pushNumber(zh.report.marketHomeOdds, summary.homeOdds);
  pushNumber(zh.report.marketDrawOdds, summary.drawOdds);
  pushNumber(zh.report.marketAwayOdds, summary.awayOdds);
  pushNumber(zh.report.marketOpeningHome, summary.openingHomeOdds);
  pushNumber(zh.report.marketOpeningDraw, summary.openingDrawOdds);
  pushNumber(zh.report.marketOpeningAway, summary.openingAwayOdds);
  pushNumber(zh.report.marketClosingHome, summary.closingHomeOdds);
  pushNumber(zh.report.marketClosingDraw, summary.closingDrawOdds);
  pushNumber(zh.report.marketClosingAway, summary.closingAwayOdds);
  pushNumber(zh.report.marketOddsMovementHome, summary.oddsMovementHome);
  pushNumber(zh.report.marketOddsMovementDraw, summary.oddsMovementDraw);
  pushNumber(zh.report.marketOddsMovementAway, summary.oddsMovementAway);
  pushNumber(zh.report.marketAsianLine, summary.asianHandicapLine);
  pushNumber(zh.report.marketAsianHomeOdds, summary.asianHandicapHomeOdds);
  pushNumber(zh.report.marketAsianAwayOdds, summary.asianHandicapAwayOdds);
  pushNumber(zh.report.marketAsianOpeningLine, summary.asianHandicapOpeningLine);
  pushNumber(zh.report.marketHandicapMovement, summary.handicapMovement);
  pushNumber(zh.report.marketOverUnderLine, summary.overUnderLine);
  pushNumber(zh.report.marketOverOdds, summary.overOdds);
  pushNumber(zh.report.marketUnderOdds, summary.underOdds);
  pushNumber(zh.report.marketOverUnderOpeningLine, summary.overUnderOpeningLine);
  pushNumber(zh.report.marketOverUnderLineMovement, summary.overUnderLineMovement);
  pushNumber(zh.report.marketPublicHomePct, summary.publicBettingHomePct);
  pushNumber(zh.report.marketPublicDrawPct, summary.publicBettingDrawPct);
  pushNumber(zh.report.marketPublicAwayPct, summary.publicBettingAwayPct);
  pushNumber(zh.report.marketBettingVolume, summary.bettingVolume);
  if (summary.sharpMoneyIndicator !== null) {
    rows.push({
      label: zh.report.marketSharpMoney,
      value: String(summary.sharpMoneyIndicator),
    });
  }

  return Object.freeze(rows);
}

function MarketRecordCard({
  record,
}: Readonly<{ record: MarketEvidenceRecordView }>): ReactElement {
  const rows: Array<{ label: string; value: string }> = [];
  const pushNumber = (label: string, value: number | null): void => {
    if (value !== null) {
      rows.push({ label, value: String(value) });
    }
  };

  pushNumber(zh.report.marketLine, record.line);
  pushNumber(zh.report.marketOpeningValue, record.openingValue);
  pushNumber(zh.report.marketCurrentValue, record.currentValue);
  pushNumber(zh.report.marketClosingValue, record.closingValue);
  pushNumber(zh.report.marketMovement, record.movement);
  pushNumber(zh.report.marketLineMovement, record.lineMovement);

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrendingUp aria-hidden="true" className="size-4 text-primary" />
        <p className="text-title text-foreground">
          {marketTypeLabel(record.marketType)}
        </p>
        <Tag variant="muted">{selectionLabel(record.selection)}</Tag>
        {record.marketSource !== null ? (
          <Tag variant="muted">{record.marketSource}</Tag>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <dl className="grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={`${record.marketType}-${record.selection}-${row.label}`}
              className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1"
            >
              <dt className="text-caption text-muted-foreground">{row.label}</dt>
              <dd className="text-body font-medium text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-body text-muted-foreground">
          {zh.report.marketNoSelectionMetrics}
        </p>
      )}
      <p className="text-caption text-muted-foreground">{record.observedAt}</p>
    </div>
  );
}

export function MarketEvidenceSection({
  marketEvidence,
}: Readonly<{ marketEvidence: MarketEvidenceView }>): ReactElement {
  const summaryRowsList =
    marketEvidence.summary === null ? [] : summaryRows(marketEvidence.summary);

  return (
    <section aria-labelledby="market-evidence-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="market-evidence-heading">
            {zh.report.marketEvidence}
          </CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.marketEvidenceHint}
          </p>
        </CardHeader>
        <CardContent>
          {marketEvidence.available ? (
            <div className="space-y-4">
              {summaryRowsList.length > 0 ? (
                <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
                  <p className="text-title text-foreground">
                    {zh.report.marketSummary}
                  </p>
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {summaryRowsList.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1"
                      >
                        <dt className="text-caption text-muted-foreground">
                          {row.label}
                        </dt>
                        <dd className="text-body font-medium text-foreground">
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {marketEvidence.markets.map((record) => (
                <MarketRecordCard
                  key={`${record.marketType}-${record.selection}-${record.observedAt}`}
                  record={record}
                />
              ))}
              {marketEvidence.providerId !== null &&
              marketEvidence.source !== null &&
              marketEvidence.provenanceMethod !== null ? (
                <p className="text-caption text-muted-foreground">
                  {zh.report.evidenceSource(
                    marketEvidence.providerId,
                    marketEvidence.source,
                    marketEvidence.provenanceMethod,
                  )}
                </p>
              ) : null}
              <p className="text-caption text-muted-foreground">
                {marketEvidence.note}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-5 py-6">
              <p className="text-title text-foreground">
                {zh.report.noMarketEvidence}
              </p>
              <p className="mt-1 text-body text-muted-foreground">
                {marketEvidence.note}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
