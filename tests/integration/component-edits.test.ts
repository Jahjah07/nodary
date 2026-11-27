import { expect, test } from "vitest";
import { openCommandState, type CommandState } from "../../src/core/commands";
import { componentDispatcher, insertionPosition, resizeRect, type ComponentEdit } from "../../src/core/component-edits";
import type { PortableDiagram } from "../../src/core/contracts";
import { indexHierarchy } from "../../src/core/geometry";
import { parsePortable } from "../../src/core/graph";
import { componentRegistry } from "../../src/core/registry";
import { visualOf } from "../../src/core/visual";
import { blankDiagram, sampleDiagram } from "../../src/workspace/sample";

const id = (n: number) => `867b0b97-f37e-437d-9b92-${n.toString(16).padStart(12, "0")}`;
const dispatcher = componentDispatcher();
function opened(input: PortableDiagram = blankDiagram(id(0), "Components", "general", "2026-11-27T00:00:00.000Z")) {
  const state = openCommandState(input);
  if (!state.ok) throw Error(JSON.stringify(state.issues));
  return state.value;
}
const command = (state: CommandState, payload: ComponentEdit, expectedGeneration = state.generation) =>
  ({ type: "component" as const, payload, expectedGeneration });
function apply(state: CommandState, payload: ComponentEdit) {
  const result = dispatcher.dispatch(state, command(state, payload));
  expect(result.status).toBe("committed");
  return result.state;
}

test("CL-01 and CI-05 insert every canonical default, independently of overlap", () => {
  let state = opened();
  for (const [i, entry] of componentRegistry.components.entries()) {
    const position = insertionPosition(entry.type, { x: -15, y: 337 }, { x: .25, y: .7 }, true);
    const commandId = id(i + 1);
    const edit = { kind: "insert", id: commandId, type: entry.type, position } as const;
    const preview = dispatcher.preview(state, command(state, edit));
    expect(preview.ok).toBe(true);
    expect(state.history.past).toHaveLength(i);
    expect(position.x % 20).toBeCloseTo(0);
    expect(position.y % 20).toBeCloseTo(0);
    state = apply(state, edit);
    const target = (entry.entity === "node" ? state.document.nodes : state.document.groups).find(({ id }) => id === commandId)!;
    expect(target).toMatchObject({ type: entry.type, parentId: null, position, size: entry.defaultSize, style: entry.defaultStyle });
    expect("title" in target ? target.title : target.label).toBe(entry.entity === "group" ? entry.defaultTitle : entry.defaultLabel);
  }
  expect(state.document.nodes).toHaveLength(28);
  expect(state.document.groups).toHaveLength(1);
  expect(state.history.past).toHaveLength(29);
  expect(parsePortable({ document: state.document, viewport: null }).ok).toBe(true);
  const rejected = dispatcher.dispatch(state, command(state, { kind: "insert", id: id(1), type: "flow.process", position: { x: 0, y: 0 } }));
  expect(rejected.status).toBe("rejected");
  expect(rejected.state).toBe(state);
});

test("CI-10 snaps the selected ancestor once and retains bridge edges and offsets", () => {
  const input = sampleDiagram();
  input.document.settings.snapToGrid = true;
  const start = opened(input);
  const [outside, , nested] = start.document.nodes;
  const [, parent] = start.document.groups;
  const edit = { kind: "move", ids: [outside.id, nested.id, parent.id], reference: nested.id, delta: { x: 23, y: 11 } } as const;
  const preview = dispatcher.preview(start, command(start, edit));
  const next = apply(start, edit);
  expect(preview.ok).toBe(true);
  if (!preview.ok) return;
  expect(preview.value.nodes).toEqual(next.document.nodes);
  expect(start.history.past).toHaveLength(0);
  expect(next.history.past).toHaveLength(1);
  expect(next.document.edges).toEqual(start.document.edges);
  expect(next.document.nodes[2].position).toEqual(nested.position);
  const before = indexHierarchy(start.document);
  const after = indexHierarchy(next.document);
  if (!before.ok || !after.ok) throw Error("expected valid hierarchy");
  for (const entry of [outside, nested, parent]) {
    const old = before.value.get(entry.id)!.world;
    expect(after.value.get(entry.id)!.world).toEqual({ x: old.x + 15, y: old.y + 16 });
  }
  expect(dispatcher.undo(next).state.document.nodes).toEqual(start.document.nodes);
  expect(dispatcher.dispatch(next, command(next, edit, start.generation)).state).toBe(next);
  const noop = dispatcher.dispatch(next, command(next, { ...edit, delta: { x: 0, y: 0 } }));
  expect(noop.status).toBe("noop");
  expect(noop.state).toBe(next);
});

