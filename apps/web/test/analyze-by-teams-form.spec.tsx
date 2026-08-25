import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyzeByTeamsSection } from "../src/components/analyze-by-teams-section";
import { zh } from "../src/copy/zh";
import type { AnalysisReportDto } from "../src/types/analysis";

const push = vi.fn();

const mocks = vi.hoisted(() => ({
  analyzeByTeams: vi.fn(),
  getEvidenceByMatch: vi.fn(),
  analyzeMatch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push,
  }),
}));

function v2Report(): AnalysisReportDto {
  return {
    reportId: "report:football:100001:2026-08-21T11:00:00Z",
    matchId: "football:100001",
    generatedAt: "2026-08-21T11:00:00Z",
    summary: ["Match information is complete."],
    features: [],
    rules: [],
    deterministic: {
      projectionModelVersion: "projection.v2.m1b.manager",
      matchId: "football:100001",
      lambdaHome: 1.5,
      lambdaAway: 1.2,
      pHome: 0.42,
      pDraw: 0.28,
      pAway: 0.3,
      topScorelines: [],
      goalRange: { range01: 0.2, range23: 0.5, range4Plus: 0.3 },
      confidence: 0.7,
      confidenceComponents: { A: 0.5, C: 0.8, S: 0.4, X: 0 },
      recommendation: "lean_home",
      limitations: [],
      truncationMass: 0,
      scorelinesBasis: "match_script_merged_v2",
      oneXTwoBasis: "post_calibration_only",
      calibrationArtifactId: "calibration:population-demo:v1",
      calibrationModelVersion: "calibration.v1.frequency_ratio_1x2",
      calibrationStatus: "computed_candidate",
      calibrationChecksum: "abc",
      calibrationQualified: false,
      featureBundleChecksum: "fb",
      ruleEvaluationRefs: [],
      checksum: "chk",
      status: "completed_nonempty",
    },
    narrative: {
      reportId: "report:football:100001:2026-08-21T11:00:00Z",
      matchId: "football:100001",
      generatedAt: "2026-08-21T11:00:00Z",
      modelVersion: "narrative.mvp.v1",
      sections: [],
      checksum: "narr",
    },
    analysisProvenance: {
      projectionPolicyPin: "v2",
      fixtureResolution: {
        requestedHomeTeam: "FC Seoul",
        requestedAwayTeam: "Ulsan Hyundai FC",
        normalizedHomeTeam: "seoul",
        normalizedAwayTeam: "ulsan",
        resolvedHomeTeam: "FC Seoul",
        resolvedAwayTeam: "Ulsan Hyundai FC",
        resolvedMatchId: "football:100001",
        kickoff: "2026-08-21T11:00:00Z",
        competition: "K League 1",
        scheduleSource: "football-data",
        providerSource: "api-football",
        homeAwaySwapped: false,
      },
    },
    projectionFramework: {
      frameworkVersion: "projectionFramework.unifiedMatrix.v1",
      parameterArtifactId: "projectionParams:v3.1:matchScript",
      parameterVersionLabel: "projection.v3.replay",
      parameterArtifactChecksum: "pa-chk",
      footballStatePolicyVersion: "footballState.v1",
      matchScriptPolicyVersion: "matchScript.v1",
      footballStateChecksum: "fs-chk",
      matchScriptSetChecksum: "ms-chk",
      probabilityMatrixChecksum: "mx-chk",
      activeMatchScripts: [
        {
          scriptId: "script:baseline",
          label: "Baseline",
          weight: 1,
          activationReason: "default",
          activationReasons: ["default"],
          footballStateRefs: [],
          activatingRules: [],
          strengtheningFeatures: [],
          lambdaHome: 1.5,
          lambdaAway: 1.2,
          pHome: 0.42,
          pDraw: 0.28,
          pAway: 0.3,
          mostLikelyScoreline: { homeGoals: 1, awayGoals: 1, probability: 0.12 },
          secondScoreline: null,
          goalRange: { range01: 0.2, range23: 0.5, range4Plus: 0.3 },
          mergeContribution: {
            weight: 1,
            weightedPHome: 0.42,
            weightedPDraw: 0.28,
            weightedPAway: 0.3,
          },
          pBttsYes: 0.55,
          pBttsNo: 0.45,
          pOver25: 0.52,
          pUnder25: 0.48,
        },
      ],
      unifiedMatrix: {
        policyVersion: "unifiedMatrix.v1",
        mergeAlgorithm: "convex_cell_merge_v1",
        matrixChecksum: "mx-chk",
        scriptCount: 1,
        explanation: "Merged matrix",
        derived: {
          pHome: 0.42,
          pDraw: 0.28,
          pAway: 0.3,
          goalRange: { range01: 0.2, range23: 0.5, range4Plus: 0.3 },
          mostLikelyScoreline: { homeGoals: 1, awayGoals: 1, probability: 0.12 },
          secondScoreline: null,
          pBttsYes: 0.55,
          pBttsNo: 0.45,
          pOver25: 0.52,
          pUnder25: 0.48,
        },
        derivationNotes: [],
      },
    },
    footballState: {
      policyVersion: "footballState.v1",
      checksum: "fs-chk",
      dimensions: [],
      compositeTags: [],
      driverFeatureNames: [],
      limitations: [],
    },
  };
}

