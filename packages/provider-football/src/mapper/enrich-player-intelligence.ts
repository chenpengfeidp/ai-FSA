import type {
  FootballAvailabilityAbsence,
  FootballPlayer,
  FootballPlayerSeasonStats,
  FootballTeamLineup,
} from "../domain/football-models.js";

/**
 * Selects a small, quota-safe candidate set for the per-player season-stats
 * call: goalkeeper (squad-listed primary) + attackers, capped. Never asserts
 * these are "key" or "starting" players — Evidence only records identity and
 * (when fetched) season stats; no ranking or scoring happens here.
 */
export function selectPlayerStatsCandidates(
  players: readonly FootballPlayer[],
  maxCandidates = 6,
): readonly FootballPlayer[] {
  const goalkeeper = players.find((player) => player.position === "Goalkeeper");
  const attackers = players.filter((player) => player.position === "Attacker");
  const candidates =
    goalkeeper === undefined ? attackers : [goalkeeper, ...attackers];

  return Object.freeze(candidates.slice(0, maxCandidates));
}

export interface PlayerStatsEnrichmentEntry {
  readonly age: number | undefined;
  readonly captain: boolean | undefined;
  readonly seasonStats: FootballPlayerSeasonStats | undefined;
}

/**
 * Overlays fetched season-stats enrichment onto matching squad players.
 * Players without a matching entry are returned unchanged (honest absence).
 */
export function mergePlayerSeasonStats(
  players: readonly FootballPlayer[],
  enrichmentByPlayerId: ReadonlyMap<string, PlayerStatsEnrichmentEntry>,
): readonly FootballPlayer[] {
  return Object.freeze(
    players.map((player) => {
      const enrichment = enrichmentByPlayerId.get(player.playerId);

      if (enrichment === undefined) {
        return player;
      }

      return Object.freeze({
        ...player,
        ...(enrichment.age === undefined ? {} : { age: enrichment.age }),
        ...(enrichment.captain === undefined ? {} : { captain: enrichment.captain }),
        ...(enrichment.seasonStats === undefined
          ? {}
          : { seasonStats: enrichment.seasonStats }),
      });
    }),
  );
}

/**
 * Cross-references already-fetched availability absences and confirmed
 * lineups onto squad players. This is a literal lookup over Facts already
 * gathered for the same fixture, never an inference: a player who is not
 * named in either source keeps `availabilityStatus` / `matchSquadStatus`
 * undefined (honest absence, never implied "available" or "not selected").
 */
export function applyAvailabilityAndSquadStatus(
  players: readonly FootballPlayer[],
  absences: readonly FootballAvailabilityAbsence[],
  lineups: readonly FootballTeamLineup[],
): readonly FootballPlayer[] {
  const absenceByPlayerId = new Map(
    absences.map((absence) => [absence.playerId, absence.kind] as const),
  );

  const startingIds = new Set<string>();
  const benchIds = new Set<string>();

  for (const lineup of lineups) {
    for (const entry of lineup.startXI) {
      startingIds.add(entry.playerId);
    }
    for (const entry of lineup.substitutes) {
      benchIds.add(entry.playerId);
    }
  }

  return Object.freeze(
    players.map((player) => {
      const availabilityStatus = absenceByPlayerId.get(player.playerId);
      const matchSquadStatus = startingIds.has(player.playerId)
        ? ("starting" as const)
        : benchIds.has(player.playerId)
          ? ("bench" as const)
          : undefined;

      if (availabilityStatus === undefined && matchSquadStatus === undefined) {
        return player;
      }

      return Object.freeze({
        ...player,
        ...(availabilityStatus === undefined ? {} : { availabilityStatus }),
        ...(matchSquadStatus === undefined ? {} : { matchSquadStatus }),
      });
    }),
  );
}
