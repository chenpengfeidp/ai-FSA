import {
  ConflictPopulationEvaluationError,
  SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION,
  type PopulationEvaluationRepository,
  type SealedCohortPopulationEvaluation,
} from "@fas/statistics";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { FAS_EVIDENCE_NAMESPACE, uuidV5 } from "./uuid-v5.js";

function evaluationRowId(evaluationRunId: string): string {
  return uuidV5(`population-evaluation:${evaluationRunId}`, FAS_EVIDENCE_NAMESPACE);
}

function sameEvaluation(
  left: SealedCohortPopulationEvaluation,
  right: SealedCohortPopulationEvaluation,
): boolean {
  // Postgres JSON omits `undefined` keys and may reorder object keys.
  // Checksum is the durable content identity computed by P2K-G.
  return (
    left.evaluationRunId === right.evaluationRunId &&
    left.checksum === right.checksum &&
    left.cohortId === right.cohortId &&
    left.membershipDigestSha256 === right.membershipDigestSha256 &&
    left.baselineReplayRunId === right.baselineReplayRunId &&
    left.candidateReplayRunId === right.candidateReplayRunId
  );
}

function reviveEvaluation(value: unknown): SealedCohortPopulationEvaluation {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid Population Evaluation JSON payload.");
  }

  const evaluation = value as SealedCohortPopulationEvaluation;
  if (
    evaluation.schemaVersion !== SEALED_COHORT_POPULATION_EVALUATION_SCHEMA_VERSION
  ) {
    throw new Error(
      `Unsupported Population Evaluation schemaVersion: ${String(evaluation.schemaVersion)}`,
    );
  }

  return Object.freeze({
    ...evaluation,
    comparisons: Object.freeze([...(evaluation.comparisons ?? [])]),
    limitations: Object.freeze([...(evaluation.limitations ?? [])]),
    coverage: Object.freeze({ ...evaluation.coverage }),
    winnerBreakdown: Object.freeze({ ...evaluation.winnerBreakdown }),
  });
}

export class PrismaPopulationEvaluationRepository
  implements PopulationEvaluationRepository
{
  readonly #client: PrismaClient;

  constructor(client: PrismaClient) {
    this.#client = client;
  }

  async save(
    evaluation: SealedCohortPopulationEvaluation,
  ): Promise<SealedCohortPopulationEvaluation> {
    const existing = await this.#client.populationEvaluationItem.findUnique({
      where: { evaluationRunId: evaluation.evaluationRunId },
    });

    if (existing !== null) {
      const revived = reviveEvaluation(existing.evaluationJson);
      if (sameEvaluation(revived, evaluation)) {
        return revived;
      }
      throw new ConflictPopulationEvaluationError(evaluation.evaluationRunId);
    }

    await this.#client.populationEvaluationItem.create({
      data: {
        id: evaluationRowId(evaluation.evaluationRunId),
        evaluationRunId: evaluation.evaluationRunId,
        cohortId: evaluation.cohortId,
        membershipDigestSha256: evaluation.membershipDigestSha256,
        baselineReplayRunId: evaluation.baselineReplayRunId,
        candidateReplayRunId: evaluation.candidateReplayRunId,
        schemaVersion: evaluation.schemaVersion,
        createdAt: new Date(evaluation.createdAt),
        checksum: evaluation.checksum,
        evaluationJson: evaluation as unknown as Prisma.InputJsonValue,
      },
    });

    const created = await this.findByEvaluationRunId(evaluation.evaluationRunId);
    if (created === undefined) {
      throw new Error(
        `Failed to persist Population Evaluation "${evaluation.evaluationRunId}".`,
      );
    }

    return created;
  }

  async findByEvaluationRunId(
    evaluationRunId: string,
  ): Promise<SealedCohortPopulationEvaluation | undefined> {
    const row = await this.#client.populationEvaluationItem.findUnique({
      where: { evaluationRunId },
    });
    if (row === null) {
      return undefined;
    }
    return reviveEvaluation(row.evaluationJson);
  }

  async findByCohortId(
    cohortId: string,
  ): Promise<readonly SealedCohortPopulationEvaluation[]> {
    const rows = await this.#client.populationEvaluationItem.findMany({
      where: { cohortId },
      orderBy: { evaluationRunId: "asc" },
    });
    return Object.freeze(rows.map((row) => reviveEvaluation(row.evaluationJson)));
  }
}
