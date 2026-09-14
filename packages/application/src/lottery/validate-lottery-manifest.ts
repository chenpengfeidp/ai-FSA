import { buildLotteryMatchId } from "./build-lottery-match-id.js";
import { lotteryError } from "./lottery-errors.js";
import {
  LOTTERY_FIXTURE_AUTHORITY,
  LOTTERY_FIXTURE_MANIFEST_SCHEMA,
  LOTTERY_SCHEDULE_SOURCE,
  type LotteryFixtureManifestV1,
  type LotteryMatchManifestRow,
} from "./lottery-manifest-types.js";

export type LotteryManifestValidationResult =
  | Readonly<{ ok: true; value: LotteryFixtureManifestV1 }>
  | Readonly<{
      ok: false;
      error: import("./lottery-errors.js").LotteryManifestError;
    }>;

const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = record[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}

function requireIso(field: string, value: string | undefined) {
  if (value === undefined || !isoTimestampPattern.test(value)) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field} must be a valid ISO-8601 timestamp.`,
      field,
    );
  }

  return undefined;
}

function parseOdds(value: unknown, fieldPrefix: string) {
  if (!isRecord(value)) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${fieldPrefix} must be an object.`,
      fieldPrefix,
    );
  }

  const homeOdds = value.homeOdds;
  const drawOdds = value.drawOdds;
  const awayOdds = value.awayOdds;
  const observedAt = requireString(value, "observedAt");
  const marketSource = requireString(value, "marketSource");

  if (
    typeof homeOdds !== "number" ||
    typeof drawOdds !== "number" ||
    typeof awayOdds !== "number" ||
    !Number.isFinite(homeOdds) ||
    !Number.isFinite(drawOdds) ||
    !Number.isFinite(awayOdds)
  ) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${fieldPrefix} requires finite homeOdds, drawOdds, awayOdds.`,
      fieldPrefix,
    );
  }

  if (marketSource === undefined) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${fieldPrefix}.marketSource is required.`,
      `${fieldPrefix}.marketSource`,
    );
  }

  const isoErr = requireIso(`${fieldPrefix}.observedAt`, observedAt);

  if (isoErr !== undefined) {
    return isoErr;
  }

  return undefined;
}

