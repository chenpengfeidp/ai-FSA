import type { SealedCohortPopulationEvaluation } from "../domain/sealed-cohort-population-evaluation.js";
import {
  ConflictPopulationEvaluationError,
  type PopulationEvaluationRepository,
} from "./population-evaluation-repository.js";

function sameEvaluation(
  left: SealedCohortPopulationEvaluation,
  right: SealedCohortPopulationEvaluation,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class InMemoryPopulationEvaluationRepository
  implements PopulationEvaluationRepository
{
  readonly #byId = new Map<string, SealedCohortPopulationEvaluation>();

  async save(
    evaluation: SealedCohortPopulationEvaluation,
  ): Promise<SealedCohortPopulationEvaluation> {
    const existing = this.#byId.get(evaluation.evaluationRunId);
    if (existing !== undefined) {
      if (sameEvaluation(existing, evaluation)) {
        return existing;
      }
      throw new ConflictPopulationEvaluationError(evaluation.evaluationRunId);
    }

    const frozen = Object.freeze({
      ...evaluation,
      comparisons: Object.freeze([...evaluation.comparisons]),
      limitations: Object.freeze([...evaluation.limitations]),
      coverage: Object.freeze({ ...evaluation.coverage }),
      winnerBreakdown: Object.freeze({ ...evaluation.winnerBreakdown }),
    });
    this.#byId.set(evaluation.evaluationRunId, frozen);
    return frozen;
  }

  async findByEvaluationRunId(
    evaluationRunId: string,
  ): Promise<SealedCohortPopulationEvaluation | undefined> {
    return this.#byId.get(evaluationRunId);
  }

  async findByCohortId(
    cohortId: string,
  ): Promise<readonly SealedCohortPopulationEvaluation[]> {
    return Object.freeze(
      [...this.#byId.values()]
        .filter((evaluation) => evaluation.cohortId === cohortId)
        .sort((left, right) =>
          left.evaluationRunId < right.evaluationRunId
            ? -1
            : left.evaluationRunId > right.evaluationRunId
              ? 1
              : 0,
        ),
    );
  }
}
