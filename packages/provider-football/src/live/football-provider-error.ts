export type FootballProviderErrorCode =
  | "HTTP_ERROR"
  | "INCOMPLETE_RESPONSE"
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "TIMEOUT";

/**
 * Typed live football provider failure.
 * Callers must not fabricate Evidence or continue with incomplete bundles.
 */
export class FootballProviderError extends Error {
  readonly code: FootballProviderErrorCode;
  readonly status: number | undefined;

  constructor(code: FootballProviderErrorCode, message: string, status?: number) {
    super(message);
    this.name = "FootballProviderError";
    this.code = code;
    this.status = status;
  }
}

export function isFootballProviderError(
  error: unknown,
): error is FootballProviderError {
  return error instanceof FootballProviderError;
}
