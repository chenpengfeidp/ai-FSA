import { Shirt, UserRound } from "lucide-react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import type {
  PlayerContextItemView,
  PlayersContextView,
} from "../../types/explainable-report";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tag } from "../ui/tag";

function PlayerRow({
  player,
}: Readonly<{ player: PlayerContextItemView }>): ReactElement {
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-gradient-to-br from-surface to-surface-muted/40 px-4 py-3">
      {player.photo !== null ? (
        // Provider media URL (may be absent or cross-origin); not a Next static asset.
        // biome-ignore lint/performance/noImgElement: external Evidence photo URL
        <img
          alt=""
          className="size-10 shrink-0 rounded-full border border-border object-cover"
          height={40}
          src={player.photo}
          width={40}
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-primary">
          <UserRound aria-hidden="true" className="size-4" />
        </span>
      )}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-title text-foreground">{player.name}</p>
          {player.number !== null ? (
            <Tag variant="muted">{zh.report.playerNumber(player.number)}</Tag>
          ) : null}
          {player.position !== null ? (
            <Tag variant="muted">{player.position}</Tag>
          ) : null}
        </div>
        <p className="text-caption text-muted-foreground">{player.teamName}</p>
        {player.nationality !== null ? (
          <p className="text-caption text-subtle">{player.nationality}</p>
        ) : null}
        <p className="text-caption font-mono text-subtle">
          {zh.report.playerId(player.playerId)}
        </p>
        <p className="text-caption text-muted-foreground">
          {zh.report.evidenceSource(player.providerId, player.source, "player")}
        </p>
      </div>
    </li>
  );
}

function TeamPlayerList({
  heading,
  players,
}: Readonly<{
  heading: string;
  players: readonly PlayerContextItemView[];
}>): ReactElement | null {
  if (players.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Shirt aria-hidden="true" className="size-4 text-primary" />
        <h3 className="text-title text-foreground">{heading}</h3>
        <Tag variant="muted">{String(players.length)}</Tag>
      </div>
      <ul className="space-y-2">
        {players.map((player) => (
          <PlayerRow key={player.playerId} player={player} />
        ))}
      </ul>
    </div>
  );
}

export function PlayersContextSection({
  players,
}: Readonly<{ players: PlayersContextView }>): ReactElement {
  return (
    <section aria-labelledby="players-context-heading">
      <Card className="animate-fade-in-delay-1 hover:translate-y-0">
        <CardHeader>
          <CardTitle id="players-context-heading">{zh.report.players}</CardTitle>
          <p className="text-caption text-muted-foreground">
            {zh.report.playersHint}
          </p>
        </CardHeader>
        <CardContent>
          {players.available ? (
            <div className="space-y-6">
              <TeamPlayerList
                heading={zh.report.playersHome}
                players={players.home}
              />
              <TeamPlayerList
                heading={zh.report.playersAway}
                players={players.away}
              />
              <p className="text-body text-muted-foreground">{players.note}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-title text-foreground">{zh.report.noPlayers}</p>
              <p className="mt-2 text-body text-muted-foreground">{players.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
