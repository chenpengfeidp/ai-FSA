import { describe, expect, it } from "vitest";
import {
  buildReplayCohort,
  createDefaultReplayCohortSpecification,
  PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
  selectReplayCohortMembers,
  SealedCohortOfflineReplayRunValidationError,
  validateSealedCohortForOfflineRun,
  type EvaluationHistoryRecord,
  type ProjectionReplaySidecarRecord,
} from "../src/index.js";

describe("P2K-F validateSealedCohortForOfflineRun", () => {
  it("rejects missing, draft, digest mismatch, and duplicate membership", () => {
    expect(() => validateSealedCohortForOfflineRun(undefined)).toThrow(
      SealedCohortOfflineReplayRunValidationError,
    );

    const specification = createDefaultReplayCohortSpecification({
      sidecarSchemaVersion: PROJECTION_REPLAY_SIDECAR_SCHEMA_VERSION,
    });
    const selection = selectReplayCohortMembers({
      histories: [],
      sidecarsByHistoryId: new Map<
        string,
        ProjectionReplaySidecarRecord | undefined
      >(),
      specification,
    });
    const draft = buildReplayCohort({
      cohortId: "cohort.draft",
      status: "DRAFT",
      selection,
      createdAt: "2026-08-12T17:00:00.000Z",
      membershipCreatedAt: "2026-08-12T17:00:00.000Z",
    });
    expect(() => validateSealedCohortForOfflineRun(draft)).toThrow(/must be SEALED/);

    const sealed = buildReplayCohort({
      cohortId: "cohort.sealed",
      status: "SEALED",
      selection,
      createdAt: "2026-08-12T17:00:00.000Z",
      membershipCreatedAt: "2026-08-12T17:00:00.000Z",
      sealedAt: "2026-08-12T17:00:00.000Z",
    });
    expect(validateSealedCohortForOfflineRun(sealed).cohortId).toBe("cohort.sealed");

    const badDigest = Object.freeze({
      ...sealed,
      membershipDigestSha256: "0".repeat(64),
    });
    expect(() => validateSealedCohortForOfflineRun(badDigest)).toThrow(
      /membership digest/,
    );

    const duplicate = Object.freeze({
      ...sealed,
      members: Object.freeze([
        Object.freeze({
          historyId: "h1",
          matchId: "m1",
          position: 0,
        }),
        Object.freeze({
          historyId: "h1",
          matchId: "m2",
          position: 1,
        }),
      ]),
      membershipDigestSha256: sealed.membershipDigestSha256,
    });
    expect(() => validateSealedCohortForOfflineRun(duplicate)).toThrow(
      /duplicate historyId/,
    );

    // Keep type import exercised for EvaluationHistoryRecord in selection API.
    const _histories: readonly EvaluationHistoryRecord[] = [];
    expect(_histories).toHaveLength(0);
  });
});
