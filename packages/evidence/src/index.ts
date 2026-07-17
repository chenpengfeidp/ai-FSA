export {
  createEvidence,
  EvidenceValidationError,
} from "./domain/evidence.js";
export type {
  CreateEvidenceInput,
  Evidence,
  EvidenceFreshness,
  EvidenceProvenance,
  EvidenceQuality,
} from "./domain/evidence.js";
export { DuplicateEvidenceError } from "./repository/evidence-repository.js";
export type { EvidenceRepository } from "./repository/evidence-repository.js";
export { InMemoryEvidenceRepository } from "./repository/in-memory-evidence-repository.js";
export { EvidenceService } from "./service/evidence-service.js";
