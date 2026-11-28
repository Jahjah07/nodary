import { expect, test } from "vitest";
import { editSession, openSession, viewSession } from "../../src/application/document-session";
import { type CommandState, type Outcome } from "../../src/core/commands";
import { componentDispatcher, makeComponent, type ComponentEdit } from "../../src/core/component-edits";
import { parsePortable } from "../../src/core/graph";
import { indexHierarchy } from "../../src/core/hierarchy";
import type { Node } from "../../src/core/contracts";
import type { PropertyField } from "../../src/core/properties";
import { limits, type Result } from "../../src/core/validation";
import { createMemoryDocumentRepository } from "../../src/infrastructure/memory-document-repository";
import { buildScene } from "../../src/workspace/scene";
import { blankDiagram } from "../../src/workspace/sample";
import reference from "../fixtures/benchmark/DGS-10_Reference_Benchmark_100N_150E_v1.json";

const dispatcher = componentDispatcher();
const id = (n: number) => `9edc6d05-ec8d-4bfe-8568-${n.toString(16).padStart(12, "0")}`;
const graph = ({ document: { nodes, groups, edges } }: CommandState) => ({ nodes, groups, edges });
function value<T>(result: Result<T>): T {
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}

test("DM-24 / CI-30 restores every checkpoint across 50 mixed reference-workload transactions", async () => {
  const repo = createMemoryDocumentRepository();
  value(await repo.create(reference));
  const record = value(await repo.open(reference.document.id));
  let session = value(openSession("primary", repo, record));
  const initial = graph(session.editor);
  expect(initial.nodes).toHaveLength(100);
  expect(initial.edges).toHaveLength(150);
  expect(initial.groups.some(({ parentId }) => parentId)).toBe(true);
  const checkpoints = [initial];
  function apply(edit: (state: CommandState) => Outcome, graphEdit = true) {
    const previous = session;
    const { outcome, session: next } = editSession(session, edit);
    if (outcome.status !== "committed") throw Error(JSON.stringify(outcome.status === "rejected" ? outcome.issues : outcome.status));
    expect(next.editor.generation).toBe(previous.editor.generation + 1);
    expect(next.editor.document.updatedAt >= previous.editor.document.updatedAt).toBe(true);
    expect(next.revision).toBe(record.record.revision);
    if (graphEdit) {
      expect(next.editor.history.past).toHaveLength(checkpoints.length);
      checkpoints.push(graph(next.editor));
    }
    session = next;
  }
  const component = (payload: ComponentEdit) => apply((state) => dispatcher.dispatch(state, { type: "component", payload }));
  const property = (ids: string[], field: PropertyField, value: string | number) =>
    apply((state) => dispatcher.dispatch(state, { type: "property", payload: { ids, field, value } }));
  const [a, b, c, outer, inner, link] = [1, 2, 3, 4, 5, 6].map(id);
  const insert = (key: string, type: "arch.server" | "general.boundary", x: number, y: number) =>
    component({ kind: "insert", type, id: key, position: { x, y } });
  const endpoint = (nodeId: string, handleId: "left" | "right" | "top") => ({ nodeId, handleId });
  insert(a, "arch.server", 3600, 750);
  insert(b, "arch.server", 3840, 750);
  insert(c, "arch.server", 4210, 920);
  insert(outer, "general.boundary", 3500, 590);
  const roots = [a, b];
  component({ kind: "move", ids: roots, reference: a, delta: { x: 20, y: 20 } });
  const node = session.editor.document.nodes.find(({ id }) => id === a)!;
  component({ kind: "resize", id: a, rect: { ...node.position, width: node.size.width + 28, height: node.size.height } });
  property(roots, "fill", "#DBEAFE");
  property([a], "status", "completed");
  apply((s) => dispatcher.dispatch(s, { type: "edge", payload: {
    kind: "connect", id: link, source: endpoint(a, "right"), target: endpoint(b, "left"),
  } }));
  apply((s) => dispatcher.dispatch(s, { type: "edge", payload: {
    kind: "reconnect", id: link, side: "target", endpoint: endpoint(b, "top"),
  } }));
  property([link], "route", "straight");
  property([link], "arrows", "both");
  property([link], "label", "Internal link");
  apply((s) => dispatcher.dispatch(s, { type: "hierarchy", payload: { kind: "group", ids: roots, id: inner } }));
  apply((s) => dispatcher.dispatch(s, { type: "hierarchy", payload: { kind: "reparent", ids: [inner], parentId: outer } }));
  property([inner], "label", "Private services\nApplication tier\nWorker ownership");
  property([a], "label", "Queue processing".repeat(14));
  const beforeExpansion = value(indexHierarchy(session.editor.document)).get(outer)!.item.size;
  component({ kind: "move", ids: [a], reference: a, delta: { x: -140, y: -180 } });
  expect(value(indexHierarchy(session.editor.document)).get(outer)!.item.size.height).toBeGreaterThan(beforeExpansion.height);
  apply((s) => dispatcher.dispatch(s, { type: "hierarchy", payload: { kind: "duplicate", ids: [inner, a],
    copies: { [inner]: id(11), [a]: id(12), [b]: id(13), [link]: id(14) } } }));
  apply((s) => dispatcher.dispatch(s, { type: "hierarchy", payload: { kind: "ungroup", ids: [id(11)] } }));
  apply((s) => dispatcher.dispatch(s, { type: "hierarchy", payload: { kind: "delete", ids: [b] } }));
  expect(session.editor.document.edges.some(({ id }) => id === link)).toBe(false);
  for (let i = checkpoints.length; i <= 50; i++) {
    if (i % 2) property([c], "label", `Gateway instance ${i}`);
    else component({ kind: "nudge", ids: [c], reference: c, delta: { x: 20, y: 0 } });
  }
  expect(session.editor.history.past).toHaveLength(50);
  const viewport = { x: -182.5, y: 240, zoom: .75 };
  session = value(viewSession(session, viewport, [c]));
  const expectedGeneration = session.editor.generation;
  const compare = (i: number) => {
    expect(graph(session.editor)).toEqual(checkpoints[i]);
    expect(session.editor.view.viewport).toEqual(viewport);
    expect(session.editor.view.selection).toEqual(i >= 3 ? [c] : []);
    expect(parsePortable({ document: session.editor.document, viewport }).ok).toBe(true);
  };
  for (let i = 49; i >= 0; i--) {
    apply(dispatcher.undo, false);
    compare(i);
    if (i === 0) expect(dispatcher.undo(session.editor)).toEqual({ status: "noop", state: session.editor });
  }
  expect(session.editor.generation).toBe(expectedGeneration + 50);
  const future = session.editor.history.future;
  apply((s) => dispatcher.dispatch(s, { type: "toggle", payload: "gridVisible" }), false);
  const settings = session.editor.document.settings;
  expect(session.editor.history.future).toBe(future);
  for (let i = 1; i <= 50; i++) {
    apply(dispatcher.redo, false);
    expect(graph(session.editor)).toEqual(checkpoints[i]);
    expect(session.editor.view.selection).toEqual([]);
    expect(session.editor.document.settings).toEqual(settings);
    expect(session.editor.document.title).toBe(reference.document.title);
    expect(session.editor.view.viewport).toEqual(viewport);
    expect(parsePortable({ document: session.editor.document, viewport }).ok).toBe(true);
  }
  expect(session.editor.generation).toBe(expectedGeneration + 101);
  expect(buildScene(session.editor.document).edges.map(({ item }) => item.id)).toContain(id(14));
  expect(dispatcher.redo(session.editor)).toEqual({ status: "noop", state: session.editor });
  apply(dispatcher.undo, false);
  session = value(viewSession(session, viewport, [c]));
  expect(session.editor.history.future).toHaveLength(1);
  const branch = dispatcher.dispatch(session.editor, { type: "property", payload: { ids: [c], field: "label", value: "New branch" } });
  expect(branch).toMatchObject({ status: "committed", state: { history: { future: [] } } });
  const reopened = value(openSession("fresh", repo, record));
  expect(reopened.editor.history).toEqual({ past: [], future: [] });
});

