import type { Evidence } from "../domain/evidence.js";

export interface EvidenceRepository {
  findById(id: string): Evidence | undefined;
  save(evidence: Evidence): Evidence;
}

export class DuplicateEvidenceError extends Error {
  constructor(id: string) {
    super(`Evidence "${id}" already exists.`);
    this.name = "DuplicateEvidenceError";
  }
}
