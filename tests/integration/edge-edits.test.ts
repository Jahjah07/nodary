import { expect, test } from "vitest";
import architecture from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";
import { openCommandState, type CommandState } from "../../src/core/commands";
import { componentDispatcher, makeComponent } from "../../src/core/component-edits";
import type { DiagramDocument, Edge } from "../../src/core/contracts";
import { type EdgeEdit, type Endpoint } from "../../src/core/edge-edits";
import { parsePortable } from "../../src/core/graph";
import { componentRegistry } from "../../src/core/registry";
import { buildScene } from "../../src/workspace/scene";
import { sampleDiagram } from "../../src/workspace/sample";

const id = (n: number) => `ad59fdda-0186-45c3-a0e6-${String(n).padStart(12, "0")}`;
const dispatcher = componentDispatcher();
function open(input: unknown) {
  const result = openCommandState(input);
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}
const run = (state: CommandState, payload: EdgeEdit) => dispatcher.dispatch(state, { type: "edge", payload, expectedGeneration: state.generation });
function applied(state: CommandState, payload: EdgeEdit) {
  const result = run(state, payload);
  if (result.status !== "committed") throw Error(JSON.stringify(result));
  return result.state;
}
function rejects(state: CommandState, payload: EdgeEdit, code: string) {
  const result = run(state, payload);
  expect(result).toMatchObject({ status: "rejected", issues: [{ code }] });
  expect(result.state).toBe(state);
}
const endpoint = (nodeId: string, handleId: Endpoint["handleId"] = "right") => ({ nodeId, handleId });

test("DM-09/10 and CI-19 validate canonical direction, capabilities and history", () => {
  const { document } = sampleDiagram();
  document.edges = [];
  const text = makeComponent("general.text", id(1), { x: 0, y: -400 }) as DiagramDocument["nodes"][number];
  const note = makeComponent("general.note", id(2), { x: 0, y: -600 }) as DiagramDocument["nodes"][number];
  document.nodes.push(text, note);
  const [a, b, c] = document.nodes.map(({ id }) => id);
  const start = open({ document, viewport: null });
  const first = { kind: "connect", id: id(10), source: endpoint(a), target: endpoint(b, "left") } as const;
  const second = { ...first, id: id(11), target: endpoint(c, "top") };
  const branch = applied(applied(start, first), second);
  expect(branch.document.edges[0]).toEqual({ ...componentRegistry.edgeDefaults, id: first.id, source: first.source, target: first.target });
  rejects(branch, { ...first, id: id(12) }, "DUPLICATE_EDGE");
  rejects(branch, { ...first, id: id(12), target: endpoint(a, "top") }, "SELF_LOOP");
  for (const invalid of [text.id, note.id, document.groups[0].id, id(999)]) {
    rejects(branch, { ...first, id: id(12), target: endpoint(invalid) }, "INVALID_ENDPOINT");
    rejects(branch, { ...first, id: id(12), source: endpoint(invalid) }, "INVALID_ENDPOINT");
  }
  rejects(branch, { ...first, id: id(12), target: endpoint(b, "diagonal" as Endpoint["handleId"]) }, "INVALID_ENDPOINT");
  const bothDirections = applied(branch, { ...first, id: id(13), source: first.target, target: first.source });
  const distinct = applied(bothDirections, { ...first, id: id(14), source: endpoint(a, "top") });
  const cycle = applied(distinct, { ...first, id: id(15), source: endpoint(c, "bottom"), target: endpoint(a, "left") });
  expect(cycle.document.edges).toHaveLength(5);
  expect(cycle.history.past).toHaveLength(5);
  const deleted = applied(cycle, { kind: "delete", id: first.id });
  expect(deleted.document.nodes).toEqual(cycle.document.nodes);
  expect(deleted.document.edges).toEqual(cycle.document.edges.slice(1));
  expect(dispatcher.undo(deleted).state.document.edges).toEqual(cycle.document.edges);
  const invalidImport = structuredClone(document);
  const original = branch.document.edges[0];
  invalidImport.edges = [{ ...structuredClone(original), target: endpoint(text.id) }];
  expect(parsePortable({ document: invalidImport, viewport: null })).toMatchObject({ ok: false, issues: [{ code: "INVALID_ENDPOINT" }] });
});

