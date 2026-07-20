import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalysisSessionPage } from "../src/components/analysis-session/analysis-session-page";
import { zh } from "../src/copy/zh";
import {
  ANALYSIS_SESSION_STAGES,
  ANALYSIS_SESSION_TOTAL_MS,
  buildSessionProgress,
  buildSessionStageViews,
  formatEstimatedDuration,
} from "../src/lib/analysis-session";
import { analyzeMatch, getEvidenceByMatch } from "../src/services/api";
import type { AnalysisReportDto } from "../src/types/analysis";
import type { EvidenceDto } from "../src/types/evidence";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/matches/match-example-1/session",
  useRouter: () => ({
    replace,
    push: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("../src/services/api", () => ({
  analyzeMatch: vi.fn(),
  getEvidenceByMatch: vi.fn(),
  getUpcomingMatches: vi.fn(async () =>
    Object.freeze({
      matches: Object.freeze([]),
      meta: Object.freeze({ oddsProviderMode: "recorded" as const }),
    }),
  ),
}));

const report: AnalysisReportDto = {
  reportId: "report-match-example-1",
  matchId: "match-example-1",
  generatedAt: "2026-08-01T19:30:00.000Z",
  summary: ["Match information is complete."],
  features: [],
  rules: [],
  deterministic: {
    projectionModelVersion: "projection.v2.slice1",
    matchId: "match-example-1",
    lambdaHome: 1.5,
    lambdaAway: 1.2,
    pHome: 0.4,
    pDraw: 0.3,
    pAway: 0.3,
    topScorelines: [{ homeGoals: 1, awayGoals: 1, probability: 0.12 }],
    goalRange: { range01: 0.3, range23: 0.4, range4Plus: 0.3 },
    confidence: 0.6,
    recommendation: "cautious",
    limitations: [],
    calibrationArtifactId: "calibration:identity:v1",
    calibrationModelVersion: "calibration.v1.identity",
    calibrationStatus: "uncalibrated_baseline",
    calibrationChecksum: "calibration-identity-v1-checksum",
    calibrationQualified: false,
    status: "completed_nonempty",
    checksum: "checksum-session",
  },
  narrative: {
    epistemicKind: "inference",
    providerId: "local_deterministic_v1",
    promptManifestId: "prompt-manifest:session",
    promptManifestChecksum: "fnv1a-session",
    sections: [{ title: "Overview", body: "Session narrative." }],
    disclaimer: "Inference draft only.",
    generatedAt: "2026-07-17T10:00:00.000Z",
  },
};

const evidence: EvidenceDto = {
  id: "evidence-fixture-match-example-1",
  providerId: "internal:recorded",
  source: "fixture",
  sourceId: "fixture-match-example-1",
  type: "MATCH_INFO",
  matchId: "match-example-1",
  collectedAt: "2026-07-17T10:00:00.000Z",
  eventTime: "2026-08-01T19:30:00.000Z",
  timestamp: "2026-07-17T10:00:00.000Z",
  freshness: "fresh",
  confidence: "unknown",
  quality: "unverified",
  provenance: {
    collector: "@fas/evidence-normalizer",
    method: "fixture",
    providerId: "internal:recorded",
    category: "internal",
  },
  payload: {
    home: "Liverpool",
    away: "Chelsea",
    kickoff: "2026-08-01T19:30:00Z",
  },
};

function renderSession(matchId = "match-example-1"): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AnalysisSessionPage matchId={matchId} />
    </QueryClientProvider>,
  );
}

describe("analysis session mapping", () => {
  it("exposes the seven deterministic pipeline stages", () => {
    expect(ANALYSIS_SESSION_STAGES.map((stage) => stage.label)).toEqual([
      zh.session.stages.loadingMatch.label,
      zh.session.stages.collectingEvidence.label,
      zh.session.stages.extractingFeatures.label,
      zh.session.stages.evaluatingRules.label,
      zh.session.stages.buildingAnalysis.label,
      zh.session.stages.generatingReport.label,
      zh.session.stages.openingWorkspace.label,
    ]);
  });

  it("builds timeline statuses and progress for sequential pacing", () => {
    const mid = buildSessionStageViews(2, false);
    expect(mid[0]?.status).toBe("completed");
    expect(mid[1]?.status).toBe("completed");
    expect(mid[2]?.status).toBe("running");
    expect(mid[3]?.status).toBe("pending");

    const progress = buildSessionProgress(2, false);
    expect(progress.completedCount).toBe(2);
    expect(progress.runningLabel).toBe(zh.session.stages.extractingFeatures.label);
    expect(progress.estimatedDurationLabel).toBe(
      formatEstimatedDuration(ANALYSIS_SESSION_TOTAL_MS),
    );

    const done = buildSessionStageViews(7, true);
    expect(done.every((stage) => stage.status === "completed")).toBe(true);
    expect(buildSessionProgress(7, true).percent).toBe(100);
  });
});

describe("AnalysisSessionPage", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(analyzeMatch).mockReset();
    vi.mocked(getEvidenceByMatch).mockReset();
    vi.mocked(analyzeMatch).mockResolvedValue(report);
    vi.mocked(getEvidenceByMatch).mockResolvedValue([evidence]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders session summary and sequential stage states", async () => {
    renderSession();

    expect(
      screen.getByRole("heading", { name: "Liverpool vs Chelsea" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Premier League")).toBeInTheDocument();
    expect(screen.getByText("2026-08-01 19:30")).toBeInTheDocument();
    expect(screen.getByLabelText(zh.session.progressAria)).toBeInTheDocument();
    expect(
      screen.getByText(zh.session.stages.loadingMatch.label),
    ).toBeInTheDocument();
    expect(
      screen.getByText(zh.session.stages.openingWorkspace.label),
    ).toBeInTheDocument();

    expect(screen.getByText(zh.session.statusRunning)).toBeInTheDocument();
    expect(
      screen.getAllByText(zh.session.statusPending).length,
    ).toBeGreaterThanOrEqual(5);

    const firstStage = ANALYSIS_SESSION_STAGES[0];
    if (firstStage === undefined) {
      throw new Error("Expected at least one analysis session stage.");
    }

    await act(async () => {
      await vi.advanceTimersByTimeAsync(firstStage.durationMs);
    });

    expect(
      screen.getByText(zh.session.stages.collectingEvidence.label).closest("li"),
    ).toHaveTextContent(zh.session.statusRunning);
    expect(
      screen.getAllByText(zh.session.statusCompleted).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("navigates to the workspace when every stage completes", async () => {
    renderSession();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_SESSION_TOTAL_MS + 50);
    });

    expect(replace).toHaveBeenCalledWith("/matches/match-example-1");
  });

  it("shows an empty state for unknown matches", () => {
    renderSession("match-unknown");

    expect(screen.getByText(zh.session.matchNotFound)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
