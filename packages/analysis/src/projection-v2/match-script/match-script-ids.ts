export const MATCH_SCRIPT_IDS = Object.freeze([
  "home_control",
  "away_counter",
  "balanced",
  "low_event",
] as const);

export type MatchScriptId = (typeof MATCH_SCRIPT_IDS)[number];

export function isMatchScriptId(value: string): value is MatchScriptId {
  return (MATCH_SCRIPT_IDS as readonly string[]).includes(value);
}
