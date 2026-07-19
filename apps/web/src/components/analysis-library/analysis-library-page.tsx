"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import { zh } from "../../copy/zh";
import { useAnalysisHistory } from "../../hooks/use-analysis-history";
import {
  removeAnalysisHistoryEntries,
  setAnalysisHistoryFavorites,
  toggleAnalysisHistoryFavorite,
} from "../../lib/analysis-history";
import {
  countBySidebarSection,
  filterLibraryReports,
  listCompetitions,
} from "../../lib/analysis-library";
import {
  DEFAULT_LIBRARY_FILTERS,
  type LibraryFilters,
  type LibrarySidebarSection,
} from "../../types/analysis-library";
import { AppTopNav } from "../app-top-nav";
import { AnalysisLibraryBulkBar } from "./analysis-library-bulk-bar";
import { AnalysisLibraryEmpty } from "./analysis-library-empty";
import { AnalysisLibraryFilters } from "./analysis-library-filters";
import { AnalysisLibrarySidebar } from "./analysis-library-sidebar";
import { ReportCard } from "./report-card";
import { ReportCardSkeletonGrid } from "./report-card-skeleton";

function sectionEmptyCopy(section: LibrarySidebarSection): {
  readonly description: string;
  readonly title: string;
} {
  switch (section) {
    case "favorites":
      return zh.library.empty.favorites;
    case "in-progress":
      return zh.library.empty.inProgress;
    case "failed":
      return zh.library.empty.failed;
    case "settings":
      return zh.library.empty.settings;
    case "competitions":
      return zh.library.empty.competitions;
    case "completed":
    case "recent":
      return zh.library.empty.default;
  }
}

export function AnalysisLibraryPage(): ReactElement {
  const history = useAnalysisHistory();
  const [hydrated, setHydrated] = useState(false);
  const [section, setSection] = useState<LibrarySidebarSection>("recent");
  const [filters, setFilters] = useState<LibraryFilters>(DEFAULT_LIBRARY_FILTERS);
  const [selected, setSelected] = useState<readonly string[]>([]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const competitions = useMemo(
    () => listCompetitions(history.entries),
    [history.entries],
  );
  const counts = useMemo(
    () => countBySidebarSection(history.entries),
    [history.entries],
  );
  const reports = useMemo(
    () => filterLibraryReports(history.entries, filters, section),
    [filters, history.entries, section],
  );

  function toggleSelect(matchId: string): void {
    setSelected((current) =>
      current.includes(matchId)
        ? current.filter((id) => id !== matchId)
        : [...current, matchId],
    );
  }

  function clearSelection(): void {
    setSelected([]);
  }

  const emptyCopy = sectionEmptyCopy(section);
  const showGlobalEmpty =
    hydrated && history.entries.length === 0 && section !== "settings";

  return (
    <div className="min-h-screen bg-background">
      <AppTopNav eyebrow={zh.library.eyebrow} />

      <div className="mx-auto grid max-w-[90rem] gap-0 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="border-b border-border/80 px-4 py-6 lg:sticky lg:top-[3.25rem] lg:max-h-[calc(100vh-3.25rem)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <AnalysisLibrarySidebar
            activeSection={section}
            counts={counts}
            onSelect={(next) => {
              setSection(next);
              clearSelection();
            }}
          />
        </div>

        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="animate-fade-in space-y-8">
            <header className="space-y-3">
              <p className="text-caption font-semibold uppercase tracking-[0.14em] text-primary">
                {zh.library.reportsEyebrow}
              </p>
              <h1 className="text-display font-semibold tracking-tight text-foreground">
                {zh.library.heading}
              </h1>
              <p className="max-w-2xl text-body text-muted-foreground">
                {zh.library.description}
              </p>
            </header>

            {section === "settings" ? (
              <AnalysisLibraryEmpty
                description={emptyCopy.description}
                title={emptyCopy.title}
              />
            ) : (
              <>
                <AnalysisLibraryFilters
                  competitions={competitions}
                  filters={filters}
                  onChange={setFilters}
                />

                {!hydrated ? (
                  <ReportCardSkeletonGrid />
                ) : showGlobalEmpty || reports.length === 0 ? (
                  <AnalysisLibraryEmpty
                    description={emptyCopy.description}
                    title={emptyCopy.title}
                  />
                ) : (
                  <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {reports.map((report) => (
                      <ReportCard
                        key={report.matchId}
                        onDelete={(matchId) => {
                          removeAnalysisHistoryEntries([matchId]);
                          setSelected((current) =>
                            current.filter((id) => id !== matchId),
                          );
                        }}
                        onToggleFavorite={(matchId) => {
                          toggleAnalysisHistoryFavorite(matchId);
                        }}
                        onToggleSelect={toggleSelect}
                        report={report}
                        selected={selected.includes(report.matchId)}
                      />
                    ))}
                  </ul>
                )}
              </>
            )}

            <AnalysisLibraryBulkBar
              onClear={clearSelection}
              onDelete={() => {
                removeAnalysisHistoryEntries(selected);
                clearSelection();
              }}
              onFavorite={() => {
                setAnalysisHistoryFavorites(selected, true);
              }}
              selectedCount={selected.length}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
