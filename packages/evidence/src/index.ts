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
  EvidenceSourceConfidence,
  EvidenceType,
} from "./domain/evidence.js";
export type {
  ProviderCapabilityDeclaration,
  ProviderCapabilityKind,
} from "./provider/capabilities.js";
export { PROVIDER_CAPABILITY_KINDS } from "./provider/capabilities.js";
export type { EvidenceProviderCategory } from "./provider/categories.js";
export { EVIDENCE_PROVIDER_CATEGORIES } from "./provider/categories.js";
export {
  createDefaultEvidenceProviderRegistry,
  getDefaultEvidenceProviderRegistry,
} from "./provider/default-registry.js";
export { EvidenceProviderRegistry } from "./provider/registry.js";
export type { EvidenceProviderRegistration } from "./provider/registry.js";
export { resolveProviderFromSource } from "./provider/resolve-provider.js";
export type { ResolvedProviderBinding } from "./provider/resolve-provider.js";
export { DuplicateEvidenceError } from "./repository/evidence-repository.js";
export type { EvidenceRepository } from "./repository/evidence-repository.js";
export { InMemoryEvidenceRepository } from "./repository/in-memory-evidence-repository.js";
export { EvidenceService } from "./service/evidence-service.js";
