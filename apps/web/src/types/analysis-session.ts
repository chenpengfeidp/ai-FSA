export type AnalysisSessionStageId =
  | "loading-match"
  | "collecting-evidence"
  | "extracting-features"
  | "evaluating-rules"
  | "building-analysis"
  | "generating-report"
  | "opening-workspace";

export type AnalysisSessionStageStatus = "pending" | "running" | "completed";

export interface AnalysisSessionStageDefinition {
  readonly description: string;
  readonly durationMs: number;
  readonly id: AnalysisSessionStageId;
  readonly label: string;
}

export interface AnalysisSessionStageView {
  readonly description: string;
  readonly id: AnalysisSessionStageId;
  readonly label: string;
  readonly status: AnalysisSessionStageStatus;
}

export interface AnalysisSessionProgress {
  readonly completedCount: number;
  readonly estimatedDurationLabel: string;
  readonly percent: number;
  readonly runningLabel: string | null;
  readonly totalCount: number;
}
