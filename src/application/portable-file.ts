import type { PortableDiagram } from "../core/contracts";
import { validateContainment } from "../core/geometry";
import { parsePortable } from "../core/graph";
import { containmentMetrics } from "../core/properties";
import { fail, limits, type Issue, type Result } from "../core/validation";
import { labelLayout, type Measure } from "../core/visual";

const unsafe = new Set(["__proto__", "constructor", "prototype"]);
const error = (code: Issue["code"], message: string, path: Issue["path"] = []): Issue => ({ code, path, message });
const oversized = error("LIMIT_EXCEEDED", "The file exceeds the 10 MiB portable limit.");

// DGS-08 §7. Check grammar and decoded property names before constructing any objects.
export function parseNativeJson(bytes: Uint8Array): Result<unknown> {
  if (bytes.byteLength > limits.bytes) return fail(oversized);
  let input: string;
  try { input = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { return fail(error("INVALID_UTF8", "The file must contain valid UTF-8.")); }
  let at = 0;
  const bad = () => { throw error("INVALID_JSON", `Invalid JSON at character ${at + 1}.`); };
  const white = /[ \n\r\t]*/y;
  const scalar = /(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/y;
  function skip() { white.lastIndex = at; white.test(input); at = white.lastIndex; }
  function string() {
    const start = at++;
    while (at < input.length) {
      const ch = input.charCodeAt(at++);
      if (ch === 34) return start;
      if (ch < 32) bad();
      if (ch !== 92) continue;
      const escape = input[at++];
      if (escape === "u") {
        if (!/^[0-9a-f]{4}$/i.test(input.slice(at, at + 4))) bad();
        at += 4;
      } else if (escape === undefined || !'"\\/bfnrt'.includes(escape)) bad();
    }
    return bad();
  }
  function value(depth: number) {
    skip();
    const start = input[at];
    if (start === '"') { string(); return; }
    if (start !== "{" && start !== "[") {
      scalar.lastIndex = at;
      if (!scalar.test(input)) bad();
      at = scalar.lastIndex;
      return;
    }
    if (depth >= limits.jsonDepth) throw error("LIMIT_EXCEEDED", "JSON nesting exceeds 32 levels.");
    const keys = start === "{" ? new Set<string>() : null;
    const close = keys ? "}" : "]";
    at++;
    skip();
    if (input[at] === close) { at++; return; }
    for (;;) {
      if (keys) {
        if (input[at] !== '"') bad();
        const from = string()!;
        const key = JSON.parse(input.slice(from, at)) as string;
        if (unsafe.has(key)) throw error("UNSAFE_KEY", `An unsafe property name occurs at character ${from + 1}.`);
        if (keys.has(key)) throw error("DUPLICATE_KEY", `A duplicate property name occurs at character ${from + 1}.`);
        keys.add(key);
        skip();
        if (input[at++] !== ":") bad();
      }
      value(depth + 1);
      skip();
      const next = input[at++];
      if (next === close) return;
      if (next !== ",") bad();
      skip();
    }
  }
  try {
    value(0);
    skip();
    if (at !== input.length) bad();
    return { ok: true, value: JSON.parse(input) as unknown };
  } catch (cause) {
    if (cause && typeof cause === "object" && "code" in cause) return fail(cause as Issue);
    return fail(error("INVALID_JSON", "The file does not contain valid JSON."));
  }
}

export function validatePortableFile(input: unknown, measure: Measure): Result<PortableDiagram> {
  const parsed = parsePortable(input);
  if (!parsed.ok) return parsed;
  const { document } = parsed.value;
  const issues: Issue[] = [];
  for (const key of ["nodes", "groups"] as const) {
    for (const [index, item] of document[key].entries()) {
      if (!labelLayout(item, measure).fits) {
        issues.push(error("CONTENT_DOES_NOT_FIT", "Measured text exceeds the component's label region.",
          ["document", key, index, key === "nodes" ? "label" : "title"]));
        if (issues.length === limits.issues) return fail(...issues);
      }
    }
  }
  const containment = validateContainment(document, containmentMetrics(measure));
  if (!containment.ok) issues.push(...containment.issues.slice(0, limits.issues - issues.length));
  return issues.length ? fail(...issues) : parsed;
}

export async function readNativeFile(file: Pick<File, "size" | "arrayBuffer">, measure: Measure) {
  if (file.size > limits.bytes) return fail<PortableDiagram>(oversized);
  let bytes: Uint8Array;
  try { bytes = new Uint8Array(await file.arrayBuffer()); }
  catch { return fail<PortableDiagram>(error("FILE_READ_FAILED", "The browser could not read this file.")); }
  const preflight = parseNativeJson(bytes);
  return preflight.ok ? validatePortableFile(preflight.value, measure) : preflight;
}
