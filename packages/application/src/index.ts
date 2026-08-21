export { ImportMatchUseCase } from "./import-match-use-case.js";
export type {
  EvidenceImporter,
  EvidenceRecordImporter,
  ImportMatchError,
  ImportMatchErrorCode,
  ImportMatchResult,
  MatchProvider,
} from "./import-match-use-case.js";
export { ImportMatchesUseCase } from "./import-matches-use-case.js";
export type {
  FailedMatchImport,
  ImportMatchOperation,
  ImportMatchesFailureReason,
  ImportMatchesResult,
  ImportMatchesSummary,
  MatchImportResult,
  SuccessfulMatchImport,
  UnexpectedImportFailureReason,
} from "./import-matches-use-case.js";
export { DiscoverFixtureByTeamsUseCase } from "./discover-fixture-by-teams-use-case.js";
export type { UpcomingFixtureCatalog } from "./discover-fixture-by-teams-use-case.js";
export { discoverFixtureByTeams } from "./fixture/discover-fixture-by-teams.js";
export type {
  DiscoverFixtureByTeamsResult,
  FixtureDiscoveryCandidate,
  FixtureDiscoveryError,
  FixtureDiscoveryErrorCode,
  FixtureResolutionMetadata,
  FixtureScheduleRow,
} from "./fixture/discover-fixture-by-teams.js";
export { normalizeTeamName } from "./fixture/normalize-team-name.js";
