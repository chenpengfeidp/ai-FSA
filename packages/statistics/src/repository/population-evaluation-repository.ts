import type { SealedCohortPopulationEvaluation } from "../domain/sealed-cohort-population-evaluation.js";

export interface PopulationEvaluationRepository {
  save(
    evaluation: SealedCohortPopulationEvaluation,
  ): Promise<SealedCohortPopulationEvaluation>;
  findByEvaluationRunId(
    evaluationRunId: string,
  ): Promise<SealedCohortPopulationEvaluation | undefined>;
  findByCohortId(
    cohortId: string,
  ): Promise<readonly SealedCohortPopulationEvaluation[]>;
}

export class ConflictPopulationEvaluationError extends Error {
  constructor(evaluationRunId: string) {
    super(
      `Population Evaluation "${evaluationRunId}" already exists with different content.`,
    );
    this.name = "ConflictPopulationEvaluationError";
  }
}
