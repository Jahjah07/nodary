import { expect, test } from "vitest";
import { initial, item, move, resize, world, type Graph } from "../../prototypes/sp-02/model";
import { deleteExplicit, duplicate, history, redo, transact, undo } from "../../prototypes/sp-06/history";

const sample = { ...initial, edges: [...initial.edges, { id: "internal", source: "worker", target: "peer" }] };
const copyId = (id: string) => "copy-" + id;

test("SP-06 duplicates nested groups and internal edges, then deletes, undoes and redoes atomically", () => {
  const base = history(sample);
  const copied = transact(base, (graph) => duplicate(graph, "outer", copyId));
  expect(copied.past).toHaveLength(1);
  expect(item(copied.present, "copy-inner").parent).toBe("copy-outer");
  expect(item(copied.present, "copy-worker").parent).toBe("copy-inner");
  expect(world(copied.present, "copy-worker")).toEqual({ x: 300, y: 275 });
  expect(copied.present.edges.slice(sample.edges.length)).toEqual([
    { id: "copy-internal", source: "copy-worker", target: "copy-peer" },
  ]);
  const removed = transact(copied, (graph) => deleteExplicit(graph, ["copy-outer", "copy-inner", "copy-peer"]));
  expect(item(removed.present, "copy-worker").parent).toBeNull();
  expect(world(removed.present, "copy-worker")).toEqual(world(copied.present, "copy-worker"));
  expect(removed.present.edges).toEqual(sample.edges);
  expect(undo(removed).present).toEqual(copied.present);
  expect(undo(undo(removed)).present).toEqual(base.present);
  expect(redo(undo(removed)).present).toEqual(removed.present);
});

test("SP-06 failed and no-op mutations leave graph and undo/redo unchanged", () => {
  let state = history(sample);
  state = transact(state, (graph) => move(graph, ["outside"], { x: 2, y: 3 }));
  state = undo(state);
  const baseline = structuredClone(state);
  expect(() => transact(state, (graph) => {
    item(graph, "worker").x = 998;
    graph.edges[0].target = "missing";
    return graph;
  })).toThrow("Unknown object");
  expect(() => transact(state, (graph) => duplicate(graph, "outer", (id) => id))).toThrow("Duplicate ID");
  expect(state).toEqual(baseline);
  expect(transact(state, (graph) => graph)).toBe(state);
  const replacement = transact(state, (graph) => move(graph, ["outside"], { x: -3, y: -5 }));
  expect(redo(replacement)).toBe(replacement);
  expect(replacement.generation).toBe(state.generation + 1);
});

test("SP-06 retains 50 atomic history entries through complete undo and redo", () => {
  let state = history(sample);
  for (let i = 0; i < 52; i++) state = transact(state, (graph) => move(graph, ["outside"], { x: 1, y: 0 }));
  expect(state.past).toHaveLength(50);
  for (let i = 0; i < 50; i++) state = undo(state);
  expect(world(state.present, "outside")).toEqual({ x: 647, y: 170 });
  expect(state.past).toHaveLength(0);
  for (let i = 0; i < 50; i++) state = redo(state);
  expect(world(state.present, "outside")).toEqual({ x: 697, y: 170 });
  expect(state.generation).toBe(152);
});

test("SP-06 round-trips 50 mixed position, size, style, status and edge transactions", () => {
  let state = history(sample);
  const commands: ((graph: Graph, index: number) => Graph)[] = [
    (graph) => move(graph, ["outside"], { x: 1, y: -1 }),
    (graph, index) => resize(graph, "inner", 221 + index, 151 + index),
    (graph, index) => {
      item(graph, "worker").fill = index % 2 ? "#e2edff" : "#ffffff";
      return graph;
    },
    (graph, index) => {
      item(graph, "worker").status = index % 2 ? "existing" : "proposed";
      return graph;
    },
    (graph, index) => {
      graph.edges[0].label = "Link " + index;
      return graph;
    },
  ];
  const checkpoints = [state.present];
  for (let index = 0; index < 10; index++) {
    for (const command of commands) {
      state = transact(state, (graph) => command(graph, index));
      checkpoints.push(state.present);
    }
  }
  expect(state.past).toHaveLength(50);
  for (const snapshot of checkpoints.slice(0, -1).reverse()) {
    state = undo(state);
    expect(state.present).toEqual(snapshot);
  }
  for (const snapshot of checkpoints.slice(1)) {
    state = redo(state);
    expect(state.present).toEqual(snapshot);
  }
});
