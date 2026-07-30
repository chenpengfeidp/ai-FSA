export const FOOTBALL_STATE_DIMENSION_IDS = Object.freeze([
  "attackState",
  "defenseState",
  "controlState",
  "transitionState",
  "pressureState",
  "riskState",
] as const);

export type FootballStateDimensionId = (typeof FOOTBALL_STATE_DIMENSION_IDS)[number];

export const FOOTBALL_STATE_DIMENSION_LABELS: Readonly<
  Record<FootballStateDimensionId, string>
> = Object.freeze({
  attackState: "Attack State",
  defenseState: "Defense State",
  controlState: "Control State",
  transitionState: "Transition State",
  pressureState: "Pressure State",
  riskState: "Risk State",
});
