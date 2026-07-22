import {
  FootballProviderError,
  type FootballProviderErrorCode,
} from "./football-provider-error.js";

export type FootballHttpFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export interface LiveFootballHttpOptions {
  readonly apiKey: string;
  readonly fetchImpl?: FootballHttpFetch;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_RETRIES = 2;

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Authenticated JSON GET against API-Sports with timeout + bounded retries.
 * Failures throw FootballProviderError — never empty success.
 */
export async function fetchFootballJson(
  url: string,
  options: LiveFootballHttpOptions,
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const attempts = maxRetries + 1;
  let lastError: FootballProviderError | undefined;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: Object.freeze({
          Accept: "application/json",
          "x-apisports-key": options.apiKey,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new FootballProviderError(
          "HTTP_ERROR",
          `Live football HTTP ${String(response.status)} for ${url}.`,
          response.status,
        );

        if (!isRetryableStatus(response.status) || attempt + 1 >= attempts) {
          throw error;
        }

        lastError = error;
        await delay(100 * 2 ** attempt);
        continue;
      }

      try {
        return await response.json();
      } catch {
        throw new FootballProviderError(
          "INVALID_RESPONSE",
          `Live football response was not valid JSON for ${url}.`,
          response.status,
        );
      }
    } catch (error: unknown) {
      if (error instanceof FootballProviderError) {
        throw error;
      }

      const code: FootballProviderErrorCode =
        error instanceof Error && error.name === "AbortError"
          ? "TIMEOUT"
          : "NETWORK_ERROR";
      const mapped = new FootballProviderError(
        code,
        code === "TIMEOUT"
          ? `Live football request timed out after ${String(timeoutMs)}ms for ${url}.`
          : `Live football network error for ${url}.`,
      );

      if (attempt + 1 >= attempts) {
        throw mapped;
      }

      lastError = mapped;
      await delay(100 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }

  throw (
    lastError ??
    new FootballProviderError(
      "NETWORK_ERROR",
      `Live football request failed for ${url}.`,
    )
  );
}
