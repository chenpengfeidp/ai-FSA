import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisLibraryPage } from "../src/components/analysis-library/analysis-library-page";
import { zh } from "../src/copy/zh";
import {
  clearAnalysisHistoryCacheForTests,
  writeAnalysisHistory,
} from "../src/lib/analysis-history";
import {
  filterLibraryReports,
  toLibraryReportCard,
} from "../src/lib/analysis-library";
import { DEFAULT_LIBRARY_FILTERS } from "../src/types/analysis-library";
import type { AnalysisHistoryEntry } from "../src/types/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => "/reports",
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const liverpool: AnalysisHistoryEntry = {
  matchId: "match-example-1",
  homeTeam: "Liverpool",
  awayTeam: "Chelsea",
  kickoffTime: "19:30",
  competition: "Premier League",
  analyzedAt: "2026-08-02T19:30:00.000Z",
  reportId: "report-1",
  evidenceCount: 2,
  featureCount: 3,
  ruleCount: 3,
  favorite: true,
};

const arsenal: AnalysisHistoryEntry = {
  matchId: "match-example-2",
  homeTeam: "Arsenal",
  awayTeam: "Manchester City",
  kickoffTime: "20:00",
  competition: "La Liga",
  analyzedAt: "2026-08-01T20:00:00.000Z",
  reportId: "report-2",
  evidenceCount: 1,
  featureCount: 1,
  ruleCount: 1,
};

describe("analysis library mapping", () => {
  it("maps history entries into library cards without inventing outcomes", () => {
    const card = toLibraryReportCard(liverpool);

    expect(card.winnerPrediction).toBe("Even signal");
    expect(card.confidence).toBe("Very High");
    expect(card.status).toBe("Completed");
    expect(card.favorite).toBe(true);
    expect(card.topEvidenceLabel).toBe("2 evidence items");
  });

  it("filters, sorts, and scopes sidebar sections from history", () => {
    const newest = filterLibraryReports(
      [liverpool, arsenal],
      DEFAULT_LIBRARY_FILTERS,
      "recent",
    );
    expect(newest.map((card) => card.matchId)).toEqual([
      "match-example-1",
      "match-example-2",
    ]);

    const favorites = filterLibraryReports(
      [liverpool, arsenal],
      DEFAULT_LIBRARY_FILTERS,
      "favorites",
    );
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.matchId).toBe("match-example-1");

    const byCompetition = filterLibraryReports(
      [liverpool, arsenal],
      { ...DEFAULT_LIBRARY_FILTERS, sort: "competition" },
      "recent",
    );
    expect(byCompetition.map((card) => card.competition)).toEqual([
      "La Liga",
      "Premier League",
    ]);

    const query = filterLibraryReports(
      [liverpool, arsenal],
      { ...DEFAULT_LIBRARY_FILTERS, query: "arsenal" },
      "recent",
    );
    expect(query).toHaveLength(1);
    expect(query[0]?.homeTeam).toBe("Arsenal");
  });
});

describe("AnalysisLibraryPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearAnalysisHistoryCacheForTests();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    clearAnalysisHistoryCacheForTests();
  });

  it("renders the library empty state and primary navigation", async () => {
    render(<AnalysisLibraryPage />);

    expect(
      screen.getByRole("heading", { name: "Analysis Library" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: zh.nav.reports })).toHaveAttribute(
      "href",
      "/reports",
    );
    expect(screen.getByRole("link", { name: zh.nav.dashboard })).toBeInTheDocument();
    expect(
      await screen.findByRole("link", { name: "Go to Match Center" }),
    ).toHaveAttribute("href", "/#todays-matches");
    expect(screen.getByText("Run your first analysis")).toBeInTheDocument();
  });

  it("lists history reports with open links and favorite bulk actions", async () => {
    writeAnalysisHistory([liverpool, arsenal]);
    const user = userEvent.setup();
    render(<AnalysisLibraryPage />);

    expect(await screen.findByText("Liverpool vs Chelsea")).toBeInTheDocument();
    expect(screen.getByText("Arsenal vs Manchester City")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open Report/ })).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Favorites" }));
    expect(screen.getByText("Liverpool vs Chelsea")).toBeInTheDocument();
    expect(screen.queryByText("Arsenal vs Manchester City")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Recent" }));
    await user.click(
      screen.getByRole("checkbox", {
        name: "Select Arsenal vs Manchester City",
      }),
    );
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Favorite selected" }));

    expect(
      screen.getByRole("button", {
        name: "Remove Arsenal vs Manchester City from favorites",
      }),
    ).toBeInTheDocument();
  });

  it("supports presentation-only delete from the library", async () => {
    writeAnalysisHistory([liverpool]);
    const user = userEvent.setup();
    render(<AnalysisLibraryPage />);

    expect(await screen.findByText("Liverpool vs Chelsea")).toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", {
        name: "Select Liverpool vs Chelsea",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Delete selected" }));

    expect(await screen.findByText("Run your first analysis")).toBeInTheDocument();
  });
});
