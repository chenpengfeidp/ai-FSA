export type LotteryManifestErrorCode =
  | "AMBIGUOUS_LOTTERY_FIXTURE"
  | "DUPLICATE_LOTTERY_FIXTURE"
  | "FIXTURE_IDENTITY_INCOMPLETE"
  | "FIXTURE_ORIENTATION_CONFLICT"
  | "INVALID_LOTTERY_MANIFEST"
  | "KICKOFF_CONFLICT"
  | "LOTTERY_MANIFEST_SCHEMA_UNSUPPORTED";

export interface LotteryManifestError {
  readonly code: LotteryManifestErrorCode;
  readonly message: string;
  readonly field?: string;
}

export function lotteryError(
  code: LotteryManifestErrorCode,
  message: string,
  field?: string,
): Readonly<{ error: LotteryManifestError; ok: false }> {
  const error =
    field === undefined
      ? Object.freeze({ code, message })
      : Object.freeze({ code, field, message });

  return Object.freeze({ error, ok: false });
}
