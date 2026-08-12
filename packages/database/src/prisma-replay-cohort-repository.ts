import {
  ConflictReplayCohortError,
  ReplayCohortNotFoundError,
  SealedReplayCohortImmutableError,
  REPLAY_COHORT_ORDERING_HISTORY_ID_ASC,
  REPLAY_COHORT_SCHEMA_VERSION,
  REPLAY_ELIGIBILITY_CONTRACT_VERSION,
  type ReplayCohort,
  type ReplayCohortMember,
  type ReplayCohortRepository,
  type ReplayCohortSpecification,
  type ReplayCohortStatus,
} from "@fas/statistics";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { FAS_EVIDENCE_NAMESPACE, uuidV5 } from "./uuid-v5.js";

function cohortRowId(cohortId: string): string {
  return uuidV5(`replay-cohort:${cohortId}`, FAS_EVIDENCE_NAMESPACE);
}

function memberRowId(cohortId: string, historyId: string): string {
  return uuidV5(
    `replay-cohort-member:${cohortId}:${historyId}`,
    FAS_EVIDENCE_NAMESPACE,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reviveSpecification(value: unknown): ReplayCohortSpecification {
  if (!isRecord(value)) {
    throw new Error("Invalid Replay Cohort specification JSON.");
  }

  if (
    value.eligibilityContractVersion !== REPLAY_ELIGIBILITY_CONTRACT_VERSION ||
    typeof value.sidecarSchemaVersion !== "string" ||
    value.ordering !== REPLAY_COHORT_ORDERING_HISTORY_ID_ASC
  ) {
    throw new Error("Unsupported Replay Cohort specification payload.");
  }

  return Object.freeze({
    eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    sidecarSchemaVersion: value.sidecarSchemaVersion,
    ordering: REPLAY_COHORT_ORDERING_HISTORY_ID_ASC,
    ...(typeof value.maxSampleSize === "number"
      ? { maxSampleSize: value.maxSampleSize }
      : {}),
    ...(typeof value.recordedAtFromInclusive === "string"
      ? { recordedAtFromInclusive: value.recordedAtFromInclusive }
      : {}),
    ...(typeof value.recordedAtToExclusive === "string"
      ? { recordedAtToExclusive: value.recordedAtToExclusive }
      : {}),
  });
}

function reviveLimitations(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  return Object.freeze(
    value.filter((item): item is string => typeof item === "string"),
  );
}

function sameMembership(left: ReplayCohort, right: ReplayCohort): boolean {
  return (
    left.membershipDigestSha256 === right.membershipDigestSha256 &&
    left.schemaVersion === right.schemaVersion &&
    left.eligibilityContractVersion === right.eligibilityContractVersion &&
    left.sidecarSchemaVersion === right.sidecarSchemaVersion &&
    JSON.stringify(left.members) === JSON.stringify(right.members) &&
    JSON.stringify(left.specification) === JSON.stringify(right.specification)
  );
}

type CohortRow = {
  cohortId: string;
  schemaVersion: string;
  status: string;
  specificationJson: unknown;
  eligibilityContractVersion: string;
  sidecarSchemaVersion: string;
  createdAt: Date;
  membershipCreatedAt: Date;
  sealedAt: Date | null;
  membershipDigestSha256: string;
  limitationsJson: unknown;
  members: Array<{
    historyId: string;
    matchId: string;
    position: number;
  }>;
};

function toDomain(row: CohortRow): ReplayCohort {
  if (row.schemaVersion !== REPLAY_COHORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported Replay Cohort schemaVersion: ${row.schemaVersion}`);
  }

  if (row.status !== "DRAFT" && row.status !== "SEALED") {
    throw new Error(`Unsupported Replay Cohort status: ${row.status}`);
  }

  const status = row.status as ReplayCohortStatus;
  const members: readonly ReplayCohortMember[] = Object.freeze(
    [...row.members]
      .sort((left, right) => left.position - right.position)
      .map((member) =>
        Object.freeze({
          historyId: member.historyId,
          matchId: member.matchId,
          position: member.position,
        }),
      ),
  );

  return Object.freeze({
    cohortId: row.cohortId,
    schemaVersion: REPLAY_COHORT_SCHEMA_VERSION,
    status,
    specification: reviveSpecification(row.specificationJson),
    eligibilityContractVersion: REPLAY_ELIGIBILITY_CONTRACT_VERSION,
    sidecarSchemaVersion: row.sidecarSchemaVersion,
    createdAt: row.createdAt.toISOString(),
    membershipCreatedAt: row.membershipCreatedAt.toISOString(),
    sealedAt: row.sealedAt?.toISOString(),
    members,
    membershipDigestSha256: row.membershipDigestSha256,
    limitations: reviveLimitations(row.limitationsJson),
  });
}

export class PrismaReplayCohortRepository implements ReplayCohortRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async save(cohort: ReplayCohort): Promise<ReplayCohort> {
    const existingRow = await this.#client.replayCohortItem.findUnique({
      where: { cohortId: cohort.cohortId },
      include: { members: true },
    });

    if (existingRow !== null) {
      const existing = toDomain(existingRow);

      if (existing.status === "SEALED") {
        if (cohort.status === "SEALED" && sameMembership(existing, cohort)) {
          return existing;
        }

        throw new SealedReplayCohortImmutableError(cohort.cohortId);
      }

      if (!sameMembership(existing, cohort)) {
        throw new ConflictReplayCohortError(cohort.cohortId);
      }

      if (cohort.status === "SEALED") {
        return this.seal({
          cohortId: cohort.cohortId,
          sealedAt: cohort.sealedAt ?? new Date().toISOString(),
        });
      }

      return existing;
    }

    await this.#client.$transaction(async (tx) => {
      await tx.replayCohortItem.create({
        data: {
          id: cohortRowId(cohort.cohortId),
          cohortId: cohort.cohortId,
          schemaVersion: cohort.schemaVersion,
          status: cohort.status,
          specificationJson:
            cohort.specification as unknown as Prisma.InputJsonValue,
          eligibilityContractVersion: cohort.eligibilityContractVersion,
          sidecarSchemaVersion: cohort.sidecarSchemaVersion,
          createdAt: new Date(cohort.createdAt),
          membershipCreatedAt: new Date(cohort.membershipCreatedAt),
          sealedAt: cohort.sealedAt === undefined ? null : new Date(cohort.sealedAt),
          membershipDigestSha256: cohort.membershipDigestSha256,
          limitationsJson: cohort.limitations as unknown as Prisma.InputJsonValue,
        },
      });

      if (cohort.members.length > 0) {
        await tx.replayCohortMemberItem.createMany({
          data: cohort.members.map((member) => ({
            id: memberRowId(cohort.cohortId, member.historyId),
            cohortId: cohort.cohortId,
            historyId: member.historyId,
            matchId: member.matchId,
            position: member.position,
          })),
        });
      }
    });

    const created = await this.findByCohortId(cohort.cohortId);
    if (created === undefined) {
      throw new Error(`Failed to persist Replay Cohort "${cohort.cohortId}".`);
    }

    return created;
  }

  async findByCohortId(cohortId: string): Promise<ReplayCohort | undefined> {
    const row = await this.#client.replayCohortItem.findUnique({
      where: { cohortId },
      include: { members: true },
    });

    if (row === null) {
      return undefined;
    }

    return toDomain(row);
  }

  async seal(input: {
    readonly cohortId: string;
    readonly sealedAt: string;
  }): Promise<ReplayCohort> {
    const existingRow = await this.#client.replayCohortItem.findUnique({
      where: { cohortId: input.cohortId },
      include: { members: true },
    });

    if (existingRow === null) {
      throw new ReplayCohortNotFoundError(input.cohortId);
    }

    const existing = toDomain(existingRow);
    if (existing.status === "SEALED") {
      return existing;
    }

    await this.#client.replayCohortItem.update({
      where: { cohortId: input.cohortId },
      data: {
        status: "SEALED",
        sealedAt: new Date(input.sealedAt),
      },
    });

    const sealed = await this.findByCohortId(input.cohortId);
    if (sealed === undefined) {
      throw new ReplayCohortNotFoundError(input.cohortId);
    }

    return sealed;
  }
}
