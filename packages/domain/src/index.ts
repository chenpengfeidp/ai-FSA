export type JsonPrimitive = boolean | null | number | string;

export type JsonValue =
  | JsonPrimitive
  | ReadonlyArray<JsonValue>
  | Readonly<{ [key: string]: JsonValue }>;

export type JsonObject = Readonly<{ [key: string]: JsonValue }>;
