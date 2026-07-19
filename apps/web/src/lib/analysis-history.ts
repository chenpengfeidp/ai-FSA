import type { AnalysisHistoryEntry, DashboardMetrics } from "../types/dashboard";

export const ANALYSIS_HISTORY_STORAGE_KEY = "fas.analysis-history";
export const ANALYSIS_HISTORY_EVENT = "fas:analysis-history-changed";

const emptyMetrics: DashboardMetrics = Object.freeze({
  importedMatches: 0,
  evidence: 0,
  features: 0,
  rules: 0,
  reports: 0,
});

export const EMPTY_ANALYSIS_HISTORY: readonly AnalysisHistoryEntry[] = Object.freeze(
  [],
);

const emptyHistory = EMPTY_ANALYSIS_HISTORY;

let cachedSnapshot: readonly AnalysisHistoryEntry[] = emptyHistory;
let cachedRaw: string | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHistoryEntry(value: unknown): value is AnalysisHistoryEntry {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.matchId === "string" &&
    typeof value.homeTeam === "string" &&
    typeof value.awayTeam === "string" &&
    typeof value.kickoffTime === "string" &&
    typeof value.competition === "string" &&
    typeof value.analyzedAt === "string" &&
    typeof value.reportId === "string" &&
    typeof value.evidenceCount === "number" &&
    typeof value.featureCount === "number" &&
    typeof value.ruleCount === "number"
  );
}

function notifyHistoryChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(ANALYSIS_HISTORY_EVENT));
}

function parseHistory(raw: string | null): readonly AnalysisHistoryEntry[] {
  if (raw === null) {
    return emptyHistory;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return emptyHistory;
    }

    const entries = parsed.filter(isHistoryEntry);
    return entries.length === 0 ? emptyHistory : Object.freeze(entries);
  } catch {
    return emptyHistory;
  }
}

export function readAnalysisHistory(): readonly AnalysisHistoryEntry[] {
  if (typeof window === "undefined") {
    return emptyHistory;
  }

  const raw = window.localStorage.getItem(ANALYSIS_HISTORY_STORAGE_KEY);

  if (raw === cachedRaw) {
    return cachedSnapshot;
  }

  cachedRaw = raw;
  cachedSnapshot = parseHistory(raw);
  return cachedSnapshot;
}

export function writeAnalysisHistory(
  entries: readonly AnalysisHistoryEntry[],
): void {
  if (typeof window === "undefined") {
    return;
  }

  const next = Object.freeze([...entries]);
  const raw = JSON.stringify(next);

  window.localStorage.setItem(ANALYSIS_HISTORY_STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSnapshot = next;
  notifyHistoryChanged();
}

export function recordAnalysisHistoryEntry(
  entry: AnalysisHistoryEntry,
): readonly AnalysisHistoryEntry[] {
  const existing = readAnalysisHistory().filter(
    (item) => item.matchId !== entry.matchId,
  );
  const next = Object.freeze([entry, ...existing]);

  writeAnalysisHistory(next);
  return next;
}

export function calculateDashboardMetrics(
  entries: readonly AnalysisHistoryEntry[],
): DashboardMetrics {
  if (entries.length === 0) {
    return emptyMetrics;
  }

  const importedMatches = new Set(entries.map((entry) => entry.matchId)).size;

  return Object.freeze({
    importedMatches,
    evidence: entries.reduce((total, entry) => total + entry.evidenceCount, 0),
    features: entries.reduce((total, entry) => total + entry.featureCount, 0),
    rules: entries.reduce((total, entry) => total + entry.ruleCount, 0),
    reports: entries.length,
  });
}

export function sortRecentAnalysis(
  entries: readonly AnalysisHistoryEntry[],
): readonly AnalysisHistoryEntry[] {
  if (entries.length === 0) {
    return EMPTY_ANALYSIS_HISTORY;
  }

  return Object.freeze(
    [...entries].sort((left, right) =>
      right.analyzedAt.localeCompare(left.analyzedAt),
    ),
  );
}

export function subscribeAnalysisHistory(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent): void => {
    if (event.key === null || event.key === ANALYSIS_HISTORY_STORAGE_KEY) {
      cachedRaw = null;
      onStoreChange();
    }
  };

  const handleLocalChange = (): void => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(ANALYSIS_HISTORY_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ANALYSIS_HISTORY_EVENT, handleLocalChange);
  };
}

export function clearAnalysisHistoryCacheForTests(): void {
  cachedRaw = null;
  cachedSnapshot = emptyHistory;
}
