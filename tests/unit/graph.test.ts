import { expect, test } from "vitest";
import { boundaryType, nodeTypes, parseStructure, type DiagramDocument } from "../../src/core/contracts";
import { parsePortable } from "../../src/core/graph";
import { componentRegistry } from "../../src/core/registry";
import example from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";
import basic from "../fixtures/templates/DGS-06_Template_Basic_Flowchart_v1.json";
import architecture from "../fixtures/templates/DGS-06_Template_IT_Architecture_v1.json";
import benchmark from "../fixtures/benchmark/DGS-10_Reference_Benchmark_100N_150E_v1.json";

const id = (value: number) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
function sample() {
  const result = parseStructure(example);
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}

test.each([example, basic, architecture, benchmark])("DGS-05 / DGS-06 validates graph fixture %#", (fixture) => {
  const result = parsePortable(fixture);
  expect(result.ok, JSON.stringify(result.ok ? [] : result.issues)).toBe(true);
});

test("DM-02 enumerates and instantiates all 29 trusted component definitions", () => {
  expect(componentRegistry.components.map((component) => component.type)).toEqual([...nodeTypes, boundaryType]);
  expect(componentRegistry.components.flatMap((component) => component.allowedHandles)).toHaveLength(104);
  const envelope = sample();
  envelope.document.nodes = [];
  envelope.document.groups = [];
  envelope.document.edges = [];
  for (const [index, component] of componentRegistry.components.entries()) {
    const base = { id: id(9000 + index), position: { x: index * 400, y: 0 }, parentId: null, size: { ...component.defaultSize } };
    if (component.entity === "node") {
      envelope.document.nodes.push({ ...base, type: component.type, label: component.defaultLabel, style: structuredClone(component.defaultStyle), status: "not_specified" });
    } else {
      envelope.document.groups.push({ ...base, type: component.type, title: component.defaultTitle, style: structuredClone(component.defaultStyle) });
    }
  }
  expect(parsePortable(envelope).ok).toBe(true);
});

const bad: [string, (document: DiagramDocument) => void, string][] = [
  ["duplicate document/object ID", (d) => { d.nodes[0].id = d.id; }, "DUPLICATE_ID"],
  ["duplicate group/edge ID", (d) => { d.edges[0].id = d.groups[0].id; }, "DUPLICATE_ID"],
  ["missing parent", (d) => { d.nodes[0].parentId = id(9999); }, "INVALID_PARENT"],
  ["node used as parent", (d) => { d.nodes[1].parentId = d.nodes[0].id; }, "INVALID_PARENT"],
  ["self parent", (d) => { d.groups[0].parentId = d.groups[0].id; }, "GROUP_CYCLE"],
  ["cyclic parent", (d) => { d.groups[0].parentId = d.groups[1].id; d.groups[1].parentId = d.groups[0].id; }, "GROUP_CYCLE"],
  ["missing endpoint", (d) => { d.edges[0].target.nodeId = id(9999); }, "INVALID_ENDPOINT"],
  ["boundary endpoint", (d) => { d.edges[0].target.nodeId = d.groups[0].id; }, "INVALID_ENDPOINT"],
  ["annotation endpoint", (d) => { const node = d.nodes.find((n) => n.id === d.edges[0].target.nodeId)!; node.type = "general.note"; node.status = "not_specified"; }, "INVALID_ENDPOINT"],
  ["self loop", (d) => { d.edges[0].target.nodeId = d.edges[0].source.nodeId; }, "SELF_LOOP"],
  ["duplicate directed tuple", (d) => { d.edges.push({ ...d.edges[0], id: id(9999), label: "Different label" }); }, "DUPLICATE_EDGE"],
  ["size below registry minimum", (d) => { d.nodes[0].size.height = 1; }, "CONTENT_DOES_NOT_FIT"],
  ["non-circular connector", (d) => { d.nodes[0].type = "flow.on_page_connector"; d.nodes[0].status = "not_specified"; d.nodes[0].size = { width: 100, height: 75 }; }, "CONTENT_DOES_NOT_FIT"],
  ["derived world overflow", (d) => { d.groups[0].position.x = 999999; }, "INVALID_GEOMETRY"],
  ["child overlaps padding", (d) => { const node = d.nodes.find((n) => n.parentId)!; node.position.x = 1; }, "INVALID_GEOMETRY"],
  ["reversed chronology", (d) => { d.updatedAt = "2020-01-01T00:00:00.000Z"; }, "INVALID_TIMESTAMP"],
];
test.each(bad)("DM-05/06/09/10/14 rejects %s", (_, mutate, expected) => {
  const envelope = sample();
  mutate(envelope.document);
  const original = JSON.stringify(envelope);
  const result = parsePortable(envelope);
  expect(result).toMatchObject({ ok: false, issues: expect.arrayContaining([expect.objectContaining({ code: expected })]) });
  expect(JSON.stringify(envelope)).toBe(original);
});

test("DM-06 accepts eight ancestors and rejects the ninth without depending on array order", () => {
  const envelope = sample();
  const graph = envelope.document;
  const frame = graph.groups[0];
  graph.nodes = [];
  graph.edges = [];
  graph.groups = Array.from({ length: 9 }, (_, i) => ({
    ...frame, id: id(9000 + i), parentId: i ? id(8999 + i) : null,
    position: { x: 16, y: 36 }, size: { width: 600 - 32 * i, height: 600 - 52 * i },
  })).reverse();
  expect(parsePortable(envelope).ok).toBe(true);
  graph.groups.unshift({ ...frame, id: id(9009), parentId: id(9008), position: { x: 16, y: 36 }, size: { width: 160, height: 100 } });
  expect(parsePortable(envelope)).toMatchObject({ ok: false, issues: [{ code: "GROUP_DEPTH" }] });
});

test("DM-10 accepts opposite direction and distinct handle tuples", () => {
  const envelope = sample();
  const graph = envelope.document;
  const edge = graph.edges[0];
  graph.edges = [
    edge,
    { ...edge, id: id(9900), source: edge.target, target: edge.source },
    { ...edge, id: id(9901), source: { ...edge.source, handleId: edge.source.handleId === "top" ? "bottom" : "top" } },
  ];
  expect(parsePortable(envelope).ok).toBe(true);
});

test("DM-14 status round-trips without mutating the underlying style", () => {
  const envelope = sample();
  const node = envelope.document.nodes.find((entry) => entry.type.startsWith("arch."))!;
  const originalStyle = structuredClone(node.style);
  for (const status of ["not_specified", "completed", "in_progress", "pending"] as const) {
    node.status = status;
    const restored = parsePortable(JSON.parse(JSON.stringify(envelope)));
    expect(restored).toMatchObject({ ok: true });
    if (!restored.ok) throw Error("Round-trip failed");
    const restoredNode = restored.value.document.nodes.find((entry) => entry.id === node.id);
    expect(restoredNode).toMatchObject({ style: originalStyle, status });
  }
  node.type = "flow.process";
  expect(parsePortable(envelope)).toMatchObject({ ok: false, issues: [{ code: "INVALID_CAPABILITY" }] });
});
