import type { ConfidenceLevel } from "./explainable-report";

export type LibraryReportStatus = "Completed" | "Failed" | "In Progress";

export type LibrarySidebarSection =
  | "recent"
  | "favorites"
  | "competitions"
  | "completed"
  | "in-progress"
  | "failed"
  | "settings";

export type LibrarySortOption =
  | "newest"
  | "oldest"
  | "highest-confidence"
  | "competition";

export interface LibraryFilters {
  readonly competition: string | "all";
  readonly confidence: ConfidenceLevel | "all";
  readonly date: string | "all";
  readonly favoriteOnly: boolean;
  readonly query: string;
  readonly sort: LibrarySortOption;
  readonly status: LibraryReportStatus | "all";
}

export interface LibraryReportCardView {
  readonly analyzedAt: string;
  readonly awayTeam: string;
  readonly competition: string;
  readonly confidence: ConfidenceLevel;
  readonly evidenceCount: number;
  readonly favorite: boolean;
  readonly homeTeam: string;
  readonly kickoffTime: string;
  readonly matchId: string;
  readonly recommendation: string;
  readonly reportId: string;
  readonly status: LibraryReportStatus;
  readonly topEvidenceLabel: string;
  readonly winnerPrediction: string;
}

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = Object.freeze({
  competition: "all",
  confidence: "all",
  date: "all",
  favoriteOnly: false,
  query: "",
  sort: "newest",
  status: "all",
});
