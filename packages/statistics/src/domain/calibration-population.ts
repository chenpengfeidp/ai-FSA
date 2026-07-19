export type CalibrationOutcome = "away" | "draw" | "home";

export interface CalibrationPopulationRow {
  readonly pHome: number;
  readonly pDraw: number;
  readonly pAway: number;
  readonly outcome: CalibrationOutcome;
}
