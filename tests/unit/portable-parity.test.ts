import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { describe, expect, test } from "vitest";
import reference from "../../docs/02-architecture/schemas/DGS-05_Portable_Diagram_Schema_v1_CR-01.json";
import { parseStructure } from "../../src/core/contracts";
import example from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";
import basic from "../fixtures/templates/DGS-06_Template_Basic_Flowchart_v1.json";
import architecture from "../fixtures/templates/DGS-06_Template_IT_Architecture_v1.json";
import benchmark from "../fixtures/benchmark/DGS-10_Reference_Benchmark_100N_150E_v1.json";

const ajv = new Ajv2020({ strict: true, strictTypes: false });
addFormats(ajv);
const validate = ajv.compile(reference);
const copy = () => structuredClone(example);

function verify(input: unknown, accepted: boolean) {
  expect(validate(input), JSON.stringify(validate.errors)).toBe(accepted);
  expect(parseStructure(input).ok).toBe(accepted);
}

describe("DGS-05 DM-01–04/21, original fixtures and CR-01 reference parity", () => {
  test.each([example, basic, architecture, benchmark])("validates supplied fixture %# in both validators", (fixture) => {
    verify(fixture, true);
  });

  const variants: [string, (value: ReturnType<typeof copy>) => void][] = [
    ["unknown graph field", (value) => Object.assign(value.document.nodes[0], { measured: {} })],
    ["unknown envelope field", (value) => Object.assign(value, { history: [] })],
    ["unknown nested style", (value) => Object.assign(value.document.nodes[0].style.text, { font: "custom" })],
    ["wrong version", (value) => { value.document.schemaVersion = 2; }],
    ["invalid UUID variant", (value) => { value.document.id = "00000000-0000-4000-1000-000000000001"; }],
    ["UUID trailing newline", (value) => { value.document.id += "\n"; }],
    ["noncanonical color", (value) => { value.document.nodes[0].style.fill = "#abcdef"; }],
    ["zero width", (value) => { value.document.nodes[0].size.width = 0; }],
    ["infinite position", (value) => { value.document.nodes[0].position.x = Infinity; }],
    ["invalid date", (value) => { value.document.createdAt = "2026-02-29T00:00:00.000Z"; }],
    ["leap second", (value) => { value.document.createdAt = "2024-12-31T23:59:60.000Z"; }],
    ["padded title", (value) => { value.document.title = " Test"; }],
    ["text beyond code-point limit", (value) => { value.document.nodes[0].label = "🚀".repeat(1001); }],
    ["unknown handle", (value) => { value.document.edges[0].target.handleId = "north"; }],
    ["group in node collection", (value) => { value.document.nodes[0].type = "general.boundary"; }],
    ["disallowed status", (value) => { Object.assign(value.document.nodes[0], { type: "general.note", status: "pending" }); }],
    ["invalid viewport", (value) => { Object.assign(value, { viewport: { x: 0, y: 0, zoom: 0.249 } }); }],
  ];
  test.each(variants)("rejects %s", (_, apply) => {
    const fixture = copy();
    apply(fixture);
    verify(fixture, false);
  });

  const fields = [
    { path: ["document", "title"], apply: (f: ReturnType<typeof copy>, x: string) => { f.document.title = x; } },
    { path: ["document", "nodes", 0, "label"], apply: (f: ReturnType<typeof copy>, x: string) => { f.document.nodes[0].label = x; } },
    { path: ["document", "groups", 0, "title"], apply: (f: ReturnType<typeof copy>, x: string) => { f.document.groups[0].title = x; } },
    { path: ["document", "edges", 0, "label"], apply: (f: ReturnType<typeof copy>, x: string) => { f.document.edges[0].label = x; } },
  ];
  test.each(fields)("preserves text and identifies the prohibited character at $path", ({ path, apply }) => {
    const fixture = copy();
    apply(fixture, "🚀\t<mark>&\n\u{1FFFE}");
    verify(fixture, true);
    for (const [char, codePoint] of [["\uFFFE", "U+FFFE"], ["\uFFFF", "U+FFFF"], ["\uD800", "U+D800"], ["\r", "U+000D"], ["\u0085", "U+0085"]]) {
      apply(fixture, `a${char}b`);
      const original = JSON.stringify(fixture);
      verify(fixture, false);
      expect(parseStructure(fixture)).toMatchObject({ ok: false, issues: [{ code: "INVALID_TEXT", path, codePoint }] });
      expect(JSON.stringify(fixture)).toBe(original);
    }
  });

  test("counts supplementary characters as single code points and accepts leap day", () => {
    const fixture = copy();
    fixture.document.title = "🚀".repeat(120);
    fixture.document.nodes[0].label = "🚀".repeat(1000);
    fixture.document.createdAt = "2024-02-29T00:00:00.000Z";
    verify(fixture, true);
  });

  test("accepts a blank graph with canonical metadata and nullable viewport", () => {
    const fixture = copy();
    Object.assign(fixture.document, { title: "Untitled", nodes: [], groups: [], edges: [] });
    Object.assign(fixture, { viewport: null });
    verify(fixture, true);
    fixture.document.title = " ";
    verify(fixture, false);
  });
});

test("DGS-05 DM-03 rejects unsafe own keys before Zod or accessors", () => {
  const original = copy();
  const input = JSON.parse(JSON.stringify(original).replace('"viewport":', '"__proto__":{},"viewport":'));
  expect(parseStructure(input)).toMatchObject({ ok: false, issues: [{ code: "UNSUPPORTED_DATA" }] });
  const nested = copy();
  Object.defineProperty(nested.document.nodes[0].style, "constructor", { value: {}, enumerable: true });
  expect(parseStructure(nested)).toMatchObject({ ok: false, issues: [{ code: "UNSUPPORTED_DATA" }] });
  const getter = () => { throw Error("Accessor evaluated"); };
  expect(parseStructure({ get document() { return getter(); }, viewport: null })).toMatchObject({ ok: false });
});
