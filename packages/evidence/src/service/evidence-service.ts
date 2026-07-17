import {
  createEvidence,
  type CreateEvidenceInput,
  type Evidence,
} from "../domain/evidence.js";
import type { EvidenceRepository } from "../repository/evidence-repository.js";

export class EvidenceService {
  readonly #repository: EvidenceRepository;

  constructor(repository: EvidenceRepository) {
    this.#repository = repository;
  }

  findById(id: string): Evidence | undefined {
    return this.#repository.findById(id);
  }

  record(input: CreateEvidenceInput): Evidence {
    return this.#repository.save(createEvidence(input));
  }
}
