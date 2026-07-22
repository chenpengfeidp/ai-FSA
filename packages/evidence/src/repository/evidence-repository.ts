import type { Evidence } from "../domain/evidence.js";

export interface EvidenceRepository {
  findAll(): Promise<readonly Evidence[]>;
  findById(id: string): Promise<Evidence | undefined>;
  /** Domain MatchId string (`matches.external_key` under postgres persistence). */
  findByMatch(
    matchId: NonNullable<Evidence["matchId"]>,
  ): Promise<readonly Evidence[]>;
  save(evidence: Evidence): Promise<Evidence>;
}

export class DuplicateEvidenceError extends Error {
  constructor(id: string) {
    super(`Evidence "${id}" already exists.`);
    this.name = "DuplicateEvidenceError";
  }
}
