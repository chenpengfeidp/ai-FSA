import type { MatchScriptParameterSet } from "./match-script-parameter-set.js";

export const GOVERNED_MATCH_SCRIPT_PARAMETER_SET = {
  policyVersion: "matchScript.v1",
  temperature: 0.85,
  minScriptWeight: 0.1,
  minActiveScripts: 2,
  catalog: [
    {
      scriptId: "home_control",
      label: "Home Control",
      lambdaModifiers: {
        homeMultiplier: 1.08,
        awayMultiplier: 0.92,
        drawBias: 0,
      },
      baselineAffinity: 0.05,
      dimensionBonuses: [
        {
          dimensionId: "controlState",
          minimumLevel: "medium",
          weight: 0.35,
          reason:
            "Control state at medium or higher supports home territorial control.",
        },
        {
          dimensionId: "attackState",
          minimumLevel: "medium",
          weight: 0.2,
          reason: "Attack state at medium or higher supports home chance creation.",
        },
      ],
      compositeTagBonuses: [],
      asymmetricBonuses: [
        {
          side: "home",
          minimumRatingGap: 0,
          weight: 0.25,
          reason: "Home attack rating exceeds away attack rating.",
        },
      ],
    },
    {
      scriptId: "away_control",
      label: "Away Control",
      lambdaModifiers: {
        homeMultiplier: 0.92,
        awayMultiplier: 1.08,
        drawBias: 0,
      },
      baselineAffinity: 0.05,
      dimensionBonuses: [
        {
          dimensionId: "controlState",
          minimumLevel: "medium",
          weight: 0.35,
          reason:
            "Control state at medium or higher supports away territorial control.",
        },
        {
          dimensionId: "attackState",
          minimumLevel: "medium",
          weight: 0.2,
          reason: "Attack state at medium or higher supports away chance creation.",
        },
      ],
      compositeTagBonuses: [],
      asymmetricBonuses: [
        {
          side: "away",
          minimumRatingGap: 0,
          weight: 0.25,
          reason: "Away attack rating exceeds home attack rating.",
        },
      ],
    },
    {
      scriptId: "counter_attack",
      label: "Counter Attack",
      lambdaModifiers: {
        homeMultiplier: 0.9,
        awayMultiplier: 1.05,
        drawBias: 0,
      },
      baselineAffinity: 0.05,
      dimensionBonuses: [
        {
          dimensionId: "transitionState",
          minimumLevel: "medium",
          weight: 0.35,
          reason: "Transition state at medium or higher supports counter channels.",
        },
        {
          dimensionId: "attackState",
          minimumLevel: "medium",
          weight: 0.15,
          reason: "Attack state supports transition finishing threat.",
        },
      ],
      compositeTagBonuses: [
        {
          tag: "TRANSITION_CHANNEL",
          weight: 0.25,
          reason: "Football State composite tag TRANSITION_CHANNEL is active.",
        },
      ],
      asymmetricBonuses: [
        {
          side: "home",
          minimumRatingGap: 2,
          weight: 0.2,
          reason:
            "Home is structurally favoured; away counter channel is plausible.",
        },
      ],
    },
    {
      scriptId: "open_match",
      label: "Open Match",
      lambdaModifiers: {
        homeMultiplier: 1.12,
        awayMultiplier: 1.12,
        drawBias: 0,
      },
      baselineAffinity: 0.05,
      dimensionBonuses: [
        {
          dimensionId: "attackState",
          minimumLevel: "medium",
          weight: 0.3,
          reason: "Elevated attack state supports an open exchange.",
        },
      ],
      compositeTagBonuses: [],
      asymmetricBonuses: [],
      maxDimensionLevel: {
        dimensionId: "defenseState",
        maximumLevel: "medium",
        weight: 0.25,
        reason: "Defense state is not high — both sides may concede chances.",
      },
    },
    {
      scriptId: "low_event",
      label: "Low Event",
      lambdaModifiers: {
        homeMultiplier: 0.85,
        awayMultiplier: 0.85,
        drawBias: 0.06,
      },
      baselineAffinity: 0.08,
      dimensionBonuses: [
        {
          dimensionId: "defenseState",
          minimumLevel: "medium",
          weight: 0.25,
          reason: "Defense state at medium or higher supports a low-event shape.",
        },
      ],
      compositeTagBonuses: [
        {
          tag: "LOW_EVENT_SHAPE",
          weight: 0.4,
          reason: "Football State composite tag LOW_EVENT_SHAPE is active.",
        },
      ],
      asymmetricBonuses: [],
      maxDimensionLevel: {
        dimensionId: "controlState",
        maximumLevel: "low",
        weight: 0.15,
        reason: "Control state is low — limited chance volume expected.",
      },
    },
    {
      scriptId: "balanced",
      label: "Balanced",
      lambdaModifiers: {
        homeMultiplier: 1,
        awayMultiplier: 1,
        drawBias: 0,
      },
      baselineAffinity: 1,
      dimensionBonuses: [],
      compositeTagBonuses: [],
      asymmetricBonuses: [],
    },
  ],
} as const satisfies MatchScriptParameterSet;

export type GovernedMatchScriptParameterSet =
  typeof GOVERNED_MATCH_SCRIPT_PARAMETER_SET;
