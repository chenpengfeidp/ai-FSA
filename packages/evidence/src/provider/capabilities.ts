/**
 * Declared Football-oriented capabilities for Provider Registry queries (F1.1A).
 * Declaring a capability does not mean import/ingestion is implemented.
 */
export type ProviderCapabilityKind =
  | "coach"
  | "injury"
  | "lineup"
  | "player"
  | "recent_form"
  | "referee"
  | "venue";

export const PROVIDER_CAPABILITY_KINDS: readonly ProviderCapabilityKind[] =
  Object.freeze([
    "player",
    "coach",
    "referee",
    "venue",
    "lineup",
    "injury",
    "recent_form",
  ]);

export interface ProviderCapabilityDeclaration {
  readonly kind: ProviderCapabilityKind;
  /** Provider family can supply this observation kind in principle. */
  readonly supported: boolean;
  /** True only when FAS ingest for this capability is wired (F1.1A: all false except recent_form via existing TEAM_FORM). */
  readonly ingestImplemented: boolean;
  readonly notes?: string;
}
