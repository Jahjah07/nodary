import { expect, test } from "vitest";
import { makeComponent } from "../../src/core/component-edits";
import { handles, type Edge, type Position } from "../../src/core/contracts";
import { componentRegistry } from "../../src/core/registry";
import { dashPattern, edgeLabel, halfPath, routeInk, worldAnchor, type Anchor } from "../../src/core/routes";
import { buildScene, fitScene } from "../../src/workspace/scene";
import { sampleDiagram } from "../../src/workspace/sample";

const card = makeComponent("flow.process", "", { x: 0, y: 0 });
if (card.type === "general.boundary") throw Error("test requires a node");
const node = card;
const position = (x: number, y: number) => ({ x, y });
const rect = (p: Position) => ({ ...p, ...node.size });
const anchor = (p: Position, handle: typeof handles[number]) => worldAnchor(node, rect(p), handle)!;
const defaults = componentRegistry.edgeDefaults;
const delta = (a: Position, b: Position) => ({ x: b.x - a.x, y: b.y - a.y });

test.each(handles.flatMap((source) => handles.map((target) => [source, target] as const)))(
  "CI-21 routes %s to %s across aligned, reversed, overlapping and coincident layouts",
  (source, target) => {
    const a = anchor(position(-10.25, 66.5), source);
    const localB = anchor(position(0, 0), target).point;
    const overlapping = position(a.point.x - localB.x, a.point.y - localB.y);
    for (const p of [position(480, -300), position(-550, 66.5), position(-20, 70), overlapping]) {
      const b = anchor(p, target);
      for (const route of ["straight", "orthogonal"] as const) {
        const result = routeInk(a, b, { ...defaults, route });
        expect(result).toEqual(routeInk(a, b, { ...defaults, route }));
        if (!result.ok) throw Error(JSON.stringify({ source, target, p, route, error: result.issues }));
        const { points, bounds } = result.value;
        expect(points[0]).toEqual(a.point);
        expect(points.at(-1)).toEqual(b.point);
        expect(points.length).toBeGreaterThanOrEqual(2);
        expect([...Object.values(bounds), ...points.flatMap(Object.values)].every(Number.isFinite)).toBe(true);
        const legs = points.slice(1).map((p, i) => delta(points[i], p));
        if (route === "straight" && p !== overlapping) expect(points).toHaveLength(2);
        else {
          expect(legs.every(({ x, y }) => (x === 0) !== (y === 0))).toBe(true);
          expect({ x: Math.sign(legs[0].x), y: Math.sign(legs[0].y) }).toEqual(a.direction);
          const last = legs.at(-1)!;
          expect({ x: Math.sign(last.x) || 0, y: Math.sign(last.y) || 0 }).toEqual({
            x: -b.direction.x || 0, y: -b.direction.y || 0,
          });
          if (route === "straight") expect(result.value.warning).toContain("overlap");
        }
      }
    }
  },
);

test("CI-22 marker modes avoid overrun, use canonical dash lengths and include label extents", () => {
  const a = anchor(position(0, 0), "right");
  const b = anchor(position(161, 0), "left");
  const style: Edge["style"] = { ...defaults.style, strokeStyle: "dashed", strokeWidth: 8 };
  expect(dashPattern(style)).toEqual([32, 24]);
  expect(dashPattern(defaults.style)).toBeUndefined();
  for (const [arrows, count] of [["none", 0], ["forward", 1], ["both", 2]] as const) {
    const result = routeInk(a, b, { route: "straight", arrows, style });
    if (!result.ok) throw Error("one world unit straight path must be finite");
    expect(result.value.arrows).toHaveLength(count);
    expect(result.value.arrows.flat().every(({ x }) => x >= 160 && x <= 161)).toBe(true);
    if (arrows === "both") expect(result.value.line[0].x).toBeLessThanOrEqual(result.value.line[1].x);
  }
  const points = [position(0, 0), position(10, 0), position(10, 90)];
  expect(halfPath(points)).toEqual({ x: 10, y: 40 });
  const label = edgeLabel({ style, label: `Long ${"message ".repeat(20)}\nSecond line` }, points, (line) => line.length * 10)!;
  expect(label.box.width).toBeLessThanOrEqual(240);
  expect(label.lines.length).toBeGreaterThan(2);
  expect(label.box.x + label.box.width / 2).toBe(10);
  expect(label.box.y + label.box.height / 2).toBe(40);
  expect(label.lines.join("")).toBe(`Long ${"message ".repeat(20)}Second line`);
  expect(edgeLabel({ style, label: "" }, points)).toBeNull();
});

test("shared scene bounds include a long label and reject nonfinite route inputs with a diagnostic", () => {
  const sample = sampleDiagram().document;
  sample.edges[0].label = "A".repeat(200);
  sample.edges[0].style.text.fontSize = 72;
  const scene = buildScene(sample);
  const { label, bounds } = scene.edges[0];
  expect(scene.diagnostics).toEqual([]);
  expect(bounds.y).toBeLessThanOrEqual(label!.box.y);
  expect(bounds.y + bounds.height).toBeGreaterThanOrEqual(label!.box.y + label!.box.height);
  expect(fitScene(scene.bounds, 1100, 900)).toMatchObject({ cropped: true, view: { zoom: .25 } });
  const canvas = { width: 1100, height: 1200 };
  const { view, cropped } = fitScene(scene.bounds, canvas.width, canvas.height);
  expect(cropped).toBe(false);
  expect(bounds.x * view.zoom + view.x).toBeGreaterThanOrEqual(0);
  expect((bounds.y + bounds.height) * view.zoom + view.y).toBeLessThanOrEqual(canvas.height);
  const a = anchor(position(0, 0), "right");
  const invalid: Anchor = { ...a, point: { x: Infinity, y: 0 } };
  expect(routeInk(a, invalid, defaults)).toMatchObject({ ok: false, issues: [{ code: "ROUTE_UNAVAILABLE" }] });
});
