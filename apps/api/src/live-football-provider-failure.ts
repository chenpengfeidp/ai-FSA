export type LiveFootballProviderFailureResult = Readonly<{
  ok: false;
  error: Readonly<{
    code: "IMPORT_FAILED";
    message: string;
    cause: Readonly<{
      code: string;
      message: string;
    }>;
  }>;
}>;

function readFootballProviderError(
  error: unknown,
): Readonly<{ code: string; message: string }> | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    readonly name?: unknown;
    readonly code?: unknown;
    readonly message?: unknown;
  };

  if (candidate.name !== "FootballProviderError") {
    return undefined;
  }

  if (typeof candidate.code !== "string" || typeof candidate.message !== "string") {
    return undefined;
  }

  return Object.freeze({
    code: candidate.code,
    message: candidate.message,
  });
}

/**
 * Map live football provider failures to the existing analysis error envelope.
 * Does not fabricate Evidence or continue the pipeline.
 *
 * Uses structural detection (not a package import) to avoid Nest DI circular
 * import cycles through `@fas/provider-football` during EvidenceModule boot.
 */
export function liveFootballProviderFailure(
  error: unknown,
): LiveFootballProviderFailureResult | undefined {
  const providerError = readFootballProviderError(error);

  if (providerError === undefined) {
    return undefined;
  }

  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "IMPORT_FAILED" as const,
      message: "Live football provider failed.",
      cause: Object.freeze({
        code: providerError.code,
        message: providerError.message,
      }),
    }),
  });
}
