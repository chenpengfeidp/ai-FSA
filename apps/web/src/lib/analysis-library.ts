import type {
  LibraryFilters,
  LibraryReportCardView,
  LibraryReportStatus,
  LibrarySidebarSection,
  LibrarySortOption,
} from "../types/analysis-library";
import type { AnalysisHistoryEntry } from "../types/dashboard";
import type { ConfidenceLevel } from "../types/explainable-report";
import { zh } from "../copy/zh";
import { confidencePercent } from "./explainable-report";

/**
 * Presentation mapping from stored history counts.
 * Does not invent match outcomes beyond completed-report completeness signals.
 */
export function confidenceFromHistoryEntry(
  entry: AnalysisHistoryEntry,
): ConfidenceLevel {
  if (entry.ruleCount >= 3 && entry.featureCount >= 3) {
    return "Very High";
  }

  if (entry.ruleCount >= 2) {
    return "High";
  }

  if (entry.ruleCount >= 1) {
    return "Medium";
  }

  return "Low";
}

export function statusFromHistoryEntry(
  _entry: AnalysisHistoryEntry,
): LibraryReportStatus {
  // Local history only records successful analyses today.
  return "Completed";
}

export function toLibraryReportCard(
  entry: AnalysisHistoryEntry,
): LibraryReportCardView {
  const confidence = confidenceFromHistoryEntry(entry);
  const status = statusFromHistoryEntry(entry);

  return Object.freeze({
    matchId: entry.matchId,
    reportId: entry.reportId,
    homeTeam: entry.homeTeam,
    awayTeam: entry.awayTeam,
    competition: entry.competition,
    kickoffTime: entry.kickoffTime,
    analyzedAt: entry.analyzedAt,
    favorite: entry.favorite ?? false,
    status,
    confidence,
    winnerPrediction: zh.library.evenSignal,
    recommendation: zh.library.openForFullRecommendation,
    evidenceCount: entry.evidenceCount,
    topEvidenceLabel:
      entry.evidenceCount > 0
        ? zh.library.evidenceItems(entry.evidenceCount)
        : zh.library.noEvidenceSummary,
  });
}

export function listCompetitions(
  entries: readonly AnalysisHistoryEntry[],
): readonly string[] {
  return Object.freeze(
    [...new Set(entries.map((entry) => entry.competition))].sort((left, right) =>
      left.localeCompare(right),
    ),
  );
}

function matchesSidebar(
  card: LibraryReportCardView,
  section: LibrarySidebarSection,
): boolean {
  switch (section) {
    case "favorites":
      return card.favorite;
    case "completed":
      return card.status === "Completed";
    case "in-progress":
      return card.status === "In Progress";
    case "failed":
      return card.status === "Failed";
    case "competitions":
    case "recent":
    case "settings":
      return true;
  }
}

function matchesDate(analyzedAt: string, dateFilter: string | "all"): boolean {
  if (dateFilter === "all") {
    return true;
  }

  return analyzedAt.slice(0, 10) === dateFilter;
}

function sortCards(
  cards: readonly LibraryReportCardView[],
  sort: LibrarySortOption,
): readonly LibraryReportCardView[] {
  const next = [...cards];

  switch (sort) {
    case "oldest":
      next.sort((left, right) => left.analyzedAt.localeCompare(right.analyzedAt));
      break;
    case "highest-confidence":
      next.sort(
        (left, right) =>
          confidencePercent(right.confidence) - confidencePercent(left.confidence),
      );
      break;
    case "competition":
      next.sort((left, right) => {
        const byCompetition = left.competition.localeCompare(right.competition);
        return byCompetition !== 0
          ? byCompetition
          : right.analyzedAt.localeCompare(left.analyzedAt);
      });
      break;
    default:
      next.sort((left, right) => right.analyzedAt.localeCompare(left.analyzedAt));
      break;
  }

  return Object.freeze(next);
}

export function filterLibraryReports(
  entries: readonly AnalysisHistoryEntry[],
  filters: LibraryFilters,
  section: LibrarySidebarSection,
): readonly LibraryReportCardView[] {
  if (section === "settings") {
    return Object.freeze([]);
  }

  const query = filters.query.trim().toLowerCase();
  const cards = entries
    .map(toLibraryReportCard)
    .filter((card) => matchesSidebar(card, section))
    .filter((card) => {
      if (
        filters.competition !== "all" &&
        card.competition !== filters.competition
      ) {
        return false;
      }

      if (filters.status !== "all" && card.status !== filters.status) {
        return false;
      }

      if (filters.confidence !== "all" && card.confidence !== filters.confidence) {
        return false;
      }

      if (filters.favoriteOnly && !card.favorite) {
        return false;
      }

      if (!matchesDate(card.analyzedAt, filters.date)) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      const haystack =
        `${card.homeTeam} ${card.awayTeam} ${card.competition} ${card.winnerPrediction}`.toLowerCase();
      return haystack.includes(query);
    });

  return sortCards(cards, filters.sort);
}

export function countBySidebarSection(
  entries: readonly AnalysisHistoryEntry[],
): Readonly<Record<LibrarySidebarSection, number>> {
  const cards = entries.map(toLibraryReportCard);

  return Object.freeze({
    recent: cards.length,
    favorites: cards.filter((card) => card.favorite).length,
    competitions: listCompetitions(entries).length,
    completed: cards.filter((card) => card.status === "Completed").length,
    "in-progress": cards.filter((card) => card.status === "In Progress").length,
    failed: cards.filter((card) => card.status === "Failed").length,
    settings: 0,
  });
}
