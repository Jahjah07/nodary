import { expect, test } from "vitest";
import { createDispatcher, openCommandState, setSelection, setViewport, type CommandHandlers, type Outcome } from "../../src/core/commands";
import { indexHierarchy } from "../../src/core/hierarchy";
import { fail, ok, type Result } from "../../src/core/validation";
import example from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";

type Text = { field: "node" | "boundary" | "edge" | "document"; text: string };
type Payloads = { label: Text; removeEdge: undefined; fail: undefined; noop: undefined; tooLarge: undefined; grid: boolean };
const handlers: CommandHandlers<Payloads> = {
  label: (draft, { field, text }) => {
    if (field === "node") draft.nodes[0].label = text;
    if (field === "boundary") draft.groups[0].title = text;
    if (field === "edge") draft.edges[0].label = text;
    if (field === "document") draft.title = text;
    return ok(undefined);
  },
  removeEdge: (draft) => { draft.edges.shift(); return ok(undefined); },
  fail: (draft) => {
    draft.nodes.length = 0;
    return fail({ code: "COMMAND_FAILED", path: [], message: "Rejected after staging." });
  },
  noop: () => ok(undefined),
  tooLarge: (draft) => { draft.nodes = Array.from({ length: 1001 }, () => draft.nodes[0]); return ok(undefined); },
  grid: (draft, visible) => { draft.settings.gridVisible = visible; return ok(undefined); },
};
const dispatcher = createDispatcher<Payloads>(handlers, () => "2026-11-27T12:45:00.000Z");

function value<T>(result: Result<T>): T {
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}
function committed(result: Outcome) {
  expect(result.status).toBe("committed");
  return result.state;
}

test("DM-15 / CI-33 no-op, thrown and rejected commands preserve state and history", () => {
  const state = value(openCommandState(example));
  expect(dispatcher.dispatch(state, { type: "noop", payload: undefined })).toEqual({ status: "noop", state });
  expect(dispatcher.dispatch(state, { type: "fail", payload: undefined }).state).toBe(state);
  const throwing = createDispatcher({ noop: () => { throw Error("failure"); } }, () => "2026-11-27T12:45:00.000Z");
  expect(throwing.dispatch(state, { type: "noop", payload: undefined })).toMatchObject({ status: "rejected", state });
  expect(dispatcher.preview(state, { type: "tooLarge", payload: undefined })).toMatchObject({
    ok: false, issues: [{ code: "LIMIT_EXCEEDED", path: ["document", "nodes"] }],
  });
  expect(dispatcher.dispatch(state, { type: "tooLarge", payload: undefined }).state).toBe(state);
  expect(state.generation).toBe(0);
  expect(state.history.past).toHaveLength(0);
  expect(state.document.nodes).toHaveLength(example.document.nodes.length);
});

test.each(["document", "node", "boundary", "edge"] as const)("CR-01 rejects an invalid %s edit before publishing", (field) => {
  const state = committed(dispatcher.dispatch(value(openCommandState(example)), {
    type: "label", payload: { field: "node", text: "🚀 <tag>" },
  }));
  const result = dispatcher.dispatch(state, { type: "label", payload: { field, text: "Bad\uFFFF" } });
  expect(result).toMatchObject({ status: "rejected", issues: [{ code: "INVALID_TEXT", codePoint: "U+FFFF" }] });
  expect(result.state).toBe(state);
  expect(state.generation).toBe(1);
  expect(state.history.past).toHaveLength(1);
  expect(state.document.nodes[0].label).toBe("🚀 <tag>");
});

test("CI-33 previews are immutable, private and stale generations reject", () => {
  const state = value(openCommandState(example));
  const edit = { type: "label", payload: { field: "node", text: "Preview" }, expectedGeneration: 0 } as const;
  const preview = value(dispatcher.preview(state, edit));
  expect(preview.nodes[0].label).toBe("Preview");
  expect(Object.isFrozen(preview.nodes[0].style.text)).toBe(true);
  expect(state.document.nodes[0].label).toBe(example.document.nodes[0].label);
  expect(state.history.past).toHaveLength(0);
  const updated = committed(dispatcher.dispatch(state, edit));
  expect(dispatcher.dispatch(updated, edit)).toMatchObject({ status: "rejected", state: updated, issues: [{ code: "STALE_GENERATION" }] });
});

test("DM-15 / DM-18 undo and redo preserve current metadata and independent viewport", () => {
  const initial = value(openCommandState(example));
  expect(value(indexHierarchy(initial.document)).has(initial.document.nodes[0].id)).toBe(true);
  const selected = setSelection(initial, [initial.document.edges[0].id, "unknown"]);
  const removed = committed(dispatcher.dispatch(selected, { type: "removeEdge", payload: undefined }));
  expect(removed.view.selection).toEqual([]);
  const renamed = committed(dispatcher.dispatch(removed, { type: "label", payload: { field: "document", text: "Renamed" } }));
  const grid = committed(dispatcher.dispatch(renamed, { type: "grid", payload: !renamed.document.settings.gridVisible }));
  const viewport = { x: 140, y: -1.5, zoom: 1.25 };
  const viewed = value(setViewport(grid, viewport));
  expect(viewed.document).toBe(grid.document);
  expect(viewed.history).toBe(grid.history);
  expect(viewed.generation).toBe(grid.generation);
  const undone = committed(dispatcher.undo(viewed));
  expect(undone.document.edges).toEqual(initial.document.edges);
  expect(undone.document.title).toBe("Renamed");
  expect(undone.document.settings).toEqual(grid.document.settings);
  expect(undone.view.viewport).toEqual(viewport);
  expect(undone.view.selection).toEqual([]);
  expect(undone.generation).toBe(viewed.generation + 1);
  const redone = committed(dispatcher.redo(undone));
  expect(redone.document.edges).toEqual(removed.document.edges);
  const replaced = committed(dispatcher.dispatch(undone, { type: "label", payload: { field: "node", text: "Replacement" } }));
  expect(dispatcher.redo(replaced)).toEqual({ status: "noop", state: replaced });
});

test("DM-15 retains 50 immutable transactions and never rewinds time", () => {
  const clock = createDispatcher<Payloads>(handlers, () => "2020-01-01T00:00:00.000Z");
  let state = value(openCommandState(example));
  for (let i = 1; i <= 55; i++) state = committed(clock.dispatch(state, { type: "label", payload: { field: "node", text: `Edit ${i}` } }));
  expect(state.history.past).toHaveLength(50);
  expect(Object.isFrozen(state.history.past[0].nodes[0])).toBe(true);
  for (let i = 0; i < 50; i++) state = committed(clock.undo(state));
  expect(state.document.nodes[0].label).toBe("Edit 5");
  for (let i = 0; i < 50; i++) state = committed(clock.redo(state));
  expect(state.document.nodes[0].label).toBe("Edit 55");
  expect(state.generation).toBe(155);
  expect(state.document.updatedAt).toBe(example.document.updatedAt);
});
