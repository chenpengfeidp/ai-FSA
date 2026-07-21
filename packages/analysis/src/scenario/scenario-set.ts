import { createMatchId, type MatchId } from "@fas/match";
import type { DeterministicMatchProjection } from "../projection/deterministic-match-projection.js";
import { stableChecksum } from "../projection/stable-checksum.js";

export const SCENARIO_POLICY_VERSION = "scenario.mvp.a05";

export type ScenarioWinner = "away" | "draw" | "home";

export type ScenarioSlot = "mostLikely" | "secondLikely" | "upset";

export interface Scenario {
  readonly slot: ScenarioSlot;
  readonly winner: ScenarioWinner;
  readonly homeGoals: number;
  readonly awayGoals: number;
  readonly probability: number;
  readonly label: string;
}

export interface ScenarioSet {
  readonly policyVersion: typeof SCENARIO_POLICY_VERSION;
  readonly matchId: MatchId;
  readonly mostLikely: Scenario;
  readonly secondLikely: Scenario;
  readonly upset: Scenario;
  readonly residualMass: number;
  readonly checksum: string;
}

function winnerOf(homeGoals: number, awayGoals: number): ScenarioWinner {
  if (homeGoals > awayGoals) {
    return "home";
  }

  if (homeGoals < awayGoals) {
    return "away";
  }

  return "draw";
}

function scoreKey(homeGoals: number, awayGoals: number): string {
  return `${homeGoals}-${awayGoals}`;
}

function labelFor(
  winner: ScenarioWinner,
  homeGoals: number,
  awayGoals: number,
): string {
  const side =
    winner === "home" ? "Home win" : winner === "away" ? "Away win" : "Draw";

  return `${side} ${homeGoals}-${awayGoals}`;
}

function oneXTwoWorlds(projection: DeterministicMatchProjection): readonly Readonly<{
  winner: ScenarioWinner;
  homeGoals: number;
  awayGoals: number;
  probability: number;
}>[] {
  return Object.freeze([
    Object.freeze({
      winner: "home" as const,
      homeGoals: 1,
      awayGoals: 0,
      probability: projection.pHome,
    }),
    Object.freeze({
      winner: "draw" as const,
      homeGoals: 1,
      awayGoals: 1,
      probability: projection.pDraw,
    }),
    Object.freeze({
      winner: "away" as const,
      homeGoals: 0,
      awayGoals: 1,
      probability: projection.pAway,
    }),
  ]);
}

function buildScenario(
  slot: ScenarioSlot,
  homeGoals: number,
  awayGoals: number,
  probability: number,
): Scenario {
  const winner = winnerOf(homeGoals, awayGoals);

  return Object.freeze({
    slot,
    winner,
    homeGoals,
    awayGoals,
    probability,
    label: labelFor(winner, homeGoals, awayGoals),
  });
}

/**
 * Deterministic scenario trio from sealed projection scorelines + 1X2 mass.
 */
export function buildScenarioSet(
  projection: DeterministicMatchProjection,
): ScenarioSet {
  const matchId = createMatchId(projection.matchId);
  const ranked = [...projection.topScorelines].sort(
    (left, right) =>
      right.probability - left.probability ||
      left.homeGoals - right.homeGoals ||
      left.awayGoals - right.awayGoals,
  );

  const mostSource = ranked[0];
  const mostLikely =
    mostSource === undefined
      ? buildScenario("mostLikely", 1, 1, projection.pDraw)
      : buildScenario(
          "mostLikely",
          mostSource.homeGoals,
          mostSource.awayGoals,
          mostSource.probability,
        );

  const secondSource = ranked.find(
    (entry) =>
      scoreKey(entry.homeGoals, entry.awayGoals) !==
        scoreKey(mostLikely.homeGoals, mostLikely.awayGoals) &&
      (winnerOf(entry.homeGoals, entry.awayGoals) !== mostLikely.winner ||
        scoreKey(entry.homeGoals, entry.awayGoals) !==
          scoreKey(mostLikely.homeGoals, mostLikely.awayGoals)),
  );
  const secondLikely =
    secondSource === undefined
      ? (() => {
          const fallback = oneXTwoWorlds(projection)
            .filter((world) => world.winner !== mostLikely.winner)
            .sort((left, right) => right.probability - left.probability)[0];

          return buildScenario(
            "secondLikely",
            fallback?.homeGoals ?? 1,
            fallback?.awayGoals ?? 1,
            fallback?.probability ?? 0,
          );
        })()
      : buildScenario(
          "secondLikely",
          secondSource.homeGoals,
          secondSource.awayGoals,
          secondSource.probability,
        );

  const contradictingScoreline = ranked.find(
    (entry) => winnerOf(entry.homeGoals, entry.awayGoals) !== mostLikely.winner,
  );
  let upset: Scenario;

  if (contradictingScoreline !== undefined) {
    upset = buildScenario(
      "upset",
      contradictingScoreline.homeGoals,
      contradictingScoreline.awayGoals,
      contradictingScoreline.probability,
    );
  } else {
    const worlds = oneXTwoWorlds(projection);
    const upsetWorld =
      mostLikely.winner === "draw"
        ? [...worlds]
            .filter((world) => world.winner !== "draw")
            .sort((left, right) => right.probability - left.probability)[0]
        : worlds.find((world) => world.winner !== mostLikely.winner);

    upset = buildScenario(
      "upset",
      upsetWorld?.homeGoals ?? (mostLikely.winner === "home" ? 0 : 1),
      upsetWorld?.awayGoals ?? (mostLikely.winner === "home" ? 1 : 0),
      upsetWorld?.probability ?? 0,
    );
  }

  const covered =
    mostLikely.probability + secondLikely.probability + upset.probability;
  const residualMass = Math.max(0, Math.round((1 - covered) * 1e6) / 1e6);
  const checksum = stableChecksum(
    JSON.stringify({
      policyVersion: SCENARIO_POLICY_VERSION,
      matchId,
      mostLikely,
      secondLikely,
      upset,
      residualMass,
    }),
  );

  return Object.freeze({
    policyVersion: SCENARIO_POLICY_VERSION,
    matchId,
    mostLikely,
    secondLikely,
    upset,
    residualMass,
    checksum,
  });
}
