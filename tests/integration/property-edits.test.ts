import { expect, test } from "vitest";
import { openCommandState, type CommandState } from "../../src/core/commands";
import { componentDispatcher, makeComponent } from "../../src/core/component-edits";
import type { Node, PortableDiagram } from "../../src/core/contracts";
import { indexHierarchy } from "../../src/core/geometry";
import { propertyFields, type PropertyEdit } from "../../src/core/properties";
import { componentRegistry } from "../../src/core/registry";
import { labelLayout, wrapLines, type Measure } from "../../src/core/visual";
import { blankDiagram, sampleDiagram } from "../../src/workspace/sample";
import { buildScene } from "../../src/workspace/scene";

const create = componentDispatcher();
function stateOf(fixture: PortableDiagram) {
  const opened = openCommandState(fixture);
  if (!opened.ok) throw Error(JSON.stringify(opened.issues));
  return opened.value;
}
function edit(state: CommandState, field: PropertyEdit["field"], value: PropertyEdit["value"], ...ids: string[]) {
  return create.dispatch(state, { type: "property", expectedGeneration: state.generation, payload: { field, value, ids } });
}
const id = (n: number) => `176d45d1-288a-47c6-9b9f-${n.toString(16).padStart(12, "0")}`;

test("CL-12 and CI-15 label and font growth preserve attached edges, ancestors and one-step undo", () => {
  const state = stateOf(sampleDiagram());
  const node = state.document.nodes[2];
  const before = buildScene(state.document);
  const text = `レビュー 🌏\n${"SuperLongWord ".repeat(50)}`;
  const labeled = edit(state, "label", text, node.id);
  expect(labeled.status).toBe("committed");
  expect(labeled.state.history.past).toHaveLength(1);
  expect(labeled.state.generation).toBe(state.generation + 1);
  expect(labeled.state.document.nodes[2].label).toBe(text);
  expect(labeled.state.document.nodes[2].size.height).toBeGreaterThan(node.size.height);
  expect(labeled.state.document.groups[0].size.height).toBeGreaterThan(state.document.groups[0].size.height);
  expect(labeled.state.document.edges).toEqual(state.document.edges);
  const after = buildScene(labeled.state.document);
  expect(after.edges[3].source.point.y).toBeGreaterThan(before.edges[3].source.point.y);
  expect(after.nodes[3].rect).toEqual(before.nodes[3].rect);
  expect(labelLayout(labeled.state.document.nodes[2]).fits).toBe(true);
  const undone = create.undo(labeled.state).state;
  expect(undone.document.nodes).toEqual(state.document.nodes);
  expect(undone.document.groups).toEqual(state.document.groups);
  const tiny = edit(labeled.state, "height", node.size.height, node.id);
  expect(tiny).toMatchObject({ status: "rejected", issues: [{ code: "CONTENT_DOES_NOT_FIT" }] });
  expect(tiny.state).toBe(labeled.state);
});

test("CI-17 applies only a compatible mixed field and rejects values outside the portable contract", () => {
  const state = stateOf(sampleDiagram());
  const [a, b, untouched] = state.document.nodes;
  const both = edit(state, "fill", "#DDEEFF", a.id, b.id);
  expect(both.status).toBe("committed");
  expect(both.state.document.nodes.slice(0, 2).map(({ style }) => style.fill)).toEqual(["#DDEEFF", "#DDEEFF"]);
  expect(both.state.document.nodes[2]).toEqual(untouched);
  expect(both.state.history.past).toHaveLength(1);
  expect(create.undo(both.state).state.document.nodes).toEqual(state.document.nodes);
  const edge = state.document.edges[0];
  for (const outcome of [
    edit(state, "fill", "#GGCCDD", a.id), edit(state, "text.fontSize", 7, a.id),
    edit(state, "text.fontSize", 73, a.id), edit(state, "strokeWidth", .3, edge.id),
    edit(state, "fillOpacity", 1.2, state.document.groups[0].id), edit(state, "x", Infinity, a.id),
    edit(state, "fill", "#DDEEFF", a.id, edge.id), edit(state, "label", "Shared", a.id, b.id),
  ]) {
    expect(outcome.status).toBe("rejected");
    expect(outcome.state).toBe(state);
  }
  const unchanged = edit(both.state, "fill", "#DDEEFF", a.id, b.id);
  expect(unchanged).toEqual({ status: "noop", state: both.state });
  expect(edit(state, "text.fontSize", 8, a.id).status).toBe("committed");
  expect(edit(state, "text.fontSize", 72, a.id).status).toBe("committed");
  expect(edit(state, "label", "raw\uFFFF", a.id)).toMatchObject({ status: "rejected", state,
    issues: [{ code: "INVALID_TEXT", codePoint: "U+FFFF" }] });
});

