"use client";

import type { ReactElement } from "react";
import { zh } from "../copy/zh";
import type { OddsProviderModeLabel } from "../types/match-center";
import { Input } from "./ui/input";

export function MatchCenterFilters({
  startDate,
  horizonDays,
  includeDemos,
  oddsProviderMode,
  usedRecordedFallback,
  shownCount,
  totalCount,
  rangeEnd,
  onStartDateChange,
  onHorizonDaysChange,
  onIncludeDemosChange,
}: Readonly<{
  startDate: string;
  horizonDays: number;
  includeDemos: boolean;
  oddsProviderMode: OddsProviderModeLabel | undefined;
  usedRecordedFallback: boolean;
  shownCount: number;
  totalCount: number;
  rangeEnd: string;
  onStartDateChange: (value: string) => void;
  onHorizonDaysChange: (value: number) => void;
  onIncludeDemosChange: (value: boolean) => void;
}>): ReactElement {
  const modeLabel =
    oddsProviderMode === "live" && usedRecordedFallback
      ? zh.matchCenter.modeLiveFallback
      : oddsProviderMode === "live"
        ? zh.matchCenter.modeLive
        : oddsProviderMode === "fixture"
          ? zh.matchCenter.modeFixture
          : oddsProviderMode === "recorded"
            ? zh.matchCenter.modeRecorded
            : zh.matchCenter.modeUnknown;

  const modeHint =
    oddsProviderMode === "live" && usedRecordedFallback
      ? zh.matchCenter.modeHintLiveFallback
      : oddsProviderMode === "live"
        ? zh.matchCenter.modeHintLive
        : oddsProviderMode === "fixture"
          ? zh.matchCenter.modeHintFixture
          : oddsProviderMode === "recorded"
            ? zh.matchCenter.modeHintRecorded
            : zh.matchCenter.modeHintUnknown;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-primary-muted px-2.5 py-1 text-caption font-semibold text-info-foreground">
          {modeLabel}
        </span>
        <p className="text-caption text-muted-foreground">{modeHint}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-[10rem] flex-1 flex-col gap-1">
          <label
            className="text-caption font-semibold text-muted-foreground"
            htmlFor="match-center-start-date"
          >
            {zh.matchCenter.filterStart}
          </label>
          <Input
            id="match-center-start-date"
            onChange={(event) => {
              onStartDateChange(event.target.value);
            }}
            type="date"
            value={startDate}
          />
        </div>

        <div className="flex min-w-[8rem] flex-col gap-1">
          <label
            className="text-caption font-semibold text-muted-foreground"
            htmlFor="match-center-horizon"
          >
            {zh.matchCenter.filterHorizon}
          </label>
          <select
            className="flex h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary-muted"
            id="match-center-horizon"
            onChange={(event) => {
              onHorizonDaysChange(Number(event.target.value));
            }}
            value={horizonDays}
          >
            {[1, 3, 7, 14, 30].map((days) => (
              <option key={days} value={days}>
                {zh.matchCenter.filterHorizonOption(days)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pb-2">
          <input
            checked={includeDemos}
            className="size-4 accent-primary"
            id="match-center-include-demos"
            onChange={(event) => {
              onIncludeDemosChange(event.target.checked);
            }}
            type="checkbox"
          />
          <label
            className="text-caption font-semibold text-foreground"
            htmlFor="match-center-include-demos"
          >
            {zh.matchCenter.includeDemos}
          </label>
        </div>
      </div>

      <p className="text-caption text-muted-foreground">
        {zh.matchCenter.showingRange(startDate, rangeEnd, shownCount, totalCount)}
      </p>
    </div>
  );
}
