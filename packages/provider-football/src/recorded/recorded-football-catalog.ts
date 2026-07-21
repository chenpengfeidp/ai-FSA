import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FootballAvailabilityAbsence,
  FootballBoardRow,
  FootballFixture,
  FootballH2H,
  FootballMatchBundle,
  FootballPlayer,
  FootballStandings,
  FootballTeamForm,
  FootballTeamStats,
} from "../domain/football-models.js";
import type {
  FootballFixturesSource,
  FootballMatchCatalog,
} from "../domain/ports.js";
import { mapBundleToBoardRow } from "../mapper/map-bundle-to-board-row.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function freezeBundle(raw: unknown): FootballMatchBundle | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  const fixture = raw.fixture as FootballFixture | undefined;
  const homeForm = raw.homeForm as FootballTeamForm | undefined;
  const awayForm = raw.awayForm as FootballTeamForm | undefined;
  const homeStats = raw.homeStats as FootballTeamStats | undefined;
  const awayStats = raw.awayStats as FootballTeamStats | undefined;
  const headToHead = raw.headToHead as FootballH2H | undefined;

  if (
    fixture === undefined ||
    homeForm === undefined ||
    awayForm === undefined ||
    homeStats === undefined ||
    awayStats === undefined ||
    headToHead === undefined
  ) {
    return undefined;
  }

  const standings =
    raw.standings === null || raw.standings === undefined
      ? undefined
      : (raw.standings as FootballStandings);

  const playersRaw = Array.isArray(raw.players) ? raw.players : [];
  const absencesRaw = Array.isArray(raw.availabilityAbsences)
    ? raw.availabilityAbsences
    : [];

  return Object.freeze({
    fixture: Object.freeze({ ...fixture }),
    homeForm: Object.freeze({ ...homeForm }),
    awayForm: Object.freeze({ ...awayForm }),
    homeStats: Object.freeze({ ...homeStats }),
    awayStats: Object.freeze({ ...awayStats }),
    headToHead: Object.freeze({ ...headToHead }),
    standings: standings === undefined ? undefined : Object.freeze({ ...standings }),
    players: Object.freeze(
      playersRaw.flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const playerId =
          typeof entry.playerId === "string" ? entry.playerId.trim() : "";
        const name = typeof entry.name === "string" ? entry.name.trim() : "";
        const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
        const teamName =
          typeof entry.teamName === "string" ? entry.teamName.trim() : "";
        const teamSide =
          entry.teamSide === "home" || entry.teamSide === "away"
            ? entry.teamSide
            : undefined;
        const providerMethod =
          entry.providerMethod === "http-live" ||
          entry.providerMethod === "recorded-snapshot"
            ? entry.providerMethod
            : undefined;

        if (
          playerId.length === 0 ||
          name.length === 0 ||
          teamId.length === 0 ||
          teamName.length === 0 ||
          teamSide === undefined ||
          providerMethod === undefined
        ) {
          return [];
        }

        const player: FootballPlayer = Object.freeze({
          playerId,
          name,
          teamId,
          teamName,
          teamSide,
          position:
            typeof entry.position === "string" && entry.position.trim().length > 0
              ? entry.position.trim()
              : undefined,
          number:
            typeof entry.number === "number" && Number.isFinite(entry.number)
              ? entry.number
              : undefined,
          nationality:
            typeof entry.nationality === "string" &&
            entry.nationality.trim().length > 0
              ? entry.nationality.trim()
              : undefined,
          photoUrl:
            typeof entry.photoUrl === "string" && entry.photoUrl.trim().length > 0
              ? entry.photoUrl.trim()
              : undefined,
          providerMethod,
        });

        return [player];
      }),
    ),
    availabilityAbsences: Object.freeze(
      absencesRaw.flatMap((entry) => {
        if (!isRecord(entry)) {
          return [];
        }

        const playerId =
          typeof entry.playerId === "string" ? entry.playerId.trim() : "";
        const playerName =
          typeof entry.playerName === "string" ? entry.playerName.trim() : "";
        const teamId = typeof entry.teamId === "string" ? entry.teamId.trim() : "";
        const teamName =
          typeof entry.teamName === "string" ? entry.teamName.trim() : "";
        const teamSide =
          entry.teamSide === "home" || entry.teamSide === "away"
            ? entry.teamSide
            : undefined;
        const kind =
          entry.kind === "injury" || entry.kind === "suspension"
            ? entry.kind
            : undefined;
        const providerMethod =
          entry.providerMethod === "http-live" ||
          entry.providerMethod === "recorded-snapshot"
            ? entry.providerMethod
            : undefined;

        if (
          playerId.length === 0 ||
          playerName.length === 0 ||
          teamId.length === 0 ||
          teamName.length === 0 ||
          teamSide === undefined ||
          kind === undefined ||
          providerMethod === undefined
        ) {
          return [];
        }

        const absence: FootballAvailabilityAbsence = Object.freeze({
          playerId,
          playerName,
          teamId,
          teamName,
          teamSide,
          kind,
          reason:
            typeof entry.reason === "string" && entry.reason.trim().length > 0
              ? entry.reason.trim()
              : undefined,
          providerMethod,
        });

        return [absence];
      }),
    ),
  });
}

export class RecordedFootballCatalog
  implements FootballMatchCatalog, FootballFixturesSource
{
  readonly #byMatchId: ReadonlyMap<string, FootballMatchBundle>;
  readonly #bundles: readonly FootballMatchBundle[];

  constructor(bundles?: readonly FootballMatchBundle[]) {
    const loaded = bundles ?? loadDefaultBundles();
    this.#bundles = Object.freeze([...loaded]);
    this.#byMatchId = new Map(
      loaded.map((bundle) => [bundle.fixture.matchId, bundle]),
    );
  }

  getMatchBundle(matchId: string): FootballMatchBundle | undefined {
    return this.#byMatchId.get(matchId);
  }

  listBundles(): readonly FootballMatchBundle[] {
    return this.#bundles;
  }

  async listUpcoming(options?: {
    readonly fromDate?: string;
    readonly toDate?: string;
  }): Promise<readonly FootballBoardRow[]> {
    const fromDate = options?.fromDate;
    const toDate = options?.toDate;

    const rows = this.#bundles
      .filter((bundle) => {
        const day = bundle.fixture.kickoff.slice(0, 10);

        if (fromDate !== undefined && day < fromDate) {
          return false;
        }

        if (toDate !== undefined && day > toDate) {
          return false;
        }

        return true;
      })
      .map(mapBundleToBoardRow)
      .sort((left, right) => left.kickoff.localeCompare(right.kickoff));

    return Object.freeze(rows);
  }
}

function loadDefaultBundles(): readonly FootballMatchBundle[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "../../fixtures/match-bundles-k-league.json");
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));

  if (!isRecord(parsed) || !Array.isArray(parsed.bundles)) {
    return Object.freeze([]);
  }

  const bundles: FootballMatchBundle[] = [];

  for (const item of parsed.bundles) {
    const frozen = freezeBundle(item);

    if (frozen !== undefined) {
      bundles.push(frozen);
    }
  }

  return Object.freeze(bundles);
}