test("CI-11/12/13 resize and nudge validate fractional positions, fixed sides, circle floor and aspect", () => {
  const start = apply(opened(), { kind: "insert", id: id(1), type: "flow.on_page_connector", position: { x: 13.25, y: -31.75 } });
  const node = start.document.nodes[0];
  const rect = { ...node.position, ...node.size };
  const larger = resizeRect(rect, "nw", { x: -40.5, y: 2 }, true, false);
  expect(larger).toEqual({ x: rect.x - 40.5, y: rect.y - 40.5, width: rect.width + 40.5, height: rect.height + 40.5 });
  const good = apply(start, { kind: "resize", id: node.id, rect: larger });
  expect(good.history.past).toHaveLength(2);
  expect(visualOf(good.document.nodes[0]).anchors[0].position.y).toBe(0);
  for (const bad of [{ ...larger, width: 1, height: 1 }, { ...larger, width: larger.width - 1 },
    resizeRect(rect, "nw", { x: 120, y: 0 }, true, false)]) {
    const result = dispatcher.dispatch(good, command(good, { kind: "resize", id: node.id, rect: bad }));
    expect(result.status).toBe("rejected");
    expect(result.state).toBe(good);
  }
  expect(parsePortable({ document: { ...good.document, nodes: [{ ...node, size: { width: 100, height: 99 } }] }, viewport: null }).ok).toBe(false);
  const snapped = dispatcher.dispatch(good, { type: "toggle", payload: "snapToGrid" }).state;
  const nudged = apply(snapped, { kind: "nudge", ids: [node.id], reference: node.id, delta: { x: 40, y: 0 } });
  expect(nudged.document.nodes[0].position).toEqual({ x: larger.x + 40, y: larger.y });
  expect(nudged.history.past).toHaveLength(3);
  expect(dispatcher.undo(nudged).state.document.nodes).toEqual(snapped.document.nodes);
  expect(resizeRect({ x: 13.25, y: -18.5, width: 180, height: 80 }, "w", { x: -11, y: 70 }, false, true))
    .toEqual({ x: 0, y: -18.5, width: 193.25, height: 80 });
});

test("CI-14 provisional fit and boundary containment reject invalid operations atomically", () => {
  const input = sampleDiagram();
  const start = opened(input);
  const [boundary] = start.document.groups;
  const original = indexHierarchy(start.document);
  const larger = apply(start, { kind: "resize", id: boundary.id, rect: { x: -40, y: -40, width: 802, height: 456 } });
  const resized = indexHierarchy(larger.document);
  if (!original.ok || !resized.ok) throw Error("expected valid hierarchy");
  for (const item of start.document.nodes) expect(resized.value.get(item.id)!.world).toEqual(original.value.get(item.id)!.world);
  const hidden = dispatcher.dispatch(start, command(start, { kind: "resize", id: boundary.id, rect: { x: 0, y: 0, width: 180, height: 120 } }));
  expect(hidden.status).toBe("rejected");
  expect(hidden.state).toBe(start);
  const decision = apply(opened(), { kind: "insert", id: id(8), type: "flow.decision", position: { x: 0, y: 0 } });
  const component = componentRegistry.components.find(({ type }) => type === "flow.decision")!;
  const failingMeasure = componentDispatcher(() => 500);
  const result = failingMeasure.dispatch(decision, command(decision, {
    kind: "resize", id: id(8), rect: { x: 0, y: 0, ...component.minSize },
  }));
  expect(result.status).toBe("rejected");
  if (result.status === "rejected") expect(result.issues[0].message).toContain("more space");
  expect(result.state).toBe(decision);
});
