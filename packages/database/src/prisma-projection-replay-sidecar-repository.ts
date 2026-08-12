import {
  ConflictProjectionReplaySidecarError,
  computeProjectionReplaySidecarContentSha256,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  type ProjectionReplaySidecar,
  type ProjectionReplaySidecarRecord,
  type ProjectionReplaySidecarRepository,
  type SealedProjectionReplayContext,
} from "@fas/statistics";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { FAS_EVIDENCE_NAMESPACE, uuidV5 } from "./uuid-v5.js";

function sidecarIdToUuid(historyId: string): string {
  return uuidV5(`projection-replay-sidecar:${historyId}`, FAS_EVIDENCE_NAMESPACE);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFeatureBundleStatus(
  value: unknown,
): value is SealedProjectionReplayContext["featureBundleStatus"] {
  return (
    value === "blocked" ||
    value === "completed_nonempty" ||
    value === "degraded" ||
    value === "failed"
  );
}

function reviveContext(value: unknown): SealedProjectionReplayContext | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    typeof value.matchId !== "string" ||
    typeof value.featureModelVersion !== "string" ||
    typeof value.featureBundleChecksum !== "string" ||
    !isFeatureBundleStatus(value.featureBundleStatus) ||
    !Array.isArray(value.evidenceRefs) ||
    !Array.isArray(value.features) ||
    !Array.isArray(value.rules) ||
    typeof value.requiredEvidencePresentCount !== "number" ||
    typeof value.generatedAt !== "string"
  ) {
    return undefined;
  }

  return Object.freeze({
    matchId: value.matchId,
    featureModelVersion: value.featureModelVersion,
    featureBundleChecksum: value.featureBundleChecksum,
    featureBundleStatus: value.featureBundleStatus,
    evidenceRefs: Object.freeze(
      value.evidenceRefs.filter((ref): ref is string => typeof ref === "string"),
    ),
    features: Object.freeze(
      value.features.filter(isRecord).map((feature) =>
        Object.freeze({
          name: String(feature.name),
          value:
            typeof feature.value === "string" ||
            typeof feature.value === "number" ||
            typeof feature.value === "boolean" ||
            feature.value === null
              ? feature.value
              : JSON.stringify(feature.value),
        }),
      ),
    ),
    rules: Object.freeze(
      value.rules.filter(isRecord).map((rule) =>
        Object.freeze({
          ruleId: String(rule.ruleId),
          ruleName: String(rule.ruleName),
          status:
            rule.status as SealedProjectionReplayContext["rules"][number]["status"],
          channel:
            rule.channel as SealedProjectionReplayContext["rules"][number]["channel"],
          weight: Number(rule.weight),
          score: Number(rule.score),
        }),
      ),
    ),
    requiredEvidencePresentCount: value.requiredEvidencePresentCount,
    generatedAt: value.generatedAt,
    ...(typeof value.parameterArtifactId === "string"
      ? { parameterArtifactId: value.parameterArtifactId }
      : {}),
    ...(typeof value.parameterVersionLabel === "string"
      ? { parameterVersionLabel: value.parameterVersionLabel }
      : {}),
    ...(typeof value.parameterArtifactChecksum === "string"
      ? { parameterArtifactChecksum: value.parameterArtifactChecksum }
      : {}),
  });
}

export class PrismaProjectionReplaySidecarRepository
  implements ProjectionReplaySidecarRepository
{
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async save(input: {
    readonly historyId: string;
    readonly matchId: string;
    readonly context: SealedProjectionReplayContext;
  }): Promise<void> {
    const contextJson = input.context as unknown as Prisma.InputJsonValue;
    const contentSha256 = computeProjectionReplaySidecarContentSha256(input.context);
    const existing = await this.#client.projectionReplaySidecarItem.findUnique({
      where: { historyId: input.historyId },
    });

    if (existing !== null) {
      if (existing.contentSha256 === contentSha256) {
        return;
      }

      throw new ConflictProjectionReplaySidecarError(input.historyId);
    }

    await this.#client.projectionReplaySidecarItem.create({
      data: {
        id: sidecarIdToUuid(input.historyId),
        historyId: input.historyId,
        matchId: input.matchId,
        schemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
        contentSha256,
        contextJson,
        savedAt: new Date(),
      },
    });
  }

  async findByHistoryId(
    historyId: string,
  ): Promise<SealedProjectionReplayContext | undefined> {
    const record = await this.findRecordByHistoryId(historyId);
    return record?.context;
  }

  async findRecordByHistoryId(
    historyId: string,
  ): Promise<ProjectionReplaySidecarRecord | undefined> {
    const row = await this.#client.projectionReplaySidecarItem.findUnique({
      where: { historyId },
    });

    if (row === null) {
      return undefined;
    }

    const context = reviveContext(row.contextJson);

    if (context === undefined) {
      return undefined;
    }

    return Object.freeze({
      historyId: row.historyId,
      matchId: row.matchId,
      schemaVersion: row.schemaVersion,
      contentSha256: row.contentSha256,
      context,
    });
  }

  async buildSidecarMap(): Promise<ProjectionReplaySidecar> {
    const rows = await this.#client.projectionReplaySidecarItem.findMany();
    const sidecar: Record<string, SealedProjectionReplayContext> = {};

    for (const row of rows) {
      const context = reviveContext(row.contextJson);

      if (context === undefined) {
        continue;
      }

      sidecar[row.historyId] = context;
      sidecar[row.matchId] = context;
    }

    return Object.freeze(sidecar);
  }
}
