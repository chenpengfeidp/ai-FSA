import type { FootballStateDimensionId } from "../football-state/football-state-dimensions.js";
import type { StateDimensionLevel } from "../football-state/football-state-types.js";
import type { MatchScriptId } from "./match-script-ids.js";

export const MATCH_SCRIPT_PARAMETER_POLICY_VERSION = "matchScript.v1";

export interface MatchScriptLambdaModifiers {
  readonly homeMultiplier: number;
  readonly awayMultiplier: number;
  readonly drawBias: number;
}

export interface MatchScriptDimensionBonus {
  readonly dimensionId: FootballStateDimensionId;
  readonly minimumLevel: StateDimensionLevel;
  readonly weight: number;
  readonly reason: string;
}

export interface MatchScriptCompositeTagBonus {
  readonly tag: string;
  readonly weight: number;
  readonly reason: string;
}

export interface MatchScriptAsymmetricBonus {
  readonly side: "home" | "away";
  readonly minimumRatingGap: number;
  readonly weight: number;
  readonly reason: string;
}

export interface MatchScriptCatalogEntry {
  readonly scriptId: MatchScriptId;
  readonly label: string;
  readonly lambdaModifiers: MatchScriptLambdaModifiers;
  readonly baselineAffinity: number;
  readonly dimensionBonuses: readonly MatchScriptDimensionBonus[];
  readonly compositeTagBonuses: readonly MatchScriptCompositeTagBonus[];
  readonly asymmetricBonuses: readonly MatchScriptAsymmetricBonus[];
  readonly maxDimensionLevel?: {
    readonly dimensionId: FootballStateDimensionId;
    readonly maximumLevel: StateDimensionLevel;
    readonly weight: number;
    readonly reason: string;
  };
}

export interface MatchScriptParameterSet {
  readonly policyVersion: typeof MATCH_SCRIPT_PARAMETER_POLICY_VERSION;
  readonly temperature: number;
  readonly minScriptWeight: number;
  readonly minActiveScripts: number;
  readonly catalog: readonly MatchScriptCatalogEntry[];
}
