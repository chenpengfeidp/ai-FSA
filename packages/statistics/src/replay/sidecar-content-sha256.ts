import { createHash } from "node:crypto";

import type { SealedProjectionReplayContext } from "./projection-replay-context.js";
import { canonicalSidecarContextJson } from "./projection-replay-sidecar-record.js";

/**
 * SHA-256 hex of canonical sidecar context JSON.
 * Must stay identical to `@fas/database` PrismaProjectionReplaySidecarRepository.
 */
export function computeProjectionReplaySidecarContentSha256(
  context: SealedProjectionReplayContext,
): string {
  return createHash("sha256")
    .update(canonicalSidecarContextJson(context), "utf8")
    .digest("hex");
}
