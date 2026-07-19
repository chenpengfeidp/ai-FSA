"use client";

import type { ChangeEvent, ReactElement } from "react";
import type {
  LibraryFilters,
  LibraryReportStatus,
  LibrarySortOption,
} from "../../types/analysis-library";
import type { ConfidenceLevel } from "../../types/explainable-report";
import { Input } from "../ui/input";

const CONFIDENCE_OPTIONS: readonly (ConfidenceLevel | "all")[] = [
  "all",
  "Very High",
  "High",
  "Medium",
  "Low",
];

const STATUS_OPTIONS: readonly (LibraryReportStatus | "all")[] = [
  "all",
  "Completed",
  "In Progress",
  "Failed",
];

const SORT_OPTIONS: readonly {
  readonly value: LibrarySortOption;
  readonly label: string;
}[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest-confidence", label: "Highest Confidence" },
  { value: "competition", label: "Competition" },
];

function SelectField({
  id,
  label,
  onChange,
  options,
  value,
}: Readonly<{
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: readonly { readonly label: string; readonly value: string }[];
  value: string;
}>): ReactElement {
  return (
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1.5" htmlFor={id}>
      <span className="text-caption font-semibold text-muted-foreground">
        {label}
      </span>
      <select
        className="h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-muted"
        id={id}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => {
          onChange(event.target.value);
        }}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AnalysisLibraryFilters({
  competitions,
  filters,
  onChange,
}: Readonly<{
  competitions: readonly string[];
  filters: LibraryFilters;
  onChange: (next: LibraryFilters) => void;
}>): ReactElement {
  return (
    <div className="space-y-4">
      <label className="block" htmlFor="library-search">
        <span className="sr-only">Search reports</span>
        <Input
          id="library-search"
          onChange={(event) => {
            onChange({ ...filters, query: event.target.value });
          }}
          placeholder="Search teams, competitions, or predictions…"
          type="search"
          value={filters.query}
        />
      </label>

      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-surface p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end">
        <SelectField
          id="library-competition"
          label="Competition"
          onChange={(value) => {
            onChange({
              ...filters,
              competition: value === "all" ? "all" : value,
            });
          }}
          options={[
            { value: "all", label: "All competitions" },
            ...competitions.map((competition) => ({
              value: competition,
              label: competition,
            })),
          ]}
          value={filters.competition}
        />

        <label
          className="flex min-w-[9rem] flex-1 flex-col gap-1.5"
          htmlFor="library-date"
        >
          <span className="text-caption font-semibold text-muted-foreground">
            Date
          </span>
          <Input
            id="library-date"
            onChange={(event) => {
              onChange({
                ...filters,
                date: event.target.value === "" ? "all" : event.target.value,
              });
            }}
            type="date"
            value={filters.date === "all" ? "" : filters.date}
          />
        </label>

        <SelectField
          id="library-status"
          label="Status"
          onChange={(value) => {
            onChange({
              ...filters,
              status: value as LibraryReportStatus | "all",
            });
          }}
          options={STATUS_OPTIONS.map((status) => ({
            value: status,
            label: status === "all" ? "All statuses" : status,
          }))}
          value={filters.status}
        />

        <SelectField
          id="library-confidence"
          label="Confidence"
          onChange={(value) => {
            onChange({
              ...filters,
              confidence: value as ConfidenceLevel | "all",
            });
          }}
          options={CONFIDENCE_OPTIONS.map((confidence) => ({
            value: confidence,
            label: confidence === "all" ? "All levels" : confidence,
          }))}
          value={filters.confidence}
        />

        <label
          className="flex min-w-[9rem] flex-col gap-1.5"
          htmlFor="library-favorite"
        >
          <span className="text-caption font-semibold text-muted-foreground">
            Favorite
          </span>
          <select
            className="h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary-muted"
            id="library-favorite"
            onChange={(event) => {
              onChange({
                ...filters,
                favoriteOnly: event.target.value === "favorites",
              });
            }}
            value={filters.favoriteOnly ? "favorites" : "all"}
          >
            <option value="all">All reports</option>
            <option value="favorites">Favorites only</option>
          </select>
        </label>

        <SelectField
          id="library-sort"
          label="Sort"
          onChange={(value) => {
            onChange({
              ...filters,
              sort: value as LibrarySortOption,
            });
          }}
          options={SORT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={filters.sort}
        />
      </div>
    </div>
  );
}