test("CI-33 rejects invalid, stale and over-limit graph previews and history restoration atomically", async () => {
  const source = blankDiagram(id(0), "Resource fixture", "architecture", new Date(0).toISOString());
  source.document.nodes = Array.from({ length: limits.nodes }, (_, i) =>
    makeComponent("arch.server", id(i + 1), { x: (i % 50) * 145, y: Math.floor(i / 50) * 120 }) as Node);
  const repo = createMemoryDocumentRepository();
  value(await repo.create(source));
  const { editor } = value(openSession("resource", repo, value(await repo.open(id(0)))));
  const add = { type: "component", payload: { kind: "insert", type: "arch.server", id: id(3000), position: { x: 0, y: 0 } } } as const;
  expect(dispatcher.preview(editor, add)).toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED" }] });
  expect(dispatcher.dispatch(editor, add)).toMatchObject({ status: "rejected", state: editor });
  expect(dispatcher.preview(editor, { ...add, expectedGeneration: editor.generation + 1 })).toMatchObject({
    ok: false, issues: [{ code: "STALE_GENERATION" }],
  });
  const invalid = { ...graph(editor), nodes: [...editor.document.nodes, editor.document.nodes[0]] };
  const corrupt = { ...editor, history: { past: [invalid], future: [invalid] } };
  expect(dispatcher.undo(corrupt)).toMatchObject({ status: "rejected", state: corrupt });
  expect(dispatcher.redo(corrupt)).toMatchObject({ status: "rejected", state: corrupt });
  expect(editor.generation).toBe(0);
  expect(editor.history).toEqual({ past: [], future: [] });
});
