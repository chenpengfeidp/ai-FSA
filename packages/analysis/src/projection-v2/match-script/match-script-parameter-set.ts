import type { FeatureName } from "@fas/feature";
import type { MatchScriptId } from "./match-script-ids.js";

export const MATCH_SCRIPT_PARAMETER_POLICY_VERSION = "matchScript.v1";

export interface MatchScriptLambdaModifiers {
  readonly homeMultiplier: number;
  readonly awayMultiplier: number;
  readonly drawBias: number;
}

export interface MatchScriptCatalogEntry {
  readonly scriptId: MatchScriptId;
  readonly label: string;
  readonly lambdaModifiers: MatchScriptLambdaModifiers;
  readonly activatingRules: readonly string[];
  readonly strengtheningFeatures: readonly FeatureName[];
  readonly rulePassWeight: number;
  readonly featurePresenceWeight: number;
  readonly baselineAffinity: number;
}

export interface MatchScriptParameterSet {
  readonly policyVersion: typeof MATCH_SCRIPT_PARAMETER_POLICY_VERSION;
  readonly temperature: number;
  readonly minScriptWeight: number;
  readonly minActiveScripts: number;
  readonly catalog: readonly MatchScriptCatalogEntry[];
}
