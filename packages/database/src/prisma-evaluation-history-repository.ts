import { createHash } from "node:crypto";

import {
  createEvaluationHistoryRecord,
  type CreateEvaluationHistoryRecordInput,
  DuplicateEvaluationHistoryError,
  type EvaluationHistoryQuery,
  type EvaluationHistoryRecord,
  type EvaluationHistoryRepository,
} from "@fas/statistics";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { FAS_EVIDENCE_NAMESPACE, uuidV5 } from "./uuid-v5.js";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function historyIdToUuid(historyId: string): string {
  return uuidV5(historyId, FAS_EVIDENCE_NAMESPACE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function reviveHistoryRecord(value: unknown): EvaluationHistoryRecord | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { schemaVersion: _schemaVersion, ...rest } = value;

  try {
    return createEvaluationHistoryRecord(
      rest as unknown as CreateEvaluationHistoryRecordInput,
    );
  } catch {
    return undefined;
  }
}

export class PrismaEvaluationHistoryRepository
  implements EvaluationHistoryRepository
{
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async save(record: EvaluationHistoryRecord): Promise<EvaluationHistoryRecord> {
    const existing = await this.#client.evaluationHistoryItem.findUnique({
      where: { historyId: record.historyId },
    });

    if (existing !== null) {
      const prior = reviveHistoryRecord(existing.recordJson);

      if (prior !== undefined && prior.checksum === record.checksum) {
        return prior;
      }

      throw new DuplicateEvaluationHistoryError(record.historyId);
    }

    await this.#client.evaluationHistoryItem.create({
      data: {
        id: historyIdToUuid(record.historyId),
        historyId: record.historyId,
        matchId: record.matchId,
        competitionId: record.competitionId ?? null,
        competitionName: record.competitionName ?? null,
        season: record.season,
        matchDate: new Date(record.matchDate),
        homeTeam: record.homeTeam,
        awayTeam: record.awayTeam,
        featureModelVersion: record.featureModelVersion,
        ruleSetVersion: record.ruleSetVersion,
        projectionModelVersion: record.projectionModelVersion,
        evaluationModelVersion: record.evaluationModelVersion,
        recordedAt: new Date(record.recordedAt),
        contentSha256: sha256Hex(JSON.stringify(record)),
        recordJson: record as unknown as Prisma.InputJsonValue,
      },
    });

    return record;
  }

  async findByHistoryId(
    historyId: string,
  ): Promise<EvaluationHistoryRecord | undefined> {
    const row = await this.#client.evaluationHistoryItem.findUnique({
      where: { historyId },
    });

    return row === null ? undefined : reviveHistoryRecord(row.recordJson);
  }

  async findByMatch(matchId: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ matchId });
  }

  async findByCompetition(
    competitionId: string,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ competitionId });
  }

  async findBySeason(season: string): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ season });
  }

  async findByDateRange(
    fromMatchDate: string,
    toMatchDate: string,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    return this.query({ fromMatchDate, toMatchDate });
  }

  async query(
    filter: EvaluationHistoryQuery,
  ): Promise<readonly EvaluationHistoryRecord[]> {
    const rows = await this.#client.evaluationHistoryItem.findMany({
      where: {
        ...(filter.matchId === undefined ? {} : { matchId: filter.matchId }),
        ...(filter.competitionId === undefined
          ? {}
          : { competitionId: filter.competitionId }),
        ...(filter.competitionName === undefined
          ? {}
          : { competitionName: filter.competitionName }),
        ...(filter.season === undefined ? {} : { season: filter.season }),
        ...(filter.fromMatchDate === undefined && filter.toMatchDate === undefined
          ? {}
          : {
              matchDate: {
                ...(filter.fromMatchDate === undefined
                  ? {}
                  : { gte: new Date(filter.fromMatchDate) }),
                ...(filter.toMatchDate === undefined
                  ? {}
                  : { lte: new Date(filter.toMatchDate) }),
              },
            }),
      },
      orderBy: { matchDate: "desc" },
    });

    return Object.freeze(
      rows
        .map((row) => reviveHistoryRecord(row.recordJson))
        .filter((record): record is EvaluationHistoryRecord => record !== undefined),
    );
  }
}
