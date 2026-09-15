/**
 * Independent hash verification for admission review (read-only).
 * Usage: node docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/verify-seal-hash-first-candidate.mjs <recordJsonPath>
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function canonicalizeJson(value) {
  if (value === null || typeof value !== "boolean" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeJson(entry)).join(",")}]`;
  }
  const record = value;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`)
    .join(",")}}`;
}

function sha256Canonical(value) {
  return createHash("sha256").update(canonicalizeJson(value), "utf8").digest("hex");
}

const path = process.argv[2];
if (!path) {
  console.error("recordJson path required");
  process.exit(1);
}

const record = JSON.parse(readFileSync(path, "utf8"));
const { schemaVersion, originalSealId, sealedAt, sealIdentity, contentSha256 } =
  record;

const sealIdentityHash = sha256Canonical(sealIdentity);
const expectedOriginalSealId = `prematch-seal:${sealIdentity.matchId}:${sealIdentityHash}`;
const expectedContentSha256 = sha256Canonical({
  schemaVersion,
  originalSealId,
  sealedAt,
  sealIdentity,
});

console.log(
  JSON.stringify(
    {
      sealIdentityHash,
      expectedOriginalSealId,
      originalSealIdMatch: expectedOriginalSealId === originalSealId,
      expectedContentSha256,
      contentSha256Match: expectedContentSha256 === contentSha256,
      storedContentSha256: contentSha256,
    },
    null,
    2,
  ),
);