test("CL-14/15 exercises all architecture statuses and preserves the underlying custom paint", () => {
  const fixture = blankDiagram(id(0), "Status matrix", "architecture", new Date(0).toISOString());
  fixture.document.nodes = componentRegistry.components.filter(({ type }) => type.startsWith("arch."))
    .map(({ type }, i) => makeComponent(type, id(i + 1), { x: i * 240, y: 0 }) as Node);
  fixture.document.nodes.push(makeComponent("general.text", id(20), { x: 100, y: 500 }) as Node);
  const base = stateOf(fixture);
  const ids = fixture.document.nodes.slice(0, 14).map(({ id }) => id);
  let current = edit(base, "fill", "#182131", ...ids).state;
  for (const value of ["completed", "in_progress", "pending", "not_specified"] as const) {
    const result = edit(current, "status", value, ...ids);
    expect(result.status).toBe("committed");
    expect(result.state.document.nodes.slice(0, 14).every((node) =>
      node.status === value && node.style.fill === "#182131" && labelLayout(node).fits)).toBe(true);
    expect(create.undo(result.state).state.document.nodes).toEqual(current.document.nodes);
    current = result.state;
  }
  expect(edit(current, "status", "pending", id(20))).toMatchObject({ status: "rejected", state: current });
  expect(propertyFields(current.document.nodes.at(-1)!, true)).not.toContain("fill");
  expect(edit(current, "fill", "#FFFFFF", id(20))).toMatchObject({ status: "rejected", state: current });
  expect(edit(current, "stroke", "#152536", id(20))).toMatchObject({ status: "rejected", state: current });
});

test("boundary title growth preserves child world positions and numeric edits are exact with Snap on", () => {
  const fixture = sampleDiagram();
  fixture.document.settings.snapToGrid = true;
  const state = stateOf(fixture);
  const group = state.document.groups[1];
  const child = state.document.nodes[2];
  const changed = edit(state, "label", "Application\nServices\nOperations\nData", group.id);
  expect(changed.status).toBe("committed");
  const previous = indexHierarchy(state.document);
  const after = indexHierarchy(changed.state.document);
  if (!previous.ok || !after.ok) throw Error("Invalid hierarchy");
  expect(after.value.get(child.id)?.world).toEqual(previous.value.get(child.id)?.world);
  expect(after.value.get(group.id)!.world.y).toBeLessThan(previous.value.get(group.id)!.world.y);
  const moved = edit(changed.state, "x", 153.25, child.id);
  expect(moved.status).toBe("committed");
  expect(moved.state.document.nodes[2].position.x).toBe(153.25);
  const opacity = edit(moved.state, "fillOpacity", .57, group.id);
  expect(opacity.state.document.groups[1].style.fillOpacity).toBe(.57);
});

test("grapheme fallback retains Unicode and measured ink without mutating tabs or source text", () => {
  const measure: Measure = (text) => [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)].length;
  const text = "hello world\n\n👩🏽‍💻👩🏽‍💻\tÉ";
  const wrapped = wrapLines(text, 5, 14, measure);
  expect(wrapped.lines.slice(0, 3)).toEqual(["hello", " ", "world"]);
  expect(wrapped.lines).toContain("");
  expect(wrapped.lines.join("")).toBe(text.replaceAll("\n", "").replaceAll("\t", "    "));
  const denied = blankDiagram(id(0), "Limits", "general", new Date(0).toISOString());
  const square = makeComponent("flow.on_page_connector", id(1), { x: 999940, y: 0 }) as Node;
  denied.document.nodes.push(square);
  const state = stateOf(denied);
  const out = edit(state, "text.fontSize", 72, square.id);
  expect(out.status).toBe("rejected");
  expect(out.state).toBe(state);
});