test("DM-11 changes either endpoint, preserves labeled styling, and keeps invalid/no-op snapshots", () => {
  const fixture = sampleDiagram();
  const old = fixture.document.edges[0];
  old.arrows = "both";
  old.style.strokeStyle = "dashed";
  old.style.strokeWidth = 3.5;
  const [client, gateway, service, worker, database] = fixture.document.nodes.map(({ id }) => id);
  const start = open(fixture);
  const newTarget = endpoint(database, "right");
  const targetEdit = { kind: "reconnect", id: old.id, side: "target", endpoint: newTarget } as const;
  const targetChanged = applied(start, targetEdit);
  expect(targetChanged.document.edges[0]).toEqual({ ...old, target: newTarget });
  const sourceEdit = { kind: "reconnect", id: old.id, side: "source", endpoint: endpoint(worker, "top") } as const;
  const sourceChanged = applied(targetChanged, sourceEdit);
  expect(sourceChanged.document.edges[0]).toEqual({ ...old, target: newTarget, source: sourceEdit.endpoint });
  rejects(sourceChanged, { ...sourceEdit, endpoint: endpoint(database) }, "SELF_LOOP");
  expect(run(sourceChanged, sourceEdit)).toEqual({ status: "noop", state: sourceChanged });
  expect(dispatcher.dispatch(sourceChanged, { type: "edge", payload: sourceEdit, expectedGeneration: 0 }).state).toBe(sourceChanged);
  expect(sourceChanged.history.past).toHaveLength(2);
  const withConflict = applied(start, { kind: "connect", id: id(20), source: endpoint(client), target: endpoint(service, "bottom") });
  rejects(withConflict, { ...targetEdit, endpoint: endpoint(service, "bottom") }, "DUPLICATE_EDGE");
  expect(withConflict.document.edges[0].target.nodeId).toBe(gateway);
  const straight = applied(sourceChanged, { kind: "route", id: old.id, route: "straight" });
  expect(straight.document.edges[0]).toEqual({ ...sourceChanged.document.edges[0], route: "straight" });
  expect(buildScene(straight.document).edges[0].points).toHaveLength(2);
});

test("cross-boundary connections resolve after canonical move and resize without changing references", () => {
  const start = open(architecture);
  const child = start.document.nodes.find((node) => node.parentId && node.type.startsWith("arch."))!;
  const outside = start.document.nodes.find((node) => !node.parentId && node.type.startsWith("arch."))!;
  const payload = { kind: "connect", id: id(91), source: endpoint(child.id, "bottom"), target: endpoint(outside.id, "top") } as const;
  const linked = applied(start, payload);
  const initial = buildScene(linked.document);
  const moved = dispatcher.dispatch(linked, { type: "component",
    payload: { kind: "move", ids: [outside.id], reference: outside.id, delta: { x: -81, y: -63 } } });
  expect(moved.status).toBe("committed");
  const movedScene = buildScene(moved.state.document);
  const edge = movedScene.edges.at(-1)!;
  expect(edge.item).toEqual(linked.document.edges.at(-1));
  expect(edge.source.point).toEqual(initial.edges.at(-1)!.source.point);
  expect(edge.target.point).toEqual({ x: initial.edges.at(-1)!.target.point.x - 80, y: initial.edges.at(-1)!.target.point.y - 60 });
  const box = movedScene.nodes.find(({ item }) => item.id === outside.id)!.rect;
  const resized = dispatcher.dispatch(moved.state, { type: "component",
    payload: { kind: "resize", id: outside.id, rect: { ...box, width: box.width + 48 } } });
  expect(resized.status).toBe("committed");
  const resizedEdge = buildScene(resized.state.document).edges.at(-1)!;
  expect(resizedEdge.item as Edge).toEqual(edge.item);
  expect(resizedEdge.target.point).toEqual({ x: edge.target.point.x + 24, y: edge.target.point.y });
});
