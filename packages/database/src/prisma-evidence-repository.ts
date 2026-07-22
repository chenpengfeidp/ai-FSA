import { createHash, randomUUID } from "node:crypto";

import type { JsonObject } from "@fas/domain";
import {
  createEvidence,
  DuplicateEvidenceError,
  type Evidence,
  type EvidenceFreshness,
  type EvidenceProviderCategory,
  type EvidenceProvenance,
  type EvidenceQuality,
  type EvidenceRepository,
  type EvidenceSourceConfidence,
  type EvidenceType,
  resolveProviderFromSource,
} from "@fas/evidence";
import { createMatchId } from "@fas/match";
import { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { evidenceIdToUuid } from "./uuid-v5.js";

const VALUE_SCHEMA_VERSION = 1;
const NORMALIZER_VERSION = "fas-evidence-persistence/v1";
const PARSER_VERSION = "fas-evidence-persistence/v1";
const VERTICAL_SLICE_COMPETITION_KEY = "fas:vertical-slice";
const VERTICAL_SLICE_SEASON_NAME = "2026";

interface DomainEnvelope {
  readonly schema_version: number;
  readonly domain: {
    readonly id: string;
    readonly type: EvidenceType;
    readonly providerId: string;
    readonly source: string;
    readonly sourceId: string;
    readonly freshness: EvidenceFreshness;
    readonly confidence: EvidenceSourceConfidence;
    readonly quality: EvidenceQuality;
    readonly provenance: EvidenceProvenance;
    readonly collectedAt: string;
    readonly eventTime: string;
    readonly timestamp: string;
    readonly matchId?: string;
  };
  readonly payload: JsonObject;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function mapEvidenceType(type: EvidenceType): "fact" | "market_signal" {
  return type === "ODDS" ? "market_signal" : "fact";
}

function mapQualityStatus(quality: EvidenceQuality): "valid" | "rejected" {
  return quality === "rejected" ? "rejected" : "valid";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEnvelope(value: unknown): DomainEnvelope | undefined {
  if (!isRecord(value) || !isRecord(value.domain) || !isRecord(value.payload)) {
    return undefined;
  }

  const domain = value.domain;
  const provenance = domain.provenance;

  if (
    typeof value.schema_version !== "number" ||
    typeof domain.id !== "string" ||
    typeof domain.type !== "string" ||
    typeof domain.source !== "string" ||
    typeof domain.sourceId !== "string" ||
    typeof domain.freshness !== "string" ||
    typeof domain.quality !== "string" ||
    typeof domain.collectedAt !== "string" ||
    typeof domain.eventTime !== "string" ||
    !isRecord(provenance) ||
    typeof provenance.collector !== "string" ||
    typeof provenance.method !== "string"
  ) {
    return undefined;
  }

  const matchId = typeof domain.matchId === "string" ? domain.matchId : undefined;
  const binding = resolveProviderFromSource(
    domain.source,
    typeof domain.providerId === "string" ? domain.providerId : undefined,
    typeof provenance.category === "string"
      ? (provenance.category as EvidenceProviderCategory)
      : undefined,
  );
  const confidence =
    typeof domain.confidence === "string"
      ? (domain.confidence as EvidenceSourceConfidence)
      : "unknown";
  const timestamp =
    typeof domain.timestamp === "string" ? domain.timestamp : domain.collectedAt;
  const providerId =
    typeof provenance.providerId === "string" && provenance.providerId.length > 0
      ? provenance.providerId
      : binding.providerId;

  return {
    schema_version: value.schema_version,
    domain: {
      id: domain.id,
      type: domain.type as EvidenceType,
      providerId,
      source: domain.source,
      sourceId: domain.sourceId,
      freshness: domain.freshness as EvidenceFreshness,
      confidence,
      quality: domain.quality as EvidenceQuality,
      provenance: {
        collector: provenance.collector,
        method: provenance.method,
        providerId,
        category: binding.category,
      },
      collectedAt: domain.collectedAt,
      eventTime: domain.eventTime,
      timestamp,
      ...(matchId === undefined ? {} : { matchId }),
    },
    payload: value.payload as JsonObject,
  };
}

function toDomainEvidence(
  envelope: DomainEnvelope,
  matchExternalKey: string | null,
): Evidence {
  const matchId =
    matchExternalKey !== null && matchExternalKey.length > 0
      ? createMatchId(matchExternalKey)
      : envelope.domain.matchId !== undefined
        ? createMatchId(envelope.domain.matchId)
        : undefined;

  return createEvidence({
    id: envelope.domain.id,
    providerId: envelope.domain.providerId,
    source: envelope.domain.source,
    sourceId: envelope.domain.sourceId,
    type: envelope.domain.type,
    ...(matchId === undefined ? {} : { matchId }),
    collectedAt: envelope.domain.collectedAt,
    eventTime: envelope.domain.eventTime,
    timestamp: envelope.domain.timestamp,
    freshness: envelope.domain.freshness,
    confidence: envelope.domain.confidence,
    quality: envelope.domain.quality,
    provenance: envelope.domain.provenance,
    payload: envelope.payload,
  });
}

export class PrismaEvidenceRepository implements EvidenceRepository {
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async findAll(): Promise<readonly Evidence[]> {
    const rows = await this.#client.evidenceItem.findMany({
      include: { match: true },
      orderBy: { observedAt: "desc" },
    });

    return Object.freeze(
      rows.flatMap((row) => {
        const envelope = parseEnvelope(row.valueJson);
        return envelope === undefined
          ? []
          : [toDomainEvidence(envelope, row.match.externalKey)];
      }),
    );
  }

  async findById(id: string): Promise<Evidence | undefined> {
    const row = await this.#client.evidenceItem.findUnique({
      where: { id: evidenceIdToUuid(id) },
      include: { match: true },
    });

    if (row === null) {
      return undefined;
    }

    const envelope = parseEnvelope(row.valueJson);
    return envelope === undefined
      ? undefined
      : toDomainEvidence(envelope, row.match.externalKey);
  }

  async findByMatch(
    matchId: NonNullable<Evidence["matchId"]>,
  ): Promise<readonly Evidence[]> {
    const rows = await this.#client.evidenceItem.findMany({
      where: { match: { externalKey: matchId } },
      include: { match: true },
      orderBy: { observedAt: "desc" },
    });

    return Object.freeze(
      rows.flatMap((row) => {
        const envelope = parseEnvelope(row.valueJson);
        return envelope === undefined
          ? []
          : [toDomainEvidence(envelope, row.match.externalKey)];
      }),
    );
  }

  async save(evidence: Evidence): Promise<Evidence> {
    if (evidence.matchId === undefined) {
      throw new Error("PostgreSQL Evidence persistence requires Evidence.matchId.");
    }

    const id = evidenceIdToUuid(evidence.id);
    const existing = await this.#client.evidenceItem.findUnique({
      where: { id },
    });

    if (existing !== null) {
      throw new DuplicateEvidenceError(evidence.id);
    }

    const matchId = await this.#ensureMatch(evidence.matchId);
    const dataSourceId = await this.#ensureDataSource(evidence.source);
    const envelope: DomainEnvelope = {
      schema_version: VALUE_SCHEMA_VERSION,
      domain: {
        id: evidence.id,
        type: evidence.type,
        providerId: evidence.providerId,
        source: evidence.source,
        sourceId: evidence.sourceId,
        freshness: evidence.freshness,
        confidence: evidence.confidence,
        quality: evidence.quality,
        provenance: evidence.provenance,
        collectedAt: evidence.collectedAt,
        eventTime: evidence.eventTime,
        timestamp: evidence.timestamp,
        matchId: evidence.matchId,
      },
      payload: evidence.payload,
    } as const;
    const valueJson = envelope as unknown as Prisma.InputJsonValue;
    const contentSha256 = sha256Hex(JSON.stringify(envelope));
    const payloadSha256 = sha256Hex(JSON.stringify(evidence.payload));
    const observedAt = new Date(evidence.eventTime);
    const retrievedAt = new Date(evidence.collectedAt);
    const sourceRecordId = randomUUID();

    try {
      await this.#client.$transaction(async (tx) => {
        await tx.sourceRecord.create({
          data: {
            id: sourceRecordId,
            dataSourceId,
            matchId,
            externalRecordId: evidence.sourceId,
            observedAt,
            retrievedAt,
            payloadSha256,
            parserVersion: PARSER_VERSION,
            status: "parsed",
          },
        });

        await tx.evidenceItem.create({
          data: {
            id,
            matchId,
            sourceRecordId,
            evidenceType: mapEvidenceType(evidence.type),
            subjectType: "match",
            subjectId: matchId,
            metricKey: `kind:${evidence.type}`,
            valueJson,
            observedAt,
            qualityStatus: mapQualityStatus(evidence.quality),
            normalizerVersion: NORMALIZER_VERSION,
            contentSha256,
          },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new DuplicateEvidenceError(evidence.id);
      }

      throw error;
    }

    return evidence;
  }

  async #ensureDataSource(sourceName: string): Promise<string> {
    const existing = await this.#client.dataSource.findUnique({
      where: { name: sourceName },
    });

    if (existing !== null) {
      return existing.id;
    }

    const now = new Date();

    try {
      const created = await this.#client.dataSource.create({
        data: {
          id: randomUUID(),
          name: sourceName,
          sourceClass: "statistical",
          active: true,
          createdAt: now,
          updatedAt: now,
        },
      });
      return created.id;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await this.#client.dataSource.findUnique({
          where: { name: sourceName },
        });
        if (raced !== null) {
          return raced.id;
        }
      }

      throw error;
    }
  }

  async #ensureSeasonId(): Promise<string> {
    const now = new Date();
    let competition = await this.#client.competition.findUnique({
      where: { externalKey: VERTICAL_SLICE_COMPETITION_KEY },
    });

    if (competition === null) {
      try {
        competition = await this.#client.competition.create({
          data: {
            id: randomUUID(),
            name: "Vertical Slice",
            competitionType: "league",
            externalKey: VERTICAL_SLICE_COMPETITION_KEY,
            createdAt: now,
            updatedAt: now,
          },
        });
      } catch (error: unknown) {
        if (
          !(
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          )
        ) {
          throw error;
        }

        competition = await this.#client.competition.findUnique({
          where: { externalKey: VERTICAL_SLICE_COMPETITION_KEY },
        });
        if (competition === null) {
          throw error;
        }
      }
    }

    const existingSeason = await this.#client.season.findUnique({
      where: {
        competitionId_name: {
          competitionId: competition.id,
          name: VERTICAL_SLICE_SEASON_NAME,
        },
      },
    });

    if (existingSeason !== null) {
      return existingSeason.id;
    }

    try {
      const season = await this.#client.season.create({
        data: {
          id: randomUUID(),
          competitionId: competition.id,
          name: VERTICAL_SLICE_SEASON_NAME,
          startsOn: new Date("2026-01-01"),
          endsOn: new Date("2026-12-31"),
        },
      });
      return season.id;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await this.#client.season.findUnique({
          where: {
            competitionId_name: {
              competitionId: competition.id,
              name: VERTICAL_SLICE_SEASON_NAME,
            },
          },
        });
        if (raced !== null) {
          return raced.id;
        }
      }

      throw error;
    }
  }

  async #ensureMatch(externalKey: string): Promise<string> {
    const existing = await this.#client.match.findUnique({
      where: { externalKey },
    });

    if (existing !== null) {
      return existing.id;
    }

    const now = new Date();
    const seasonId = await this.#ensureSeasonId();
    const matchId = randomUUID();
    const homeTeamId = randomUUID();
    const awayTeamId = randomUUID();

    try {
      await this.#client.$transaction(async (tx) => {
        await tx.team.createMany({
          data: [
            {
              id: homeTeamId,
              name: "Home Placeholder",
              externalKey: `${externalKey}:home`,
              createdAt: now,
              updatedAt: now,
            },
            {
              id: awayTeamId,
              name: "Away Placeholder",
              externalKey: `${externalKey}:away`,
              createdAt: now,
              updatedAt: now,
            },
          ],
        });

        await tx.match.create({
          data: {
            id: matchId,
            seasonId,
            externalKey,
            kickoffAt: now,
            sourceTimezone: "UTC",
            status: "scheduled",
            createdAt: now,
            updatedAt: now,
          },
        });

        await tx.matchParticipant.createMany({
          data: [
            { matchId, teamId: homeTeamId, role: "home" },
            { matchId, teamId: awayTeamId, role: "away" },
          ],
        });
      });

      return matchId;
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const raced = await this.#client.match.findUnique({
          where: { externalKey },
        });
        if (raced !== null) {
          return raced.id;
        }
      }

      throw error;
    }
  }
}
