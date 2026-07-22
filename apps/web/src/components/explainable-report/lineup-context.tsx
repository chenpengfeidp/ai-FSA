import { Shirt } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  LineupsContextView,
  TeamLineupView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function TeamLineupCard({
  lineup,
  heading,
}: Readonly<{ lineup: TeamLineupView; heading: string }>): ReactElement {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Shirt aria-hidden="true" className="size-4 text-primary" />
        <h3 className="text-title text-foreground">{heading}</h3>
        <Tag variant="muted">{lineup.teamName}</Tag>
        {lineup.formation !== null ? (
          <Tag variant="muted">{lineup.formation}</Tag>
        ) : null}
        <Tag variant="muted">{zh.report.lineupConfirmed}</Tag>
      </div>
      <ul className="space-y-2">
        {lineup.startXI.map((player) => (
          <li
            key={`${lineup.teamSide}-${player.playerId}`}
            className="rounded-xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-title text-foreground">{player.name}</p>
              {player.number !== null ? (
                <Tag variant="muted">{zh.report.playerNumber(player.number)}</Tag>
              ) : null}
              {player.position !== null ? (
                <Tag variant="muted">{player.position}</Tag>
              ) : null}
            </div>
            <p className="mt-1 text-caption font-mono text-subtle">
              {zh.report.playerId(player.playerId)}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted-foreground">
        {zh.report.evidenceSource(lineup.providerId, lineup.source, "lineup")}
      </p>
    </div>
  );
}

export function LineupContextSection({
  lineups,
}: Readonly<{ lineups: LineupsContextView }>): ReactElement {
  return (
    <section aria-labelledby="lineup-context-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="lineup-context-heading">{zh.report.lineups}</CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.lineupsHint}
          </p>
        </CardHeader>
        <CardContent>
          {lineups.available ? (
            <div className="space-y-6">
              {lineups.home !== null ? (
                <TeamLineupCard
                  heading={zh.report.lineupsHome}
                  lineup={lineups.home}
                />
              ) : null}
              {lineups.away !== null ? (
                <TeamLineupCard
                  heading={zh.report.lineupsAway}
                  lineup={lineups.away}
                />
              ) : null}
              <p className="text-body text-muted-foreground">{lineups.note}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-title text-foreground">{zh.report.noLineups}</p>
              <p className="mt-2 text-body text-muted-foreground">{lineups.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
