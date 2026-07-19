import { createHash } from "node:crypto";

/** Fixed namespace for FAS domain Evidence id → UUID v5. */
export const FAS_EVIDENCE_NAMESPACE = "6f61732d-6576-4964-8e6e-737061636530";

function bytesFromUuid(uuid: string): Buffer {
  const hex = uuid.replace(/-/gu, "");
  return Buffer.from(hex, "hex");
}

function uuidFromBytes(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/** RFC 4122 UUID v5 over a namespace UUID and name string. */
export function uuidV5(name: string, namespace: string): string {
  const namespaceBytes = bytesFromUuid(namespace);
  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(name, "utf8")
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  const timeHi = bytes[6];
  const clockSeq = bytes[8];

  if (timeHi === undefined || clockSeq === undefined) {
    throw new Error("UUID v5 hash truncated unexpectedly.");
  }

  bytes[6] = (timeHi & 0x0f) | 0x50;
  bytes[8] = (clockSeq & 0x3f) | 0x80;

  return uuidFromBytes(bytes);
}

export function evidenceIdToUuid(domainId: string): string {
  return uuidV5(domainId, FAS_EVIDENCE_NAMESPACE);
}
