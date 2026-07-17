import type { Evidence } from "../domain/evidence.js";
import {
  DuplicateEvidenceError,
  type EvidenceRepository,
} from "./evidence-repository.js";

export class InMemoryEvidenceRepository implements EvidenceRepository {
  readonly #evidenceById = new Map<string, Evidence>();

  findAll(): readonly Evidence[] {
    return Object.freeze([...this.#evidenceById.values()]);
  }

  findById(id: string): Evidence | undefined {
    return this.#evidenceById.get(id);
  }

  save(evidence: Evidence): Evidence {
    if (this.#evidenceById.has(evidence.id)) {
      throw new DuplicateEvidenceError(evidence.id);
    }

    this.#evidenceById.set(evidence.id, evidence);
    return evidence;
  }
}
