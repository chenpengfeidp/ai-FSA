"use client";

import { ArrowUpRight, Heart, MoreHorizontal, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactElement } from "react";
import { useId, useState } from "react";
import { cn, formatTimestamp } from "../../lib/utils";
import type { LibraryReportCardView } from "../../types/analysis-library";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { StatusBadge } from "../ui/status-badge";
import { Tag } from "../ui/tag";

function statusBadge(
  status: LibraryReportCardView["status"],
): "SUCCESS" | "WARNING" | "ERROR" {
  switch (status) {
    case "Completed":
      return "SUCCESS";
    case "In Progress":
      return "WARNING";
    case "Failed":
      return "ERROR";
  }
}

export function ReportCard({
  onDelete,
  onToggleFavorite,
  onToggleSelect,
  report,
  selected,
}: Readonly<{
  onDelete: (matchId: string) => void;
  onToggleFavorite: (matchId: string) => void;
  onToggleSelect: (matchId: string) => void;
  report: LibraryReportCardView;
  selected: boolean;
}>): ReactElement {
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <li
      className="relative"
      onMouseEnter={() => {
        setPreviewOpen(true);
      }}
      onMouseLeave={() => {
        setPreviewOpen(false);
        setMenuOpen(false);
      }}
    >
      <Card
        className={cn(
          "h-full transition-[box-shadow,transform,border-color] duration-300",
          selected && "border-primary/40 shadow-md",
        )}
      >
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <label className="inline-flex items-center gap-2 pt-0.5">
              <input
                aria-label={`Select ${report.homeTeam} vs ${report.awayTeam}`}
                checked={selected}
                className="size-4 rounded border-border-strong text-primary focus:ring-primary"
                onChange={() => {
                  onToggleSelect(report.matchId);
                }}
                type="checkbox"
              />
              <Tag variant="muted">{report.competition}</Tag>
            </label>

            <div className="flex items-center gap-1.5">
              <StatusBadge
                label={report.status}
                status={statusBadge(report.status)}
              />
              <Button
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-label="Quick actions"
                className="size-8"
                onClick={() => {
                  setMenuOpen((open) => !open);
                }}
                size="icon"
                type="button"
                variant="ghost"
              >
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </Button>
            </div>
          </div>

          {menuOpen ? (
            <div
              className="absolute right-4 top-14 z-20 min-w-[11rem] rounded-lg border border-border bg-surface p-1 shadow-md"
              id={menuId}
              role="menu"
            >
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-caption font-medium text-foreground hover:bg-surface-muted"
                onClick={() => {
                  onToggleFavorite(report.matchId);
                  setMenuOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                <Heart
                  aria-hidden="true"
                  className={cn(
                    "size-3.5",
                    report.favorite && "fill-error text-error",
                  )}
                />
                {report.favorite ? "Unfavorite" : "Favorite"}
              </button>
              <button
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-caption font-medium text-error hover:bg-error-muted"
                onClick={() => {
                  onDelete(report.matchId);
                  setMenuOpen(false);
                }}
                role="menuitem"
                type="button"
              >
                Delete
              </button>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-title text-foreground">
              {`${report.homeTeam} vs ${report.awayTeam}`}
            </p>
            <p className="text-caption text-muted-foreground">
              Kickoff {report.kickoffTime} · Created{" "}
              {formatTimestamp(report.analyzedAt)} UTC
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface-muted px-3 py-2.5">
              <p className="text-caption font-semibold uppercase tracking-[0.12em] text-subtle">
                Winner prediction
              </p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-body font-semibold text-foreground">
                <Trophy aria-hidden="true" className="size-3.5 text-primary" />
                {report.winnerPrediction}
              </p>
            </div>
            <div className="rounded-lg bg-surface-muted px-3 py-2.5">
              <p className="text-caption font-semibold uppercase tracking-[0.12em] text-subtle">
                Confidence
              </p>
              <p className="mt-1 text-body font-semibold text-foreground">
                {report.confidence}
              </p>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button
              aria-label={
                report.favorite
                  ? `Remove ${report.homeTeam} vs ${report.awayTeam} from favorites`
                  : `Favorite ${report.homeTeam} vs ${report.awayTeam}`
              }
              onClick={() => {
                onToggleFavorite(report.matchId);
              }}
              size="sm"
              type="button"
              variant={report.favorite ? "secondary" : "outline"}
            >
              <Heart
                aria-hidden="true"
                className={cn("size-3.5", report.favorite && "fill-current")}
              />
              {report.favorite ? "Favorited" : "Favorite"}
            </Button>

            <Button asChild className="ml-auto" size="sm" variant="primary">
              <Link href={`/matches/${encodeURIComponent(report.matchId)}`}>
                Open Report
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div
        aria-hidden={!previewOpen}
        className={cn(
          "pointer-events-none absolute inset-x-3 bottom-3 z-10 translate-y-2 rounded-xl border border-border bg-surface/95 p-4 opacity-0 shadow-md backdrop-blur-sm transition-[opacity,transform] duration-200",
          previewOpen && "translate-y-0 opacity-100",
        )}
      >
        <p className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-primary">
          <Sparkles aria-hidden="true" className="size-3.5" />
          Quick preview
        </p>
        <dl className="mt-3 grid gap-2 text-caption">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Prediction</dt>
            <dd className="font-semibold text-foreground">
              {report.winnerPrediction}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Confidence</dt>
            <dd className="font-semibold text-foreground">{report.confidence}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Top evidence</dt>
            <dd className="font-semibold text-foreground">
              {report.topEvidenceLabel}
            </dd>
          </div>
          <div className="pt-1">
            <dt className="text-muted-foreground">Recommendation</dt>
            <dd className="mt-1 font-medium leading-5 text-foreground">
              {report.recommendation}
            </dd>
          </div>
        </dl>
      </div>
    </li>
  );
}
