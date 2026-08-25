import { formatKickoffTime } from "../services/api";
import type { AnalysisReportDto } from "../types/analysis";
import type { MatchSummary } from "../types/match-center";

/** Build a Match Center row from analyze-by-teams provenance when the board lacks the fixture. */
export function matchSummaryFromReport(
  report: AnalysisReportDto,
): MatchSummary | undefined {
  const resolution = report.analysisProvenance?.fixtureResolution;

  if (resolution === undefined) {
    return undefined;
  }

  return Object.freeze({
    id: report.matchId,
    homeTeam: resolution.resolvedHomeTeam,
    awayTeam: resolution.resolvedAwayTeam,
    kickoff: resolution.kickoff,
    kickoffTime: formatKickoffTime(resolution.kickoff),
    competition: resolution.competition,
    status: "ANALYZED" as const,
    analyzable: true,
    providerSource: resolution.providerSource,
  });
}
