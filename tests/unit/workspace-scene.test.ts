import { expect, test } from "vitest";
import { parsePortable } from "../../src/core/graph";
import { clientToWorld } from "../../src/core/geometry";
import { sampleDiagram } from "../../src/workspace/sample";
import { buildScene, fitScene, hitTest, objectsIn, originView, zoomAt } from "../../src/workspace/scene";

test("T-03-02 projects the validated synthetic graph in world space without rewriting IDs or coordinates", () => {
  const source = sampleDiagram();
  const before = JSON.stringify(source);
  const parsed = parsePortable(source);
  expect(parsed.ok, JSON.stringify(parsed.ok ? [] : parsed.issues)).toBe(true);
  if (!parsed.ok) return;
  parsed.value.document.groups.reverse();
  const scene = buildScene(parsed.value.document);
  expect(scene.groups.map(({ item }) => item.title)).toEqual(["Production environment", "Application services"]);
  const node = scene.nodes.find(({ item }) => item.label === "Sample service")!;
  expect(node.item.position).toEqual({ x: 34, y: 60 });
  expect(node.rect).toMatchObject({ x: 279, y: 124, width: 176, height: 76 });
  expect(scene.edges.map(({ item }) => item.id)).toEqual(source.document.edges.map(({ id }) => id));
  expect(JSON.stringify(source)).toBe(before);
});

test("CI-02/04 clamps zoom and fits the supported scene without changing pointer world position", () => {
  const scene = buildScene(sampleDiagram().document);
  const pivot = { x: 280.625, y: 160.25 };
  const start = { x: 120.5, y: 13, zoom: .75 };
  const world = clientToWorld(pivot, start, originView);
  for (const requested of [.1, 1.4, 10]) {
    const next = zoomAt(start, requested, pivot);
    const atPointer = clientToWorld(pivot, next, originView);
    expect(atPointer.x).toBeCloseTo(world.x, 10);
    expect(atPointer.y).toBeCloseTo(world.y, 10);
    expect(next.zoom).toBe(Math.max(.25, Math.min(2, requested)));
  }
  expect(fitScene(null, 1000, 690)).toEqual({ view: originView, cropped: false });
  expect(fitScene(scene.bounds, 104, 104)).toMatchObject({ view: { zoom: .25 }, cropped: true });
  const fit = fitScene(scene.bounds, 936, 620);
  expect(fit.cropped).toBe(false);
  expect(scene.bounds!.x * fit.view.zoom + fit.view.x).toBeGreaterThanOrEqual(48 - 1e-6);
});

test("CI-07/08 resolves label, title, object and border targets and requires full marquee containment", () => {
  const scene = buildScene(sampleDiagram().document);
  const [outer, inner] = scene.groups;
  const client = scene.nodes[0];
  const label = scene.edges[0].label!;
  expect(hitTest(scene, { x: label.x + 2, y: label.y + 2 }, 1)).toBe(scene.edges[0].item.id);
  expect(hitTest(scene, { x: inner.title!.x + 3, y: inner.title!.y + 3 }, 1)).toBe(inner.item.id);
  expect(hitTest(scene, { x: outer.rect.x + 1, y: outer.rect.y + 300 }, 1)).toBe(outer.item.id);
  expect(hitTest(scene, { x: outer.rect.x + 30, y: outer.rect.y + 300 }, 1)).toBeNull();
  const overlapped = { ...scene, nodes: [client, { ...client, item: scene.nodes[1].item }] };
  const middle = { x: client.rect.x + client.rect.width / 2, y: client.rect.y + client.rect.height / 2 };
  expect(hitTest(overlapped, middle, 1)).toBe(scene.nodes[1].item.id);
  const coveringEdge = { ...scene.edges[0], label: { ...middle, width: 20, height: 15 } };
  expect(hitTest({ ...overlapped, edges: [coveringEdge] }, middle, 1)).toBe(coveringEdge.item.id);
  const box = client.bounds;
  expect(objectsIn(scene, { ...box, width: box.width - 1 })).toEqual([]);
  expect(objectsIn(scene, box)).toEqual([client.item.id]);
});
