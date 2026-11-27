import { expect, test } from "vitest";
import { type DiagramDocument, parseStructure } from "../../src/core/contracts";
import { clientToWorld, expandBoundary, indexHierarchy, localToWorld, moveTransformRoots, reparent, resizeBoundary, snapWorld, validateContainment, worldToClient, worldToLocal } from "../../src/core/geometry";
import type { Result } from "../../src/core/validation";
import example from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";

function value<T>(result: Result<T>): T {
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}

function nested(): DiagramDocument {
  const { document } = value(parseStructure(example));
  const [outer, inner] = document.groups;
  const [worker, peer, outside] = document.nodes;
  Object.assign(outer, { position: { x: -200.5, y: -140.25 }, size: { width: 710, height: 520 }, parentId: null });
  Object.assign(inner, { position: { x: 65.5, y: 75.5 }, size: { width: 350, height: 280 }, parentId: outer.id });
  Object.assign(worker, { position: { x: 35.25, y: 55.125 }, parentId: inner.id });
  Object.assign(peer, { position: { x: 430, y: 140 }, parentId: outer.id });
  Object.assign(outside, { position: { x: 645, y: 170 }, parentId: null });
  document.groups = [inner, outer];
  document.nodes = [worker, peer, outside];
  document.edges = [{ ...document.edges[0], source: { nodeId: worker.id, handleId: "right" }, target: { nodeId: outside.id, handleId: "left" } }];
  return document;
}

test.each([0.25, 1, 1.25, 2])("CI-01 round-trips fractional local, world and client positions at zoom %s", (zoom) => {
  const local = { x: 20.25, y: -40.625 };
  const parent = { x: -300.5, y: -100.25 };
  const world = localToWorld(local, parent);
  const viewport = { x: 499, y: -112.25, zoom };
  const origin = { x: 312.5, y: 56.75 };
  expect(worldToLocal(world, parent)).toEqual(local);
  expect(clientToWorld(worldToClient(world, viewport, origin), viewport, origin)).toEqual(world);
  expect(snapWorld({ x: -10, y: 10 })).toEqual({ x: 0, y: 20 });
  expect(snapWorld({ x: -10.001, y: -30 })).toEqual({ x: -20, y: -20 });
});

test("DM-07 inherits movement once and explicitly reparents without snapping or changing the edge", () => {
  const document = nested();
  const [inner, outer] = document.groups;
  const worker = document.nodes[0].id;
  const old = value(indexHierarchy(document)).get(worker)!.world;
  const moved = value(moveTransformRoots(document, [outer.id, inner.id, worker], { x: 20, y: -40 }));
  expect(value(indexHierarchy(moved)).get(worker)!.world).toEqual({ x: old.x + 20, y: old.y - 40 });
  expect(moved.nodes[0].position).toEqual(document.nodes[0].position);
  const reparented = value(reparent(document, worker, outer.id));
  expect(value(indexHierarchy(reparented)).get(worker)!.world).toEqual(old);
  expect(reparented.nodes[0].parentId).toBe(outer.id);
  expect(reparented.edges).toEqual(document.edges);
  expect(value(indexHierarchy(value(reparent(reparented, worker, null)))).get(worker)!.world).toEqual(old);
  expect(reparent(document, outer.id, inner.id)).toMatchObject({ ok: false, issues: [{ code: "GROUP_CYCLE" }] });
});

test.each([{ x: -300, y: -250 }, { x: 800, y: 650 }])("DM-08 expands nested frames and preserves unaffected world positions for %j", (delta) => {
  const document = nested();
  const [worker, peer, outside] = document.nodes;
  const original = structuredClone(document);
  const before = value(indexHierarchy(document));
  const moved = value(moveTransformRoots(document, [worker.id], delta));
  const after = value(indexHierarchy(moved));
  expect(after.get(worker.id)!.world).toEqual(localToWorld(before.get(worker.id)!.world, delta));
  for (const node of [peer, outside]) expect(after.get(node.id)!.world).toEqual(before.get(node.id)!.world);
  expect(moved.groups.every((group, index) => group.size.width > document.groups[index].size.width)).toBe(true);
  expect(moved.edges).toEqual(document.edges);
  expect(document).toEqual(original);
});

test("DM-08 rejects an impossible shrink and invalid world bounds without modifying the source", () => {
  const document = nested();
  const original = structuredClone(document);
  expect(resizeBoundary(document, document.groups[0].id, { width: 160, height: 100 }).ok).toBe(false);
  expect(moveTransformRoots(document, [document.nodes[0].id], { x: 1e6, y: 0 }).ok).toBe(false);
  expect(document).toEqual(original);
});

test("DM-08 accepts measured ink and width-dependent title insets while preserving world positions", () => {
  const document = nested();
  const worker = document.nodes[0];
  const [inner] = document.groups;
  const before = value(indexHierarchy(document)).get(worker.id)!.world;
  const metrics = {
    visualBounds: (item: DiagramDocument["nodes"][number] | DiagramDocument["groups"][number]) =>
      ({ x: -2, y: -2, width: item.size.width + 4, height: item.size.height + 4 }),
    titleHeight: () => 70,
  };
  expect(validateContainment(document, metrics).ok).toBe(false);
  const expanded = value(expandBoundary(document, inner.id, metrics));
  expect(validateContainment(expanded, metrics).ok).toBe(true);
  expect(value(indexHierarchy(expanded)).get(worker.id)!.world).toEqual(before);
});
