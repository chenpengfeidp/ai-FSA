/**
 * Default The Odds API sport keys for Match Center live / recorded fan-out.
 * One credit unit per sport × markets × regions on each board refresh.
 *
 * Coverage intent: big-5, K/J League, Sweden/Finland/Norway, Portugal,
 * UCL (+ qualification), Europa League, Conference League.
 * Note: The Odds API has no separate Europa League qualification sport key.
 */
export const DEFAULT_MATCH_CENTER_SPORT_KEYS: readonly string[] = Object.freeze([
  // Big five
  "soccer_epl",
  "soccer_spain_la_liga",
  "soccer_italy_serie_a",
  "soccer_germany_bundesliga",
  "soccer_france_ligue_one",
  // Iberia / Nordics / Asia
  "soccer_portugal_primeira_liga",
  "soccer_sweden_allsvenskan",
  "soccer_finland_veikkausliiga",
  "soccer_norway_eliteserien",
  "soccer_korea_kleague1",
  "soccer_japan_j_league",
  // UEFA club competitions
  "soccer_uefa_champs_league",
  "soccer_uefa_champs_league_qualification",
  "soccer_uefa_europa_league",
  "soccer_uefa_europa_conference_league",
]);
