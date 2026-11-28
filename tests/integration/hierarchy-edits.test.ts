import { expect, test } from "vitest";
import { openCommandState, type CommandState } from "../../src/core/commands";
import { componentDispatcher, makeComponent } from "../../src/core/component-edits";
import type { Boundary, Edge, Node, PortableDiagram, Position } from "../../src/core/contracts";
import { indexHierarchy } from "../../src/core/hierarchy";
import { destinationIssue, duplicatePlan, type HierarchyEdit } from "../../src/core/hierarchy-edits";
import { componentRegistry } from "../../src/core/registry";
import { buildScene, fitScene, hitTest } from "../../src/workspace/scene";
import { blankDiagram } from "../../src/workspace/sample";

const id = (n: number) => `721f04ac-331f-4570-9574-${n.toString(16).padStart(12, "0")}`;
const dispatcher = componentDispatcher();
const point = (x: number, y: number) => ({ x, y });
const frame = (n: number, position: Position, width: number, height: number): Boundary =>
  ({ ...makeComponent("general.boundary", id(n), position) as Boundary, size: { width, height } });
const node = (n: number, position: Position): Node => makeComponent("arch.server", id(n), position) as Node;
const edge = (n: number, source: number, target: number): Edge => ({
  ...structuredClone(componentRegistry.edgeDefaults), id: id(n),
  source: { nodeId: id(source), handleId: "right" }, target: { nodeId: id(target), handleId: "left" },
});
const blank = () => blankDiagram(id(0), "Hierarchy fixture", "architecture", new Date(0).toISOString());
function open(fixture: PortableDiagram) {
  const state = openCommandState(fixture);
  if (!state.ok) throw Error(JSON.stringify(state.issues));
  return state.value;
}
function base() {
  const fixture = blank();
  fixture.document.nodes = [node(1, point(240, 230)), node(2, point(540, 230)), node(3, point(920, 340)), node(4, point(460, 390))];
  const source = fixture.document.nodes[0];
  source.label = "Production worker";
  source.status = "completed";
  source.style.fill = "#DCEEFE";
  fixture.document.groups = [frame(10, point(80, 60), 1100, 700), frame(11, point(150, 110), 640, 440)];
  fixture.document.edges = [edge(30, 1, 2), edge(31, 2, 3), edge(32, 3, 4)];
  return open(fixture);
}
function index(state: CommandState) {
  const result = indexHierarchy(state.document);
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}
function positions(state: CommandState, ...ids: number[]) {
  const byId = index(state);
  return ids.map((n) => byId.get(id(n))!.world);
}
function run(state: CommandState, payload: HierarchyEdit, expectedGeneration = state.generation) {
  return dispatcher.dispatch(state, { type: "hierarchy", payload, expectedGeneration });
}
function committed(state: CommandState, payload: HierarchyEdit) {
  const result = run(state, payload);
  if (result.status !== "committed") throw Error(JSON.stringify(result.status === "rejected" ? result.issues : result.status));
  expect(result.state.generation).toBe(state.generation + 1);
  expect(result.state.history.past).toHaveLength(state.history.past.length + 1);
  return result.state;
}
function nested() {
  const first = committed(base(), { kind: "group", ids: [id(1), id(2), id(30)], id: id(12) });
  const second = committed(first, { kind: "reparent", ids: [id(12)], parentId: id(11) });
  return committed(second, { kind: "reparent", ids: [id(11)], parentId: id(10) });
}

test("CI-23/26 groups siblings with measured padding, preserves world positions and ignores selected edges", () => {
  const start = base();
  const grouped = nested();
  expect(index(grouped).get(id(12))!.depth).toBe(2);
  expect(index(grouped).get(id(1))!.item.parentId).toBe(id(12));
  expect(positions(grouped, 1, 2, 3, 4)).toEqual(positions(start, 1, 2, 3, 4));
  expect(grouped.document.edges).toEqual(start.document.edges);
  const scene = buildScene(grouped.document);
  expect(scene.groups.map(({ item }) => item.id)).toEqual([id(10), id(11), id(12)]);
  expect(scene.edges[1].source.point).toEqual(buildScene(start.document).edges[1].source.point);
  expect(scene.groups[2].bounds.x).toBeLessThan(scene.nodes[0].bounds.x - 16);
  expect(hitTest(scene, point(190, 425), 1)).toBe(null);
  const bad = run(grouped, { kind: "group", ids: [id(1), id(3)], id: id(14) });
  expect(bad).toMatchObject({ status: "rejected", state: grouped, issues: [{ code: "INVALID_PARENT" }] });
  const relink = committed(grouped, { kind: "reparent", ids: [id(1)], parentId: null });
  expect(positions(relink, 1, 2)).toEqual(positions(grouped, 1, 2));
  expect(relink.document.groups).toEqual(grouped.document.groups);
  const innerSiblingGroup = committed(grouped, { kind: "group", ids: [id(1), id(2)], id: id(13) });
  expect(index(innerSiblingGroup).get(id(13))!.item.parentId).toBe(id(12));
  expect(positions(innerSiblingGroup, 1, 2)).toEqual(positions(grouped, 1, 2));
  const fit = fitScene(scene.bounds, 1200, 800);
  expect(fit.cropped).toBe(false);
});

