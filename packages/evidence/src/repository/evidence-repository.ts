import type { Evidence } from "../domain/evidence.js";

export interface EvidenceRepository {
  findAll(): Promise<readonly Evidence[]>;
  findById(id: string): Promise<Evidence | undefined>;
  save(evidence: Evidence): Promise<Evidence>;
}

export class DuplicateEvidenceError extends Error {
  constructor(id: string) {
    super(`Evidence "${id}" already exists.`);
    this.name = "DuplicateEvidenceError";
  }
}
