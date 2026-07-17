import {
  DuplicateEvidenceError,
  type Evidence,
  type EvidenceRepository,
} from "@fas/evidence";

export type Result<Value, Failure> =
  | Readonly<{ ok: true; value: Value }>
  | Readonly<{ error: Failure; ok: false }>;

export interface EvidenceNormalizerError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export interface EvidenceNormalizer {
  normalize(input: unknown): Result<Evidence, EvidenceNormalizerError>;
}

export type EvidenceImportErrorCode =
  | "DUPLICATE_EVIDENCE"
  | "NORMALIZATION_FAILED"
  | "REPOSITORY_FAILED"
  | "UNEXPECTED_ERROR";

export interface EvidenceImportError {
  readonly code: EvidenceImportErrorCode;
  readonly message: string;
  readonly normalizerError?: EvidenceNormalizerError;
}

export type EvidenceImportResult = Result<Evidence, EvidenceImportError>;

function success(evidence: Evidence): Readonly<{ ok: true; value: Evidence }> {
  return Object.freeze({ ok: true, value: evidence });
}

function failure(
  code: EvidenceImportErrorCode,
  message: string,
  normalizerError?: EvidenceNormalizerError,
): Readonly<{ error: EvidenceImportError; ok: false }> {
  const error =
    normalizerError === undefined
      ? Object.freeze({ code, message })
      : Object.freeze({ code, message, normalizerError });

  return Object.freeze({ error, ok: false });
}

function normalizationFailure(error: EvidenceNormalizerError): EvidenceImportResult {
  const normalizerError =
    error.field === undefined
      ? Object.freeze({
          code: error.code,
          message: error.message,
        })
      : Object.freeze({
          code: error.code,
          field: error.field,
          message: error.message,
        });

  return failure(
    "NORMALIZATION_FAILED",
    "Evidence normalization failed.",
    normalizerError,
  );
}

export class EvidenceImportPipeline {
  readonly #normalizer: EvidenceNormalizer;
  readonly #repository: EvidenceRepository | undefined;

  constructor(normalizer: EvidenceNormalizer, repository?: EvidenceRepository) {
    this.#normalizer = normalizer;
    this.#repository = repository;
  }

  importEvidence(input: unknown): EvidenceImportResult {
    let evidence: Evidence;

    try {
      const normalized = this.#normalizer.normalize(input);

      if (!normalized.ok) {
        return normalizationFailure(normalized.error);
      }

      evidence = normalized.value;
    } catch {
      return failure(
        "UNEXPECTED_ERROR",
        "Evidence normalization failed unexpectedly.",
      );
    }

    if (this.#repository === undefined) {
      return success(evidence);
    }

    try {
      this.#repository.save(evidence);
      return success(evidence);
    } catch (error: unknown) {
      if (error instanceof DuplicateEvidenceError) {
        return failure("DUPLICATE_EVIDENCE", error.message);
      }

      return failure("REPOSITORY_FAILED", "Evidence repository persistence failed.");
    }
  }
}