test("CI-24 each directional child move expands both ancestors and keeps the stationary sibling fixed", () => {
  const state = nested();
  const [subject, sibling] = positions(state, 1, 2);
  for (const delta of [point(-450, 0), point(1250, 0), point(0, -490), point(0, 1050)]) {
    const moved = dispatcher.dispatch(state, { type: "component", payload: {
      kind: "move", ids: [id(1)], reference: id(1), delta,
    } });
    expect(moved.status).toBe("committed");
    expect(positions(moved.state, 1, 2)).toEqual([point(subject.x + delta.x, subject.y + delta.y), sibling]);
    for (const groupId of [10, 11, 12]) {
      const before = state.document.groups.find((g) => g.id === id(groupId))!.size;
      const after = moved.state.document.groups.find((g) => g.id === id(groupId))!.size;
      if (delta.x) expect(after.width).toBeGreaterThan(before.width);
      else expect(after.height).toBeGreaterThan(before.height);
    }
    expect(moved.state.document.edges).toEqual(state.document.edges);
  }
});

test("CI-23/25 moves a boundary once, grows its title, and resizes only the frame", () => {
  const original = nested();
  const old = positions(original, 1, 2, 3, 11, 12);
  const moved = dispatcher.dispatch(original, { type: "component", payload: {
    kind: "move", ids: [id(11), id(12), id(1)], reference: id(1), delta: point(32, 17),
  } });
  expect(moved.status).toBe("committed");
  expect(positions(moved.state, 1, 2, 3, 11, 12)).toEqual(old.map((p, i) => i === 2 ? p : point(p.x + 32, p.y + 17)));
  const title = dispatcher.dispatch(moved.state, { type: "property", payload: { ids: [id(12)], field: "label", value: "Region\nZone\nService\nWorker\nData" } });
  expect(title.status).toBe("committed");
  expect(positions(title.state, 1, 2)).toEqual(positions(moved.state, 1, 2));
  const frame = index(title.state).get(id(12))!;
  const resize = (width: number) => dispatcher.dispatch(title.state, { type: "component", payload: {
    kind: "resize", id: id(12), rect: { ...frame.world, ...frame.item.size, width },
  } });
  expect(resize(160)).toMatchObject({ status: "rejected", state: title.state });
  const enlarged = resize(frame.item.size.width + 140);
  expect(enlarged.status).toBe("committed");
  expect(positions(enlarged.state, 1, 2)).toEqual(positions(title.state, 1, 2));
  expect(enlarged.state.document.nodes.map(({ size }) => size)).toEqual(title.state.document.nodes.map(({ size }) => size));
  expect(enlarged.state.document.edges).toEqual(original.document.edges);
});

test("CI-26 rejects missing, non-boundary, self, cyclic and excess-depth destinations atomically", () => {
  const state = nested();
  for (const target of [id(11), id(12), id(999), id(1)]) {
    expect(run(state, { kind: "reparent", ids: [id(11)], parentId: target })).toMatchObject({ status: "rejected", state });
  }
  expect(run(state, { kind: "reparent", ids: [id(12)], parentId: id(11) })).toEqual({ status: "noop", state });
  const fixture = blank();
  fixture.document.groups = Array.from({ length: 9 }, (_, i) => ({
    ...frame(i + 10, i ? point(25, 65) : point(0, 0), 2000 - i * 130, 2000 - i * 130), parentId: i ? id(i + 9) : null,
  }));
  fixture.document.nodes = [node(1, point(250, 600))];
  const limit = open(fixture);
  const deepestAllowed = committed(limit, { kind: "reparent", ids: [id(1)], parentId: id(17) });
  expect(index(deepestAllowed).get(id(1))!.depth).toBe(8);
  expect(destinationIssue(index(limit), [id(1)], id(18))?.code).toBe("GROUP_DEPTH");
  expect(run(limit, { kind: "reparent", ids: [id(1)], parentId: id(18) })).toMatchObject({
    status: "rejected", state: limit, issues: [{ code: "GROUP_DEPTH" }],
  });
});

