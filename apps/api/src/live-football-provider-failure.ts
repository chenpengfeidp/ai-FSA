import { isFootballProviderError } from "@fas/provider-football";
import type { GenerateMatchReportResult } from "@fas/report";

/**
 * Map live football provider failures to the existing analysis error envelope.
 * Does not fabricate Evidence or continue the pipeline.
 */
export function liveFootballProviderFailure(
  error: unknown,
): GenerateMatchReportResult | undefined {
  if (!isFootballProviderError(error)) {
    return undefined;
  }

  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "IMPORT_FAILED",
      message: "Live football provider failed.",
      cause: Object.freeze({
        code: error.code,
        message: error.message,
      }),
    }),
  });
}
