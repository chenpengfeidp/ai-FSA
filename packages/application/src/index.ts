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
export { ImportLotteryManifestUseCase } from "./import-lottery-manifest-use-case.js";
export type { ImportLotteryManifestResult } from "./import-lottery-manifest-use-case.js";
export {
  buildLotteryMatchId,
  isLotteryMatchId,
  LOTTERY_MATCH_ID_PREFIX,
} from "./lottery/build-lottery-match-id.js";
export { CompositeLotteryFirstMatchProvider } from "./lottery/composite-lottery-first-match-provider.js";
export { LotteryFixtureRegistry } from "./lottery/lottery-fixture-registry.js";
export type { RegisteredLotteryFixture } from "./lottery/lottery-fixture-registry.js";
export { LotteryMatchProvider } from "./lottery/lottery-match-provider.js";
export {
  LOTTERY_FIXTURE_AUTHORITY,
  LOTTERY_FIXTURE_MANIFEST_SCHEMA,
  LOTTERY_SCHEDULE_SOURCE,
} from "./lottery/lottery-manifest-types.js";
export { validateLotteryFixtureManifest } from "./lottery/validate-lottery-manifest.js";
