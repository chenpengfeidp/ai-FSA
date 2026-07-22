export { DEFAULT_FOOTBALL_LEAGUE_IDS } from "./catalog/default-league-ids.js";
export {
  AsyncFootballMatchProvider,
  PrimedFootballMatchProvider,
} from "./composite/async-football-match-provider.js";
export {
  CompositeFootballFirstLookup,
  FootballMatchProvider,
} from "./composite/football-match-provider.js";
export type {
  FootballAvailabilityAbsence,
  FootballAvailabilityKind,
  FootballBoardRow,
  FootballFixture,
  FootballFormSplit,
  FootballH2H,
  FootballH2HMeeting,
  FootballLineupPlayer,
  FootballMatchBundle,
  FootballPlayer,
  FootballProviderMethod,
  FootballReferee,
  FootballResultCode,
  FootballStandingRow,
  FootballStandings,
  FootballTeamForm,
  FootballTeamLineup,
  FootballTeamStats,
  FootballVenue,
} from "./domain/football-models.js";
export type {
  FootballFixturesSource,
  FootballMatchCatalog,
  FootballMatchLookup,
  FootballStandingsSource,
} from "./domain/ports.js";
export {
  FootballProviderError,
  isFootballProviderError,
} from "./live/football-provider-error.js";
export type { FootballProviderErrorCode } from "./live/football-provider-error.js";
export {
  API_SPORTS_FOOTBALL_BASE_URL,
  LiveApiSportsFootballSource,
} from "./live/live-api-sports-football-source.js";
export type {
  FootballHttpFetch,
  LiveApiSportsFootballSourceOptions,
} from "./live/live-api-sports-football-source.js";
export { LiveApiSportsMatchCatalog } from "./live/live-api-sports-match-catalog.js";
export type { LiveApiSportsMatchCatalogOptions } from "./live/live-api-sports-match-catalog.js";
export { fetchFootballJson } from "./live/live-football-http.js";
export {
  mapApiFootballFixtureItem,
  mapApiFootballFixturesResponse,
} from "./mapper/map-api-football-fixture.js";
export { mapApiFootballTeamForm } from "./mapper/map-api-football-form.js";
export { mapApiFootballH2H } from "./mapper/map-api-football-h2h.js";
export { mapApiFootballInjuriesResponse } from "./mapper/map-api-football-injuries.js";
export { mapApiFootballLineupsResponse } from "./mapper/map-api-football-lineups.js";
export { mapApiFootballSquadResponse } from "./mapper/map-api-football-squad.js";
export { mapApiFootballStandings } from "./mapper/map-api-football-standings.js";
export { mapApiFootballTeamStats } from "./mapper/map-api-football-stats.js";
export { mapBoardRowToUpcomingFixture } from "./mapper/map-board-row-to-upcoming.js";
export type { FootballUpcomingFixtureRow } from "./mapper/map-board-row-to-upcoming.js";
export { mapBundleToBoardRow } from "./mapper/map-bundle-to-board-row.js";
export { statsFromFormGoals } from "./mapper/stats-from-form.js";
export { toEvidenceMatchShape } from "./mapper/to-evidence-match.js";
export { RecordedFootballCatalog } from "./recorded/recorded-football-catalog.js";
