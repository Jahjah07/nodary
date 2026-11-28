import { expect, test, vi } from "vitest";
import { parseNativeJson, readNativeFile } from "../../src/application/portable-file";
import { limits } from "../../src/core/validation";
import { approximate } from "../../src/core/visual";
import { blankDiagram } from "../../src/workspace/sample";
import flowchart from "../fixtures/templates/DGS-06_Template_Basic_Flowchart_v1.json";

const utf8 = (text: string) => new TextEncoder().encode(text);
const failure = (code: string) => ({ ok: false, issues: [expect.objectContaining({ code })] });

test("PE-24 rejects malformed UTF-8, grammar, duplicate and unsafe decoded keys", () => {
  expect(parseNativeJson(new Uint8Array([0xc0, 0xaf]))).toMatchObject(failure("INVALID_UTF8"));
  for (const malformed of ['{"a":1,}', '[0,]', '["\\q"]', '01', '1.', '1e+', 'null trailing']) {
    expect(parseNativeJson(utf8(malformed))).toMatchObject(failure("INVALID_JSON"));
  }
  expect(parseNativeJson(utf8('{"x":1,"\\u0078":2}'))).toMatchObject(failure("DUPLICATE_KEY"));
  for (const key of ["__proto__", "constructor", "prototype", "\\u0070rototype"]) {
    expect(parseNativeJson(utf8(`[{"safe":{"${key}":0}}]`))).toMatchObject(failure("UNSAFE_KEY"));
  }
  expect(parseNativeJson(utf8('\ufeff{"x":[true,null,-0.1e+2]}'))).toEqual({ ok: true, value: { x: [true, null, -10] } });
  expect(parseNativeJson(utf8('[{"x":1},{"x":2}]')).ok).toBe(true);
});

test("PE-24 bounds raw input before reading and limits object and array depth", async () => {
  const read = vi.fn();
  expect(await readNativeFile({ size: limits.bytes + 1, arrayBuffer: read }, approximate)).toMatchObject(failure("LIMIT_EXCEEDED"));
  expect(read).not.toHaveBeenCalled();
  expect(parseNativeJson(utf8(" ".repeat(limits.bytes - 4) + "null"))).toEqual({ ok: true, value: null });
  expect(parseNativeJson(utf8("[".repeat(32) + "0" + "]".repeat(32)))).toMatchObject({ ok: true });
  expect(parseNativeJson(utf8("[".repeat(33) + "0" + "]".repeat(33)))).toMatchObject(failure("LIMIT_EXCEEDED"));
  const deeplyNestedObject = '{"x":'.repeat(33) + "null" + "}".repeat(33);
  expect(parseNativeJson(utf8(deeplyNestedObject))).toMatchObject(failure("LIMIT_EXCEEDED"));
});

test("PE-23/25 validates the exact v1 envelope and leaves markup-like text inert", async () => {
  const diagram = blankDiagram("16be2377-2688-4a18-970e-1dee83f797a6", "<script>無害</script>", "general", new Date(0).toISOString());
  const file = (value: unknown) => new Blob([JSON.stringify(value)]);
  expect(await readNativeFile(file(diagram), approximate)).toEqual({ ok: true, value: diagram });
  expect(await readNativeFile(file({ ...diagram, history: [] }), approximate)).toMatchObject(failure("UNSUPPORTED_DATA"));
  expect(await readNativeFile(file({ ...diagram, document: { ...diagram.document, schemaVersion: 2 } }), approximate)).toMatchObject(failure("UNSUPPORTED_VERSION"));
  expect(await readNativeFile(file({ ...diagram, document: { ...diagram.document, title: "Bad\uffff" } }), approximate)).toMatchObject(failure("INVALID_TEXT"));
});

test("PE-25 rejects noncanonical graph and measured layout without changing source bytes", async () => {
  const source = JSON.stringify(flowchart);
  const invalid = structuredClone(flowchart);
  invalid.document.nodes[0].label = "W".repeat(950);
  expect(await readNativeFile(new Blob([JSON.stringify(invalid)]), approximate)).toMatchObject(failure("CONTENT_DOES_NOT_FIT"));
  invalid.document.nodes[0].label = flowchart.document.nodes[0].label;
  invalid.document.edges[0].target.nodeId = invalid.document.edges[0].source.nodeId;
  expect(await readNativeFile(new Blob([JSON.stringify(invalid)]), approximate)).toMatchObject(failure("SELF_LOOP"));
  invalid.document.nodes[1].id = invalid.document.nodes[0].id;
  expect(await readNativeFile(new Blob([JSON.stringify(invalid)]), approximate)).toMatchObject(failure("DUPLICATE_ID"));
  const nonfinite = source.replace(/"x":\s*280/, '"x":1e999');
  expect(await readNativeFile(new Blob([nonfinite]), approximate)).toMatchObject(failure("INVALID_FIELD"));
  const range = structuredClone(flowchart);
  range.document.nodes[0].position.x = limits.coordinates + 1;
  expect(await readNativeFile(new Blob([JSON.stringify(range)]), approximate)).toMatchObject(failure("INVALID_FIELD"));
  const count = structuredClone(flowchart);
  count.document.nodes = Array.from({ length: limits.nodes + 1 }, () => count.document.nodes[0]);
  expect(await readNativeFile(new Blob([JSON.stringify(count)]), approximate)).toMatchObject(failure("LIMIT_EXCEEDED"));
  const invalidStatus = source.replace('"not_specified"', '"unknown"');
  expect(await readNativeFile(new Blob([invalidStatus]), approximate)).toMatchObject(failure("INVALID_FIELD"));
  expect(JSON.stringify(flowchart)).toBe(source);
});