function parseMatchRow(
  value: unknown,
  index: number,
): LotteryMatchManifestRow | ReturnType<typeof lotteryError> {
  const field = `matches[${String(index)}]`;

  if (!isRecord(value)) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field} must be an object.`,
      field,
    );
  }

  const lotteryMatchCode = requireString(value, "lotteryMatchCode");
  const homeTeam = requireString(value, "homeTeam");
  const awayTeam = requireString(value, "awayTeam");
  const competitionId = requireString(value, "competitionId");
  const competitionName = requireString(value, "competitionName");
  const season = requireString(value, "season");
  const kickoff = requireString(value, "kickoff");
  const timezone = requireString(value, "timezone");
  const scheduleSource = requireString(value, "scheduleSource");
  const fixtureAuthority = requireString(value, "fixtureAuthority");
  const collectedAt = requireString(value, "collectedAt");

  if (
    lotteryMatchCode === undefined ||
    homeTeam === undefined ||
    awayTeam === undefined ||
    competitionId === undefined ||
    competitionName === undefined ||
    season === undefined ||
    kickoff === undefined ||
    timezone === undefined ||
    scheduleSource === undefined ||
    fixtureAuthority === undefined ||
    collectedAt === undefined
  ) {
    return lotteryError(
      "FIXTURE_IDENTITY_INCOMPLETE",
      `${field} is missing required fixture identity fields.`,
      field,
    );
  }

  if (scheduleSource !== LOTTERY_SCHEDULE_SOURCE) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field}.scheduleSource must be "${LOTTERY_SCHEDULE_SOURCE}".`,
      `${field}.scheduleSource`,
    );
  }

  if (fixtureAuthority !== LOTTERY_FIXTURE_AUTHORITY) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field}.fixtureAuthority must be "${LOTTERY_FIXTURE_AUTHORITY}".`,
      `${field}.fixtureAuthority`,
    );
  }

  for (const tsField of ["kickoff", "collectedAt"] as const) {
    const ts = tsField === "kickoff" ? kickoff : collectedAt;
    const isoErr = requireIso(`${field}.${tsField}`, ts);

    if (isoErr !== undefined) {
      return isoErr;
    }
  }

  const supplementalKickoff = requireString(value, "supplementalKickoff");

  if (supplementalKickoff !== undefined && supplementalKickoff !== kickoff) {
    return lotteryError(
      "KICKOFF_CONFLICT",
      `${field}.supplementalKickoff must match lottery kickoff or be omitted.`,
      `${field}.supplementalKickoff`,
    );
  }

  const oddsErr = parseOdds(value.odds, `${field}.odds`);

  if (oddsErr !== undefined) {
    return oddsErr;
  }

  if (!Array.isArray(value.teamForm) || value.teamForm.length !== 2) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field}.teamForm must contain home and away entries.`,
      `${field}.teamForm`,
    );
  }

  if (!Array.isArray(value.statistics) || value.statistics.length !== 2) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field}.statistics must contain home and away entries.`,
      `${field}.statistics`,
    );
  }

  const fixtureRevision =
    value.fixtureRevision === undefined
      ? undefined
      : typeof value.fixtureRevision === "number" &&
          Number.isInteger(value.fixtureRevision) &&
          value.fixtureRevision >= 1
        ? value.fixtureRevision
        : undefined;

  if (value.fixtureRevision !== undefined && fixtureRevision === undefined) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      `${field}.fixtureRevision must be a positive integer.`,
      `${field}.fixtureRevision`,
    );
  }

  const row: LotteryMatchManifestRow = {
    lotteryMatchCode,
    homeTeam,
    awayTeam,
    competitionId,
    competitionName,
    season,
    kickoff,
    timezone,
    scheduleSource,
    fixtureAuthority,
    collectedAt,
    teamForm: value.teamForm as LotteryMatchManifestRow["teamForm"],
    statistics: value.statistics as LotteryMatchManifestRow["statistics"],
    odds: value.odds as LotteryMatchManifestRow["odds"],
    ...(fixtureRevision === undefined ? {} : { fixtureRevision }),
    ...(supplementalKickoff === undefined ? {} : { supplementalKickoff }),
    ...(Array.isArray(value.additionalOdds)
      ? {
          additionalOdds: value.additionalOdds as NonNullable<
            LotteryMatchManifestRow["additionalOdds"]
          >,
        }
      : {}),
  };

  return Object.freeze(row);
}

function orientationKey(homeTeam: string, awayTeam: string): string {
  return `${homeTeam}\u0000${awayTeam}`;
}

function kickoffWindowMs(kickoff: string): number {
  return Math.floor(Date.parse(kickoff) / (30 * 60 * 1000));
}

export function validateLotteryFixtureManifest(
  input: unknown,
): LotteryManifestValidationResult {
  if (!isRecord(input)) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      "Manifest must be a JSON object.",
    );
  }

  const schemaVersion = requireString(input, "schemaVersion");

  if (schemaVersion !== LOTTERY_FIXTURE_MANIFEST_SCHEMA) {
    return lotteryError(
      "LOTTERY_MANIFEST_SCHEMA_UNSUPPORTED",
      `schemaVersion must be "${LOTTERY_FIXTURE_MANIFEST_SCHEMA}".`,
      "schemaVersion",
    );
  }

  const salesIssueId = requireString(input, "salesIssueId");
  const manifestCollectedAt = requireString(input, "manifestCollectedAt");

  if (salesIssueId === undefined || manifestCollectedAt === undefined) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      "salesIssueId and manifestCollectedAt are required.",
    );
  }

  const manifestIsoErr = requireIso("manifestCollectedAt", manifestCollectedAt);

  if (manifestIsoErr !== undefined) {
    return manifestIsoErr;
  }

  if (!Array.isArray(input.matches) || input.matches.length === 0) {
    return lotteryError(
      "INVALID_LOTTERY_MANIFEST",
      "matches must be a non-empty array.",
      "matches",
    );
  }

  const matches: LotteryMatchManifestRow[] = [];
  const seenCodes = new Set<string>();
  const orientationByCode = new Map<string, string>();
  const softIndex = new Map<string, string>();

  for (let index = 0; index < input.matches.length; index += 1) {
    const parsed = parseMatchRow(input.matches[index], index);

    if ("ok" in parsed) {
      return parsed;
    }

    const row = parsed;

    const codeKey = `${salesIssueId}:${row.lotteryMatchCode}`;

    if (seenCodes.has(codeKey)) {
      return lotteryError(
        "DUPLICATE_LOTTERY_FIXTURE",
        `Duplicate lotteryMatchCode "${row.lotteryMatchCode}" in manifest.`,
        `matches[${String(index)}].lotteryMatchCode`,
      );
    }

    seenCodes.add(codeKey);

    const orientation = orientationKey(row.homeTeam, row.awayTeam);
    const priorOrientation = orientationByCode.get(row.lotteryMatchCode);

    if (priorOrientation !== undefined && priorOrientation !== orientation) {
      return lotteryError(
        "FIXTURE_ORIENTATION_CONFLICT",
        `Orientation conflict for lotteryMatchCode "${row.lotteryMatchCode}".`,
        `matches[${String(index)}]`,
      );
    }

    orientationByCode.set(row.lotteryMatchCode, orientation);

    const softKey = `${row.homeTeam}|${row.awayTeam}|${String(kickoffWindowMs(row.kickoff))}`;

    if (softIndex.has(softKey) && softIndex.get(softKey) !== row.lotteryMatchCode) {
      return lotteryError(
        "AMBIGUOUS_LOTTERY_FIXTURE",
        "Ambiguous fixture: same teams and kickoff window under different codes.",
        `matches[${String(index)}]`,
      );
    }

    softIndex.set(softKey, row.lotteryMatchCode);

    matches.push(row);
  }

  const sourceReference = requireString(input, "sourceReference");
  const teamAliasMapVersion = requireString(input, "teamAliasMapVersion");
  const marketPrimaryBook = requireString(input, "marketPrimaryBook");

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      schemaVersion: LOTTERY_FIXTURE_MANIFEST_SCHEMA,
      salesIssueId,
      manifestCollectedAt,
      matches: Object.freeze(matches),
      ...(sourceReference === undefined ? {} : { sourceReference }),
      ...(teamAliasMapVersion === undefined ? {} : { teamAliasMapVersion }),
      ...(marketPrimaryBook === undefined ? {} : { marketPrimaryBook }),
    }),
  });
}

export function buildRegisteredLotteryFixtures(
  manifest: LotteryFixtureManifestV1,
): ReadonlyArray<
  Readonly<{
    matchId: string;
    salesIssueId: string;
    row: LotteryMatchManifestRow;
  }>
> {
  return manifest.matches.map((row) =>
    Object.freeze({
      matchId: buildLotteryMatchId(manifest.salesIssueId, row.lotteryMatchCode),
      salesIssueId: manifest.salesIssueId,
      row,
    }),
  );
}
