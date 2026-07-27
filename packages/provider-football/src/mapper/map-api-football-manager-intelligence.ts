import type {
  FootballManagerIntelligenceRecord,
  FootballManagerIntelligenceSide,
} from "../domain/football-manager-intelligence.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function utcDayStamp(iso: string): number | undefined {
  const trimmed = iso.trim();
  if (trimmed.length < 10) {
    return undefined;
  }

  const day = trimmed.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (match === null) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const millis = Date.UTC(year, month - 1, date);
  return Number.isFinite(millis) ? millis : undefined;
}

function tenureDays(startDate: string, observedAt: string): number | undefined {
  const start = utcDayStamp(startDate);
  const observed = utcDayStamp(observedAt);
  if (start === undefined || observed === undefined || observed < start) {
    return undefined;
  }

  return Math.floor((observed - start) / 86_400_000);
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

interface CoachCareerEntry {
  readonly teamId?: string;
  readonly teamName?: string;
  readonly start?: string;
  readonly end?: string | undefined;
}

interface CoachIdentity {
  readonly managerId?: string;
  readonly managerName: string;
  readonly age?: number;
  readonly nationality?: string;
  readonly career: readonly CoachCareerEntry[];
}

function parseCoachCareer(value: unknown): readonly CoachCareerEntry[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  const entries: CoachCareerEntry[] = [];

  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }

    const team = isRecord(entry.team) ? entry.team : undefined;
    const teamIdNumber = asNumber(team?.id);
    const teamId =
      teamIdNumber === undefined ? asString(team?.id) : String(teamIdNumber);
    const teamName = asString(team?.name);
    const start = asString(entry.start);
    const end =
      entry.end === null || entry.end === undefined
        ? undefined
        : asString(entry.end);

    entries.push(
      Object.freeze({
        ...(teamId === undefined ? {} : { teamId }),
        ...(teamName === undefined ? {} : { teamName }),
        ...(start === undefined ? {} : { start }),
        ...(end === undefined ? {} : { end }),
      }),
    );
  }

  return Object.freeze(entries);
}

/**
 * Parses API-Football `/coachs?team=` response[0] into a provider-neutral
 * identity. Empty / incomplete → undefined (honest absence). Never invents
 * age, nationality, or career facts the provider does not supply.
 */
function parseCoachIdentity(body: unknown): CoachIdentity | undefined {
  if (
    !isRecord(body) ||
    !Array.isArray(body.response) ||
    body.response.length === 0
  ) {
    return undefined;
  }

  const coach = body.response[0];
  if (!isRecord(coach)) {
    return undefined;
  }

  const managerName =
    asString(coach.name) ??
    [asString(coach.firstname), asString(coach.lastname)]
      .filter((part): part is string => part !== undefined)
      .join(" ");

  if (managerName.length === 0) {
    return undefined;
  }

  const managerIdNumber = asNumber(coach.id);
  const managerId =
    managerIdNumber === undefined ? undefined : String(managerIdNumber);
  const age = asNumber(coach.age);
  const nationality = asString(coach.nationality);

  return Object.freeze({
    ...(managerId === undefined ? {} : { managerId }),
    managerName,
    ...(age === undefined ? {} : { age }),
    ...(nationality === undefined ? {} : { nationality }),
    career: parseCoachCareer(coach.career),
  });
}

function currentAppointment(
  career: readonly CoachCareerEntry[],
  teamId: string,
): { readonly appointmentDate?: string; readonly tenureDays?: number } | undefined {
  const current = career.find(
    (entry) =>
      entry.teamId === teamId &&
      entry.end === undefined &&
      entry.start !== undefined,
  );

  if (current?.start === undefined) {
    return undefined;
  }

  const appointmentDate =
    current.start.length >= 10 ? current.start.slice(0, 10) : current.start;

  return Object.freeze({ appointmentDate });
}

const MAX_PREVIOUS_CLUBS = 5;

