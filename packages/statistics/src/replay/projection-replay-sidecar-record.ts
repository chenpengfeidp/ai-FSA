import type { SealedProjectionReplayContext } from "./projection-replay-context.js";

/** Schema version written by P2K-B durable sidecar persistence. */
export const PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION =
  "projection-replay-sidecar.p2k.b" as const;

/**
 * Durable Projection Replay Sidecar row metadata (P2K-B/C).
 * Context remains the compact SealedProjectionReplayContext — never full Evidence.
 */
export interface ProjectionReplaySidecarRecord {
  readonly historyId: string;
  readonly matchId: string;
  readonly schemaVersion: string;
  readonly contentSha256: string;
  readonly context: SealedProjectionReplayContext;
}

export const SUPPORTED_PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSIONS = Object.freeze([
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
] as const);

export type SupportedProjectionReplaySidecarSchemaVersion =
  (typeof SUPPORTED_PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSIONS)[number];

export function isSupportedProjectionReplaySidecarSchemaVersion(
  schemaVersion: string,
): schemaVersion is SupportedProjectionReplaySidecarSchemaVersion {
  return (
    SUPPORTED_PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSIONS as readonly string[]
  ).includes(schemaVersion);
}

/** Canonical JSON used for contentSha256 (must match Prisma adapter). */
export function canonicalSidecarContextJson(
  context: SealedProjectionReplayContext,
): string {
  return JSON.stringify(context);
}
