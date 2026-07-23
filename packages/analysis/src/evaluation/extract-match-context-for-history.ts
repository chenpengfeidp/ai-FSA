import type { AnalysisResult } from "../domain/analysis-result.js";

export interface MatchContextForHistory {
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly matchDate: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extracts match identity fields for Evaluation History from sealed Evidence/Features.
 * Does not invent teams or kickoff when absent.
 */
export function extractMatchContextForHistory(
  analysis: AnalysisResult,
): MatchContextForHistory | undefined {
  const matchInfo = analysis.evidenceSet.find(
    (evidence) => evidence.type === "MATCH_INFO",
  );

  if (matchInfo !== undefined && isRecord(matchInfo.payload)) {
    const home =
      typeof matchInfo.payload.home === "string"
        ? matchInfo.payload.home.trim()
        : "";
    const away =
      typeof matchInfo.payload.away === "string"
        ? matchInfo.payload.away.trim()
        : "";
    const kickoff =
      typeof matchInfo.payload.kickoff === "string"
        ? matchInfo.payload.kickoff.trim()
        : "";

    if (home.length > 0 && away.length > 0 && kickoff.length > 0) {
      return Object.freeze({
        homeTeam: home,
        awayTeam: away,
        matchDate: kickoff,
      });
    }
  }

  const homeFeature = analysis.features.find(
    (feature) => feature.name === "homeTeam",
  );
  const awayFeature = analysis.features.find(
    (feature) => feature.name === "awayTeam",
  );
  const kickoffFeature = analysis.features.find(
    (feature) => feature.name === "kickoff",
  );

  if (
    homeFeature !== undefined &&
    awayFeature !== undefined &&
    kickoffFeature !== undefined &&
    typeof homeFeature.value === "string" &&
    typeof awayFeature.value === "string" &&
    typeof kickoffFeature.value === "string"
  ) {
    return Object.freeze({
      homeTeam: homeFeature.value,
      awayTeam: awayFeature.value,
      matchDate: kickoffFeature.value,
    });
  }

  return undefined;
}
