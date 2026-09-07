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
    const difference = (leftPoints[index] ?? 0) - (rightPoints[index] ?? 0);

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
  if (value === undefined) {
    throw new Error(`${location} must not be undefined.`);
  }

  if (typeof value === "bigint") {
    throw new Error(`${location} must not contain bigint.`);
  }

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

  const record = value as { readonly [key: string]: CanonicalJsonValue };
  const keys = Object.keys(record).sort(compareUnicodeCodePoints);
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`,
  );
  return `{${entries.join(",")}}`;
}

export function sha256CanonicalJson(value: unknown): string {
  return createHash("sha256").update(canonicalizeJson(value), "utf8").digest("hex");
}

function parseJsonString(text: string, index: { value: number }): string {
  if (text[index.value] !== '"') {
    throw new Error("JSON string must start with a quote.");
  }

  index.value += 1;
  let result = "";

  while (index.value < text.length) {
    const character = text[index.value];
    index.value += 1;

    if (character === '"') {
      return result;
    }

    if (character !== "\\") {
      result += character;
      continue;
    }

    const escaped = text[index.value];
    index.value += 1;

    if (escaped === "u") {
      const hex = text.slice(index.value, index.value + 4);
      result += String.fromCharCode(Number.parseInt(hex, 16));
      index.value += 4;
      continue;
    }

    const escapedCharacters: Record<string, string> = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: "\n",
      r: "\r",
      t: "\t",
    };
    result += escapedCharacters[escaped ?? ""] ?? escaped ?? "";
  }

  throw new Error("Unterminated JSON string.");
}

function skipWhitespace(text: string, index: { value: number }): void {
  while (index.value < text.length && /\s/u.test(text[index.value] ?? "")) {
    index.value += 1;
  }
}

function skipJsonValue(text: string, index: { value: number }): void {
  skipWhitespace(text, index);
  const character = text[index.value];

  if (character === '"') {
    parseJsonString(text, index);
    return;
  }

  if (character === "{") {
    skipJsonObject(text, index);
    return;
  }

  if (character === "[") {
    index.value += 1;
    skipWhitespace(text, index);

    if (text[index.value] === "]") {
      index.value += 1;
      return;
    }

    while (index.value < text.length) {
      skipJsonValue(text, index);
      skipWhitespace(text, index);

      if (text[index.value] === "]") {
        index.value += 1;
        return;
      }

      if (text[index.value] !== ",") {
        throw new Error("Invalid JSON array.");
      }

      index.value += 1;
    }

    throw new Error("Unterminated JSON array.");
  }

  if (text.startsWith("true", index.value)) {
    index.value += 4;
    return;
  }

  if (text.startsWith("false", index.value)) {
    index.value += 5;
    return;
  }

  if (text.startsWith("null", index.value)) {
    index.value += 4;
    return;
  }

  const numberMatch = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(
    text.slice(index.value),
  );

  if (numberMatch === null) {
    throw new Error("Invalid JSON value.");
  }

  index.value += numberMatch[0].length;
}

function skipJsonObject(text: string, index: { value: number }): void {
  if (text[index.value] !== "{") {
    throw new Error("JSON object must start with '{'.");
  }

  index.value += 1;
  skipWhitespace(text, index);

  if (text[index.value] === "}") {
    index.value += 1;
    return;
  }

  const keys = new Set<string>();

  while (index.value < text.length) {
    skipWhitespace(text, index);
    const key = parseJsonString(text, index);

    if (keys.has(key)) {
      throw new Error(`Duplicate JSON key "${key}" is not allowed.`);
    }

    keys.add(key);
    skipWhitespace(text, index);

    if (text[index.value] !== ":") {
      throw new Error("JSON object key must be followed by ':'.");
    }

    index.value += 1;
    skipJsonValue(text, index);
    skipWhitespace(text, index);

    if (text[index.value] === "}") {
      index.value += 1;
      return;
    }

    if (text[index.value] !== ",") {
      throw new Error("Invalid JSON object.");
    }

    index.value += 1;
  }

  throw new Error("Unterminated JSON object.");
}

export function parseJsonRejectingDuplicateKeys(text: string): unknown {
  const index = { value: 0 };
  skipWhitespace(text, index);
  skipJsonValue(text, index);
  skipWhitespace(text, index);

  if (index.value !== text.length) {
    throw new Error("JSON text contains trailing content.");
  }

  return JSON.parse(text) as unknown;
}