test("CI-27 nested ungroup and mixed deletion keep survivors, edges and history intact", () => {
  const state = nested();
  const kept = committed(state, { kind: "delete", ids: [id(11)] });
  expect(index(kept).get(id(12))!.item.parentId).toBe(id(10));
  expect(positions(kept, 12, 1, 2)).toEqual(positions(state, 12, 1, 2));
  expect(kept.document.edges).toEqual(state.document.edges);
  expect(dispatcher.undo(kept).state.document.groups).toEqual(state.document.groups);
  const ungrouped = committed(state, { kind: "ungroup", ids: [id(11), id(12), id(1), id(30)] });
  expect(index(ungrouped).get(id(1))!.item.parentId).toBe(id(10));
  expect(positions(ungrouped, 1, 2, 3, 4)).toEqual(positions(state, 1, 2, 3, 4));
  expect(ungrouped.document.edges).toEqual(state.document.edges);
  const deleted = committed(state, { kind: "delete", ids: [id(11), id(12), id(1), id(32)] });
  expect(deleted.document.groups.map(({ id }) => id)).toEqual([id(10)]);
  expect(deleted.document.nodes.map(({ id }) => id)).toEqual([id(2), id(3), id(4)]);
  expect(deleted.document.edges.map(({ id }) => id)).toEqual([id(31)]);
  expect(positions(deleted, 2, 3, 4)).toEqual(positions(state, 2, 3, 4));
  const undo = dispatcher.undo(deleted);
  expect(undo.state.document.edges).toEqual(state.document.edges);
  expect(undo.state.document.nodes).toEqual(state.document.nodes);
  expect(undo.state.document.groups).toEqual(state.document.groups);
  expect(dispatcher.redo(undo.state).state.document.edges).toEqual(deleted.document.edges);
  expect(dispatcher.redo(undo.state).state.document.nodes).toEqual(deleted.document.nodes);
});

test("CI-28 duplicates one selected subtree, remaps internal edges only and uses one offset", () => {
  const state = nested();
  const pair = committed(state, { kind: "duplicate", ids: [id(1), id(2)], copies: {
    [id(1)]: id(51), [id(2)]: id(52), [id(30)]: id(53),
  } });
  expect(pair.document.edges).toEqual([...state.document.edges, edge(53, 51, 52)]);
  expect(pair.document.groups.map(({ id }) => id)).toEqual(state.document.groups.map(({ id }) => id));
  const selection = [id(11), id(12), id(1), id(31)];
  const plan = duplicatePlan(state.document, index(state), selection);
  expect(plan.roots).toEqual([id(11)]);
  expect(plan.edges.map(({ id }) => id)).toEqual([id(30)]);
  const copies = { [id(11)]: id(41), [id(12)]: id(42), [id(1)]: id(43), [id(2)]: id(44), [id(30)]: id(45) };
  const result = committed(state, { kind: "duplicate", ids: selection, copies });
  const [one, two] = positions(state, 1, 2);
  expect(positions(result, 1, 2, 43, 44)).toEqual([one, two, point(one.x + 20, one.y + 20), point(two.x + 20, two.y + 20)]);
  expect(index(result).get(id(41))!.item.parentId).toBe(id(10));
  expect(index(result).get(id(42))!.item.parentId).toBe(id(41));
  expect(index(result).get(id(43))!.item.parentId).toBe(id(42));
  expect(index(result).get(id(43))!.item).toEqual({
    ...index(state).get(id(1))!.item, id: id(43), parentId: id(42),
  });
  expect(result.document.edges.at(-1)).toEqual(edge(45, 43, 44));
  expect(result.document.edges).toHaveLength(4);
  const undone = dispatcher.undo(result).state;
  expect(undone.document.nodes).toEqual(state.document.nodes);
  expect(undone.document.groups).toEqual(state.document.groups);
  expect(dispatcher.redo(undone).state.document.edges).toEqual(result.document.edges);
  expect(run(state, { kind: "duplicate", ids: [id(31)], copies: {} })).toEqual({ status: "noop", state });
  expect(run(state, { kind: "duplicate", ids: selection, copies: { ...copies, [id(1)]: id(1) } })).toMatchObject({
    status: "rejected", state, issues: [{ code: "DUPLICATE_ID" }],
  });
  expect(run(state, { kind: "duplicate", ids: selection, copies }, state.generation - 1)).toMatchObject({ status: "rejected", state });
});