function previousClubNames(
  career: readonly CoachCareerEntry[],
  currentTeamId: string,
): readonly string[] {
  const ordered = career
    .filter(
      (entry) =>
        entry.teamName !== undefined &&
        entry.teamId !== currentTeamId &&
        entry.end !== undefined,
    )
    .sort((left, right) => (right.start ?? "").localeCompare(left.start ?? ""));

  const seen = new Set<string>();
  const names: string[] = [];

  for (const entry of ordered) {
    const name = entry.teamName;
    if (name === undefined || seen.has(name)) {
      continue;
    }

    seen.add(name);
    names.push(name);

    if (names.length >= MAX_PREVIOUS_CLUBS) {
      break;
    }
  }

  return Object.freeze(names);
}

function minimalConfirmedRecord(
  managerName: string,
  options: ManagerIntelligenceOptions,
): FootballManagerIntelligenceRecord {
  return Object.freeze({
    managerName,
    teamId: options.teamId,
    teamName: options.teamName,
    teamSide: options.teamSide,
    ...(options.competitionId === undefined
      ? {}
      : { competitionId: options.competitionId }),
    ...(options.competitionName === undefined
      ? {}
      : { competitionName: options.competitionName }),
    ...(options.season === undefined ? {} : { season: options.season }),
    matchManagerConfirmed: true,
    observedAt: options.observedAt,
    providerMethod: options.providerMethod,
  });
}

interface ManagerIntelligenceOptions {
  readonly teamId: string;
  readonly teamName: string;
  readonly teamSide: FootballManagerIntelligenceSide;
  readonly competitionId?: string;
  readonly competitionName?: string;
  readonly season?: string;
  readonly observedAt: string;
  readonly providerMethod: "http-live" | "recorded-snapshot";
  /** Confirmed matchday coach name from `/fixtures/lineups`, when published. */
  readonly lineupCoachName?: string;
}

/**
 * Maps API-Football `/coachs?team=` (+ optional confirmed lineup coach name)
 * into a Manager Intelligence record for one side (M1A). Never estimates
 * interim status, tenure, or previous clubs the provider does not supply;
 * missing identity for a side means honest absence, not "no manager".
 */
export function mapApiFootballManagerIntelligence(
  body: unknown,
  options: ManagerIntelligenceOptions,
): FootballManagerIntelligenceRecord | undefined {
  const identity = parseCoachIdentity(body);
  const lineupName = asString(options.lineupCoachName);

  if (identity === undefined) {
    return lineupName === undefined
      ? undefined
      : minimalConfirmedRecord(lineupName, options);
  }

  const namesMatch =
    lineupName !== undefined &&
    normalizeName(lineupName) === normalizeName(identity.managerName);

  // Lineup shows a different name than the season /coachs profile (e.g. a
  // caretaker for this match only) — report only the confirmed match-day
  // identity; season career facts belong to a different person and must
  // not be attached dishonestly.
  if (lineupName !== undefined && !namesMatch) {
    return minimalConfirmedRecord(lineupName, options);
  }

  const appointment = currentAppointment(identity.career, options.teamId);
  const previousClubs = previousClubNames(identity.career, options.teamId);
  const tenure =
    appointment?.appointmentDate === undefined
      ? undefined
      : tenureDays(appointment.appointmentDate, options.observedAt);

  return Object.freeze({
    ...(identity.managerId === undefined ? {} : { managerId: identity.managerId }),
    managerName: identity.managerName,
    teamId: options.teamId,
    teamName: options.teamName,
    teamSide: options.teamSide,
    ...(options.competitionId === undefined
      ? {}
      : { competitionId: options.competitionId }),
    ...(options.competitionName === undefined
      ? {}
      : { competitionName: options.competitionName }),
    ...(options.season === undefined ? {} : { season: options.season }),
    ...(identity.age === undefined ? {} : { age: identity.age }),
    ...(identity.nationality === undefined
      ? {}
      : { nationality: identity.nationality }),
    ...(appointment?.appointmentDate === undefined
      ? {}
      : { appointmentDate: appointment.appointmentDate }),
    ...(tenure === undefined ? {} : { tenureDays: tenure }),
    ...(previousClubs.length === 0 ? {} : { previousClubs }),
    matchManagerConfirmed: namesMatch,
    observedAt: options.observedAt,
    providerMethod: options.providerMethod,
  });
}
