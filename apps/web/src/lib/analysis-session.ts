import { zh } from "../copy/zh";
import type {
  AnalysisSessionProgress,
  AnalysisSessionStageDefinition,
  AnalysisSessionStageId,
  AnalysisSessionStageStatus,
  AnalysisSessionStageView,
} from "../types/analysis-session";

/**
 * Presentation mapping of the existing deterministic pipeline.
 * Durations are UX pacing only — analysis still uses the real API.
 */
export const ANALYSIS_SESSION_STAGES: readonly AnalysisSessionStageDefinition[] =
  Object.freeze([
    Object.freeze({
      id: "loading-match",
      label: zh.session.stages.loadingMatch.label,
      description: zh.session.stages.loadingMatch.description,
      durationMs: 650,
    }),
    Object.freeze({
      id: "collecting-evidence",
      label: zh.session.stages.collectingEvidence.label,
      description: zh.session.stages.collectingEvidence.description,
      durationMs: 850,
    }),
    Object.freeze({
      id: "extracting-features",
      label: zh.session.stages.extractingFeatures.label,
      description: zh.session.stages.extractingFeatures.description,
      durationMs: 750,
    }),
    Object.freeze({
      id: "evaluating-rules",
      label: zh.session.stages.evaluatingRules.label,
      description: zh.session.stages.evaluatingRules.description,
      durationMs: 800,
    }),
    Object.freeze({
      id: "building-analysis",
      label: zh.session.stages.buildingAnalysis.label,
      description: zh.session.stages.buildingAnalysis.description,
      durationMs: 700,
    }),
    Object.freeze({
      id: "generating-report",
      label: zh.session.stages.generatingReport.label,
      description: zh.session.stages.generatingReport.description,
      durationMs: 750,
    }),
    Object.freeze({
      id: "opening-workspace",
      label: zh.session.stages.openingWorkspace.label,
      description: zh.session.stages.openingWorkspace.description,
      durationMs: 550,
    }),
  ]);

export const ANALYSIS_SESSION_TOTAL_MS = ANALYSIS_SESSION_STAGES.reduce(
  (total, stage) => total + stage.durationMs,
  0,
);

export function formatEstimatedDuration(totalMs: number): string {
  const seconds = Math.max(1, Math.round(totalMs / 1000));
  return `约 ${String(seconds)} 秒`;
}

export function stageStatusAtIndex(
  stageIndex: number,
  activeIndex: number,
  isComplete: boolean,
): AnalysisSessionStageStatus {
  if (isComplete || stageIndex < activeIndex) {
    return "completed";
  }

  if (stageIndex === activeIndex) {
    return "running";
  }

  return "pending";
}

export function buildSessionStageViews(
  activeIndex: number,
  isComplete: boolean,
): readonly AnalysisSessionStageView[] {
  return Object.freeze(
    ANALYSIS_SESSION_STAGES.map((stage, index) =>
      Object.freeze({
        id: stage.id,
        label: stage.label,
        description: stage.description,
        status: stageStatusAtIndex(index, activeIndex, isComplete),
      }),
    ),
  );
}

export function buildSessionProgress(
  activeIndex: number,
  isComplete: boolean,
): AnalysisSessionProgress {
  const totalCount = ANALYSIS_SESSION_STAGES.length;
  const completedCount = isComplete ? totalCount : Math.min(activeIndex, totalCount);
  const percent = Math.round((completedCount / totalCount) * 100);
  const running =
    !isComplete && activeIndex < totalCount
      ? ANALYSIS_SESSION_STAGES[activeIndex]
      : undefined;

  return Object.freeze({
    completedCount,
    totalCount,
    percent: isComplete ? 100 : percent,
    estimatedDurationLabel: formatEstimatedDuration(ANALYSIS_SESSION_TOTAL_MS),
    runningLabel: running?.label ?? null,
  });
}

export function getStageDefinition(
  id: AnalysisSessionStageId,
): AnalysisSessionStageDefinition | undefined {
  return ANALYSIS_SESSION_STAGES.find((stage) => stage.id === id);
}