const { analyzeByTeams, getEvidenceByMatch, analyzeMatch } = mocks;

vi.mock("../src/services/api", async () => {
  const actual =
    await vi.importActual<typeof import("../src/services/api")>(
      "../src/services/api",
    );

  return {
    ...actual,
    analyzeByTeams: mocks.analyzeByTeams,
    getEvidenceByMatch: mocks.getEvidenceByMatch,
    analyzeMatch: mocks.analyzeMatch,
  };
});

function renderSection(): void {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AnalyzeByTeamsSection />
    </QueryClientProvider>,
  );
}

describe("AnalyzeByTeamsSection", () => {
  beforeEach(() => {
    mocks.analyzeByTeams.mockReset();
    mocks.getEvidenceByMatch.mockReset();
    mocks.analyzeMatch.mockReset();
    mocks.getEvidenceByMatch.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    push.mockReset();
  });

  it("renders the analyze-by-teams form", () => {
    renderSection();

    expect(
      screen.getByRole("heading", { name: zh.analyzeByTeams.heading }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(zh.analyzeByTeams.homeTeam)).toBeInTheDocument();
    expect(screen.getByLabelText(zh.analyzeByTeams.awayTeam)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zh.analyzeByTeams.submit }),
    ).toBeInTheDocument();
  });

  it("submits a successful analyze-by-teams request and navigates to workspace", async () => {
    const user = userEvent.setup();
    const report = v2Report();
    analyzeByTeams.mockResolvedValue({ ok: true, report });
    getEvidenceByMatch.mockResolvedValue([]);

    renderSection();

    await user.type(screen.getByLabelText(zh.analyzeByTeams.homeTeam), "FC Seoul");
    await user.type(
      screen.getByLabelText(zh.analyzeByTeams.awayTeam),
      "Ulsan Hyundai FC",
    );
    await user.click(screen.getByRole("button", { name: zh.analyzeByTeams.submit }));

    await waitFor(() => {
      expect(analyzeByTeams).toHaveBeenCalledWith({
        homeTeam: "FC Seoul",
        awayTeam: "Ulsan Hyundai FC",
      });
      expect(push).toHaveBeenCalledWith("/matches/football%3A100001");
    });
  });

  it("shows loading state while analysis is pending", async () => {
    const user = userEvent.setup();
    analyzeByTeams.mockReturnValue(new Promise(() => undefined));

    renderSection();

    await user.type(screen.getByLabelText(zh.analyzeByTeams.homeTeam), "FC Seoul");
    await user.type(screen.getByLabelText(zh.analyzeByTeams.awayTeam), "Ulsan");
    await user.click(screen.getByRole("button", { name: zh.analyzeByTeams.submit }));

    expect(
      await screen.findByText(zh.analyzeByTeams.loadingPipeline),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: zh.analyzeByTeams.analyzing }),
    ).toBeDisabled();
  });

  it("shows fixture not found without fabricating a prediction", async () => {
    const user = userEvent.setup();
    analyzeByTeams.mockResolvedValue({
      ok: false,
      failure: {
        kind: "fixture",
        code: "FIXTURE_NOT_FOUND",
        message: 'No fixture found for "Rosenborg" vs "Fredrikstad".',
      },
    });

    renderSection();

    await user.type(screen.getByLabelText(zh.analyzeByTeams.homeTeam), "Rosenborg");
    await user.type(
      screen.getByLabelText(zh.analyzeByTeams.awayTeam),
      "Fredrikstad",
    );
    await user.click(screen.getByRole("button", { name: zh.analyzeByTeams.submit }));

    expect(
      await screen.findByText('No fixture found for "Rosenborg" vs "Fredrikstad".'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows ambiguous fixtures and lets the user select deterministically", async () => {
    const user = userEvent.setup();
    analyzeByTeams.mockResolvedValue({
      ok: false,
      failure: {
        kind: "fixture",
        code: "FIXTURE_AMBIGUOUS",
        message: "Multiple fixtures match.",
        candidates: [
          {
            matchId: "football:100001",
            homeTeam: "FC Seoul",
            awayTeam: "Ulsan Hyundai FC",
            kickoff: "2026-08-21T11:00:00Z",
            competition: "K League 1",
            providerSource: "api-football",
            analyzable: true,
            homeAwaySwapped: false,
          },
          {
            matchId: "football:100002",
            homeTeam: "FC Seoul",
            awayTeam: "Ulsan Hyundai FC",
            kickoff: "2026-09-01T11:00:00Z",
            competition: "K League 1",
            providerSource: "api-football",
            analyzable: true,
            homeAwaySwapped: false,
          },
        ],
      },
    });
    analyzeMatch.mockResolvedValue(v2Report());
    getEvidenceByMatch.mockResolvedValue([]);

    renderSection();

    await user.type(screen.getByLabelText(zh.analyzeByTeams.homeTeam), "FC Seoul");
    await user.type(
      screen.getByLabelText(zh.analyzeByTeams.awayTeam),
      "Ulsan Hyundai FC",
    );
    await user.click(screen.getByRole("button", { name: zh.analyzeByTeams.submit }));

    const candidateButtons = await screen.findAllByRole("button", {
      name: /FC Seoul VS Ulsan Hyundai FC/,
    });
    const firstCandidate = candidateButtons[0];
    expect(firstCandidate).toBeDefined();
    await user.click(firstCandidate as HTMLElement);

    await waitFor(() => {
      expect(analyzeMatch).toHaveBeenCalledWith("football:100001");
      expect(push).toHaveBeenCalledWith("/matches/football%3A100001");
    });
  });

  it("shows policy unavailable errors honestly", async () => {
    const user = userEvent.setup();
    analyzeByTeams.mockResolvedValue({
      ok: false,
      failure: {
        kind: "policy",
        code: "PROJECTION_POLICY_UNAVAILABLE",
        message: 'Production analysis requires projectionPolicyPin "v2".',
      },
    });

    renderSection();

    await user.type(screen.getByLabelText(zh.analyzeByTeams.homeTeam), "A");
    await user.type(screen.getByLabelText(zh.analyzeByTeams.awayTeam), "B");
    await user.click(screen.getByRole("button", { name: zh.analyzeByTeams.submit }));

    expect(
      await screen.findByText(
        zh.analyzeByTeams.policyUnavailable(
          'Production analysis requires projectionPolicyPin "v2".',
        ),
      ),
    ).toBeInTheDocument();
  });
});

describe("ExplainableMatchReport V2 rendering", () => {
  it("renders unified matrix BTTS and O-U from derived predictions", async () => {
    const { ExplainableMatchReport } = await import(
      "../src/components/explainable-report/explainable-match-report"
    );

    render(
      <ExplainableMatchReport
        evidence={[]}
        match={{
          id: "football:100001",
          homeTeam: "FC Seoul",
          awayTeam: "Ulsan Hyundai FC",
          kickoff: "2026-08-21T11:00:00Z",
          kickoffTime: "2026-08-21 11:00",
          competition: "K League 1",
          status: "ANALYZED",
          providerSource: "api-football",
        }}
        report={v2Report()}
      />,
    );

    expect(screen.getAllByText(/双方进球/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Yes 55\.0%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/大小球/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Over 52\.0%/).length).toBeGreaterThan(0);
    expect(screen.getByText(zh.report.fixtureResolution)).toBeInTheDocument();
    expect(screen.getByText(/Projection V2 生产路径/)).toBeInTheDocument();
    expect(screen.getByText(/footballState\.v1/)).toBeInTheDocument();
  });
});
