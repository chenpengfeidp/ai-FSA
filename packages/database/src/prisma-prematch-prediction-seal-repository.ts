import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import {
  authenticatePrematchPredictionSeal,
  identitiesCanonicallyEqual,
  PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
  PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
  PREMATCH_SEAL_SOURCE_AUTHORITY,
  PrematchPredictionSealError,
  SealIdentityConflictError,
  type PrematchPredictionSeal,
  type PrematchPredictionSealRepository,
  type PrematchSealIdentity,
  type SealedPredictionInput,
} from "@fas/statistics";
import { FAS_EVIDENCE_NAMESPACE, uuidV5 } from "./uuid-v5.js";

function originalSealIdToUuid(originalSealId: string): string {
  return uuidV5(originalSealId, FAS_EVIDENCE_NAMESPACE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrismaUniqueConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

function reviveSeal(value: unknown): PrematchPredictionSeal | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.schemaVersion !== PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION) {
    return undefined;
  }

  if (
    typeof value.originalSealId !== "string" ||
    typeof value.sealedAt !== "string" ||
    typeof value.contentSha256 !== "string" ||
    !isRecord(value.sealIdentity)
  ) {
    return undefined;
  }

  const identityRecord = value.sealIdentity;
  const snapshot = identityRecord.predictionSnapshot;

  if (!isRecord(snapshot)) {
    return undefined;
  }

  try {
    const identity = Object.freeze({
      schemaVersion: PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
      matchId: String(identityRecord.matchId),
      homeTeam: String(identityRecord.homeTeam),
      awayTeam: String(identityRecord.awayTeam),
      competitionId: String(identityRecord.competitionId),
      competitionName: String(identityRecord.competitionName),
      season: String(identityRecord.season),
      kickoff: String(identityRecord.kickoff),
      analysisTime: String(identityRecord.analysisTime),
      analysisCutoff: String(identityRecord.analysisCutoff),
      predictionSnapshot: snapshot as unknown as SealedPredictionInput,
      featureModelVersion: String(identityRecord.featureModelVersion),
      ruleSetVersion: String(identityRecord.ruleSetVersion),
      projectionModelVersion: String(identityRecord.projectionModelVersion),
      projectionPolicyPin: String(identityRecord.projectionPolicyPin),
      ...(typeof identityRecord.parameterArtifactId === "string"
        ? { parameterArtifactId: identityRecord.parameterArtifactId }
        : {}),
      ...(typeof identityRecord.parameterVersionLabel === "string"
        ? { parameterVersionLabel: identityRecord.parameterVersionLabel }
        : {}),
      ...(typeof identityRecord.parameterArtifactChecksum === "string"
        ? { parameterArtifactChecksum: identityRecord.parameterArtifactChecksum }
        : {}),
      synthetic: false as const,
      historicalAuthenticity: true as const,
      provenanceClass: "A" as const,
      allowedUsage: Object.freeze([
        PREMATCH_SEAL_ALLOWED_USAGE_HISTORICAL_INTAKE,
      ]) as PrematchSealIdentity["allowedUsage"],
      sourceAuthority: PREMATCH_SEAL_SOURCE_AUTHORITY,
    }) as PrematchSealIdentity;

    const seal = Object.freeze({
      schemaVersion: PREMATCH_PREDICTION_SEAL_SCHEMA_VERSION,
      originalSealId: value.originalSealId,
      sealedAt: value.sealedAt,
      sealIdentity: identity,
      contentSha256: value.contentSha256,
    }) as PrematchPredictionSeal;

    authenticatePrematchPredictionSeal(seal);
    return seal;
  } catch {
    return undefined;
  }
}

export class PrismaPrematchPredictionSealRepository
  implements PrematchPredictionSealRepository
{
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async save(seal: PrematchPredictionSeal): Promise<PrematchPredictionSeal> {
    const existing = await this.#client.prematchPredictionSealItem.findUnique({
      where: { originalSealId: seal.originalSealId },
    });

    if (existing !== null) {
      return this.#resolveExisting(existing.recordJson, seal);
    }

    try {
      await this.#client.prematchPredictionSealItem.create({
        data: {
          id: originalSealIdToUuid(seal.originalSealId),
          originalSealId: seal.originalSealId,
          matchId: seal.sealIdentity.matchId,
          homeTeam: seal.sealIdentity.homeTeam,
          awayTeam: seal.sealIdentity.awayTeam,
          competitionId: seal.sealIdentity.competitionId,
          season: seal.sealIdentity.season,
          kickoffAt: new Date(seal.sealIdentity.kickoff),
          schemaVersion: seal.schemaVersion,
          sealedAt: new Date(seal.sealedAt),
          contentSha256: seal.contentSha256,
          recordJson: seal as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (!isPrismaUniqueConflict(error)) {
        throw error;
      }

      const raced = await this.#client.prematchPredictionSealItem.findUnique({
        where: { originalSealId: seal.originalSealId },
      });

      if (raced === null) {
        throw new PrematchPredictionSealError(
          "SEAL_IDENTITY_CONFLICT",
          "Concurrent PRE_MATCH seal write could not be resolved.",
        );
      }

      return this.#resolveExisting(raced.recordJson, seal);
    }

    return seal;
  }

  async findByOriginalSealId(
    originalSealId: string,
  ): Promise<PrematchPredictionSeal | undefined> {
    const row = await this.#client.prematchPredictionSealItem.findUnique({
      where: { originalSealId },
    });

    return row === null ? undefined : reviveSeal(row.recordJson);
  }

  async findByMatch(matchId: string): Promise<readonly PrematchPredictionSeal[]> {
    const rows = await this.#client.prematchPredictionSealItem.findMany({
      where: { matchId },
      orderBy: { sealedAt: "asc" },
    });

    return Object.freeze(
      rows
        .map((row) => reviveSeal(row.recordJson))
        .filter((seal): seal is PrematchPredictionSeal => seal !== undefined),
    );
  }

  #resolveExisting(
    recordJson: Prisma.JsonValue,
    incoming: PrematchPredictionSeal,
  ): PrematchPredictionSeal {
    const prior = reviveSeal(recordJson);

    if (prior === undefined) {
      throw new SealIdentityConflictError(incoming.originalSealId);
    }

    if (identitiesCanonicallyEqual(prior.sealIdentity, incoming.sealIdentity)) {
      return prior;
    }

    throw new SealIdentityConflictError(incoming.originalSealId);
  }
}
