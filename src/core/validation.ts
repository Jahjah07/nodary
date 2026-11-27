export type IssueCode =
  | "INVALID_FIELD" | "UNSUPPORTED_DATA" | "UNSUPPORTED_VERSION" | "INVALID_TEXT"
  | "INVALID_TIMESTAMP" | "DUPLICATE_ID" | "INVALID_PARENT" | "GROUP_CYCLE"
  | "GROUP_DEPTH" | "INVALID_GEOMETRY" | "INVALID_ENDPOINT" | "SELF_LOOP"
  | "DUPLICATE_EDGE" | "INVALID_CAPABILITY" | "LIMIT_EXCEEDED" | "CONTENT_DOES_NOT_FIT"
  | "STALE_GENERATION" | "COMMAND_FAILED" | "ROUTE_UNAVAILABLE" | "REVISION_CONFLICT" | "RECORD_EXISTS" | "RECORD_NOT_FOUND";

export type Issue = {
  code: IssueCode;
  path: readonly (string | number)[];
  message: string;
  codePoint?: string;
};

export type Result<T> = { ok: true; value: T } | { ok: false; issues: readonly Issue[] };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(...issues: Issue[]): Result<T> => ({ ok: false, issues });

export const limits = {
  bytes: 10 * 1024 * 1024,
  jsonDepth: 32,
  groupDepth: 8,
  coordinates: 1_000_000,
  size: 100_000,
  nodes: 1000,
  groups: 100,
  edges: 2000,
  issues: 20,
} as const;

const forbidden = new Set(["__proto__", "constructor", "prototype"]);

// DGS-05 VAL-03/04. This examines decoded values. Raw JSON parsing belongs to T-10-01.
export function inspectJson(value: unknown, path: Issue["path"] = [], depth = 0): Issue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") return;
  if (typeof value !== "object") return { code: "INVALID_FIELD", path, message: "Expected a JSON value." };
  if (depth >= limits.jsonDepth) return { code: "LIMIT_EXCEEDED", path, message: "JSON exceeds the nesting limit." };

  const prototype = Object.getPrototypeOf(value);
  const array = Array.isArray(value);
  if (!array && prototype !== null) {
    const ctor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
    if (typeof ctor !== "function" || ctor.prototype !== prototype ||
      Function.prototype.toString.call(ctor) !== Function.prototype.toString.call(Object)) {
      return { code: "UNSUPPORTED_DATA", path, message: "Expected a plain JSON object." };
    }
  }
  const keys = Reflect.ownKeys(value);
  if (array && (value.length > limits.edges || keys.length !== value.length + 1)) {
    return { code: value.length > limits.edges ? "LIMIT_EXCEEDED" : "UNSUPPORTED_DATA", path, message: "Invalid JSON array length or shape." };
  }
  for (const key of keys) {
    if (array && key === "length") continue;
    if (typeof key !== "string" || forbidden.has(key) || (array && !/^(0|[1-9]\d*)$/.test(key))) {
      return { code: "UNSUPPORTED_DATA", path, message: "Unsupported JSON property." };
    }
    if (array && Number(key) >= value.length) return { code: "UNSUPPORTED_DATA", path, message: "Invalid array index." };
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable || !("value" in descriptor)) {
      return { code: "UNSUPPORTED_DATA", path, message: "Expected an enumerable JSON property." };
    }
    const issue = inspectJson(descriptor.value, [...path, array ? Number(key) : key], depth + 1);
    if (issue) return issue;
  }
}
