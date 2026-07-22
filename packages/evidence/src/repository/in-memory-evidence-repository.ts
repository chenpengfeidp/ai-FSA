import type { Evidence } from "../domain/evidence.js";
import {
  DuplicateEvidenceError,
  type EvidenceRepository,
} from "./evidence-repository.js";

export class InMemoryEvidenceRepository implements EvidenceRepository {
  readonly #evidenceById = new Map<string, Evidence>();

  findAll(): Promise<readonly Evidence[]> {
    return Promise.resolve(Object.freeze([...this.#evidenceById.values()]));
  }

  findById(id: string): Promise<Evidence | undefined> {
    return Promise.resolve(this.#evidenceById.get(id));
  }

  findByMatch(
    matchId: NonNullable<Evidence["matchId"]>,
  ): Promise<readonly Evidence[]> {
    return Promise.resolve(
      Object.freeze(
        [...this.#evidenceById.values()].filter(
          (evidence) => evidence.matchId === matchId,
        ),
      ),
    );
  }

  save(evidence: Evidence): Promise<Evidence> {
    if (this.#evidenceById.has(evidence.id)) {
      return Promise.reject(new DuplicateEvidenceError(evidence.id));
    }

    this.#evidenceById.set(evidence.id, evidence);
    return Promise.resolve(evidence);
  }
}
