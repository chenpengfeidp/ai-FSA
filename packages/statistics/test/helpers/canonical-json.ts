import { createHash } from "node:crypto";

export type CanonicalJsonValue =
  | boolean
  | null
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < length; index += 1) {
    const difference = leftPoints[index] - rightPoints[index];

    if (difference !== 0) {
      return difference;
    }
  }

  return leftPoints.length - rightPoints.length;
}

function assertCanonicalJsonValue(
  value: unknown,
  location: string,
): asserts value is CanonicalJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${location} must contain only finite JSON numbers.`);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertCanonicalJsonValue(entry, `${location}/${index}`);
    });
    return;
  }

  if (typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertCanonicalJsonValue(entry, `${location}/${key}`);
    }
    return;
  }

  throw new Error(`${location} is not a JSON value.`);
}

export function canonicalizeJson(value: unknown): string {
  assertCanonicalJsonValue(value, "$");

  if (value === null || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "number" || typeof value === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalizeJson(entry)).join(",")}]`;
  }

  const keys = Object.keys(value).sort(compareUnicodeCodePoints);
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`,
  );
  return `{${entries.join(",")}}`;
}

function decodeJsonPointerToken(token: string): string {
  if (/~(?:[^01]|$)/u.test(token)) {
    throw new Error(`JSON Pointer token "${token}" has an invalid escape.`);
  }

  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

export function valueAtJsonPointer(document: unknown, pointer: string): unknown {
  if (pointer === "") {
    return document;
  }

  if (!pointer.startsWith("/")) {
    throw new Error(`JSON Pointer "${pointer}" must start with "/".`);
  }

  return pointer
    .slice(1)
    .split("/")
    .map(decodeJsonPointerToken)
    .reduce<unknown>((current, token) => {
      if (Array.isArray(current)) {
        if (!/^(?:0|[1-9]\d*)$/u.test(token)) {
          throw new Error(`JSON Pointer array token "${token}" is invalid.`);
        }

        const index = Number(token);

        if (index >= current.length) {
          throw new Error(`JSON Pointer array index "${token}" is missing.`);
        }

        return current[index];
      }

      if (
        typeof current === "object" &&
        current !== null &&
        Object.hasOwn(current, token)
      ) {
        return (current as Record<string, unknown>)[token];
      }

      throw new Error(`JSON Pointer token "${token}" is missing.`);
    }, document);
}

export function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalizeJson(value), "utf8").digest("hex");
}

export function sha256JsonPointer(document: unknown, pointer: string): string {
  return sha256CanonicalJson(valueAtJsonPointer(document, pointer));
}
