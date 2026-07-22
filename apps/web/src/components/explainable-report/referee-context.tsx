import { Scale } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type { RefereeContextView } from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

export function RefereeContextSection({
  referee,
}: Readonly<{ referee: RefereeContextView }>): ReactElement {
  return (
    <section aria-labelledby="referee-context-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="referee-context-heading">{zh.report.referee}</CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.refereeHint}
          </p>
        </CardHeader>
        <CardContent>
          {referee.available ? (
            <div className="space-y-3 rounded-2xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <Scale aria-hidden="true" className="size-4 text-primary" />
                <p className="text-title text-foreground">{referee.name}</p>
                {referee.country !== null ? (
                  <Tag variant="muted">{referee.country}</Tag>
                ) : null}
                {referee.league !== null ? (
                  <Tag variant="muted">{referee.league}</Tag>
                ) : null}
              </div>
              {referee.appearances !== null ||
              referee.yellowCardsPerMatch !== null ||
              referee.redCardsPerMatch !== null ? (
                <p className="text-body text-muted-foreground">
                  {zh.report.refereeStats(
                    referee.appearances,
                    referee.yellowCardsPerMatch,
                    referee.redCardsPerMatch,
                  )}
                </p>
              ) : null}
              {referee.providerId !== null && referee.source !== null ? (
                <p className="text-caption text-muted-foreground">
                  {zh.report.evidenceSource(
                    referee.providerId,
                    referee.source,
                    "referee",
                  )}
                </p>
              ) : null}
              <p className="text-body text-muted-foreground">{referee.note}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-title text-foreground">{zh.report.noReferee}</p>
              <p className="mt-2 text-body text-muted-foreground">{referee.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
