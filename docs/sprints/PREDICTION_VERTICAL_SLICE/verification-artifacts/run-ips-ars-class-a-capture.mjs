/**
 * Post-remediation Class A capture for lottery:csl:20260915:周二012
 * Usage: node docs/sprints/PREDICTION_VERTICAL_SLICE/verification-artifacts/run-ips-ars-class-a-capture.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = "http://127.0.0.1:3001";
const MATCH_ID = "lottery:csl:20260915:周二012";
const ARTIFACT_DIR = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(ARTIFACT_DIR, "2026-09-15-ips-ars-lottery-manifest.v1.json");

function canonicalizeJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
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

async function jfetch(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function main() {
  const out = { steps: [] };

  const version = await jfetch("/version");
  out.steps.push({ step: "version", ...version });
  const health = await jfetch("/health/ready");
  out.steps.push({ step: "health", ...health });

  const manifestBody = readFileSync(MANIFEST, "utf8");
  const manifestPost = await jfetch("/api/lottery/manifest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: manifestBody,
  });
  out.steps.push({ step: "manifest", ...manifestPost });

  const fixtures = await jfetch("/api/lottery/fixtures");
  out.steps.push({ step: "fixtures", ...fixtures });

  const encoded = encodeURIComponent(MATCH_ID);
  const analyze = await jfetch(`/api/analyze/match/${encoded}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  out.steps.push({ step: "analyze", status: analyze.status, body: analyze.body });

  const recordPath = join(ARTIFACT_DIR, "2026-09-15-ips-ars-seal-recordJson.json");
  if (analyze.body?.seal?.recordJson) {
    writeFileSync(recordPath, JSON.stringify(analyze.body.seal.recordJson, null, 2));
    const record = analyze.body.seal.recordJson;
    const sealIdentityHash = sha256Canonical(record.sealIdentity);
    const expectedOriginalSealId = `prematch-seal:${record.sealIdentity.matchId}:${sealIdentityHash}`;
    const expectedContentSha256 = sha256Canonical({
      schemaVersion: record.schemaVersion,
      originalSealId: record.originalSealId,
      sealedAt: record.sealedAt,
      sealIdentity: record.sealIdentity,
    });
    out.hashVerification = {
      sealIdentityHash,
      expectedOriginalSealId,
      originalSealIdMatch: expectedOriginalSealId === record.originalSealId,
      expectedContentSha256,
      contentSha256Match: expectedContentSha256 === record.contentSha256,
    };
  }

  const reportPath = join(ARTIFACT_DIR, "2026-09-15-ips-ars-capture-run.json");
  writeFileSync(reportPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
