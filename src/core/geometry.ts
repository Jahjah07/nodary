import type { Boundary, DiagramDocument, Position, Size, Viewport } from "./contracts";
import { contains, geometryEpsilon, padding, validateGraph, validWorldRect, type Rect } from "./graph";
import { add, indexHierarchy, origin, subtract, type Placed } from "./hierarchy";
import type { Immutable } from "./immutable";
import { fail, limits, type Issue, type Result } from "./validation";

export const localToWorld = add;
export const worldToLocal = subtract;
export function worldToClient(world: Position, viewport: Viewport, canvasOrigin: Position): Position {
  return add(canvasOrigin, { x: world.x * viewport.zoom + viewport.x, y: world.y * viewport.zoom + viewport.y });
}
export function clientToWorld(client: Position, viewport: Viewport, canvasOrigin: Position): Position {
  const relative = subtract(subtract(client, canvasOrigin), viewport);
  return { x: relative.x / viewport.zoom, y: relative.y / viewport.zoom };
}
export function snapWorld(point: Position): Position {
  return { x: 20 * Math.floor(point.x / 20 + 0.5), y: 20 * Math.floor(point.y / 20 + 0.5) };
}

// DGS-07 scene measurements are optional at the canonical rectangle foundation.
export type ContainmentMetrics = {
  visualBounds(item: Immutable<Placed>): Rect;
  titleHeight(boundary: Immutable<Boundary>): number;
};
type Snapshot = Immutable<DiagramDocument>;

function invalid(message: string): Issue {
  return { code: "INVALID_GEOMETRY", path: ["document", "groups"], message };
}

function extent(item: Immutable<Placed>, metrics?: ContainmentMetrics): Rect {
  const measured = metrics?.visualBounds(item);
  if (!measured) return { ...item.position, ...item.size };
  const x = Math.min(0, measured.x);
  const y = Math.min(0, measured.y);
  return {
    x: item.position.x + x, y: item.position.y + y,
    width: Math.max(item.size.width, measured.x + measured.width) - x,
    height: Math.max(item.size.height, measured.y + measured.height) - y,
  };
}

function insets(frame: Immutable<Boundary>, metrics?: ContainmentMetrics) {
  const height = metrics?.titleHeight(frame) ?? 0;
  return { ...padding, top: Math.max(padding.top, 16 + height + frame.style.strokeWidth) };
}

function childrenOf<D extends Snapshot>(document: D, parentId: string): (D["nodes"][number] | D["groups"][number])[] {
  return [...document.nodes, ...document.groups].filter((item) => item.parentId === parentId);
}

function contained(frame: Immutable<Boundary>, children: readonly Immutable<Placed>[], metrics?: ContainmentMetrics): boolean {
  const inset = insets(frame, metrics);
  return inset.top <= frame.size.height && children.every((child) => contains(frame.size, extent(child, metrics), inset));
}

export function validateContainment<D extends Snapshot>(document: D, metrics?: ContainmentMetrics): Result<D> {
  const graph = validateGraph(document);
  if (!graph.ok) return graph;
  for (const frame of document.groups) {
    if (!contained(frame, childrenOf(document, frame.id), metrics)) {
      return fail(invalid("Visual bounds or the title exceed the boundary's content area."));
    }
  }
  return graph;
}

function expandFrame(document: DiagramDocument, frame: Boundary, metrics?: ContainmentMetrics): Issue | undefined {
  const children = childrenOf(document, frame.id);
  for (let pass = 0; pass < 8; pass++) {
    if (contained(frame, children, metrics)) return;
    const inset = insets(frame, metrics);
    const bounds = children.map((child) => extent(child, metrics));
    const left = Math.min(0, ...bounds.map((box) => box.x - inset.left));
    const top = Math.min(0, ...bounds.map((box) => box.y - inset.top));
    const right = Math.max(frame.size.width, ...bounds.map((box) => box.x + box.width + inset.right));
    const bottom = Math.max(frame.size.height, inset.top, ...bounds.map((box) => box.y + box.height + inset.bottom));
    const delta = { x: left, y: top };
    frame.position = add(frame.position, delta);
    frame.size = { width: right - left, height: bottom - top };
    if (![...Object.values(frame.position), ...Object.values(frame.size)].every(Number.isFinite) ||
      frame.size.width > limits.size || frame.size.height > limits.size) {
      return invalid("Boundary expansion exceeds canonical geometry limits.");
    }
    for (const child of children) child.position = subtract(child.position, delta);
  }
  if (!contained(frame, children, metrics)) return invalid("Boundary measurements did not converge.");
}

function expandParents(document: DiagramDocument, parents: Iterable<string>, metrics?: ContainmentMetrics): Result<DiagramDocument> {
  const indexed = indexHierarchy(document);
  if (!indexed.ok) return indexed;
  const groups = new Map(document.groups.map((group) => [group.id, group]));
  const affected = new Set<string>();
  for (const id of parents) {
    let current: string | null = id;
    while (current !== null && !affected.has(current)) {
      const frame = groups.get(current);
      if (!frame) return fail({ code: "INVALID_PARENT", path: ["document", "groups"], message: "Boundary does not exist." });
      affected.add(current);
      current = frame.parentId;
    }
  }
  for (const id of [...affected].sort((a, b) => indexed.value.get(b)!.depth - indexed.value.get(a)!.depth)) {
    const issue = expandFrame(document, groups.get(id)!, metrics);
    if (issue) return fail(issue);
  }
  return validateContainment(document, metrics);
}

export function expandBoundary(document: Snapshot, id: string, metrics?: ContainmentMetrics): Result<DiagramDocument> {
  return expandParents(structuredClone(document) as DiagramDocument, [id], metrics);
}

export function reparent(document: Snapshot, id: string, parentId: string | null, metrics?: ContainmentMetrics): Result<DiagramDocument> {
  const draft = structuredClone(document) as DiagramDocument;
  const index = indexHierarchy(draft);
  if (!index.ok) return index;
  const child = index.value.get(id);
  const parent = parentId === null ? undefined : index.value.get(parentId);
  if (!child || (parentId !== null && parent?.item.type !== "general.boundary")) {
    return fail({ code: "INVALID_PARENT", path: ["document", "groups"], message: "Object and destination boundary must exist." });
  }
  child.item.position = subtract(child.world, parent?.world ?? origin());
  child.item.parentId = parentId;
  return expandParents(draft, parentId === null ? [] : [parentId], metrics);
}

export function moveTransformRoots(document: Snapshot, ids: readonly string[], delta: Position, metrics?: ContainmentMetrics): Result<DiagramDocument> {
  const draft = structuredClone(document) as DiagramDocument;
  const index = indexHierarchy(draft);
  if (!index.ok) return index;
  const selection = new Set(ids);
  const parents: string[] = [];
  for (const id of selection) {
    const entry = index.value.get(id);
    if (!entry) return fail(invalid("Transform target does not exist."));
    let ancestor = entry.item.parentId;
    while (ancestor !== null && !selection.has(ancestor)) ancestor = index.value.get(ancestor)!.item.parentId;
    if (ancestor !== null) continue;
    entry.item.position = add(entry.item.position, delta);
    if (entry.item.parentId !== null) parents.push(entry.item.parentId);
  }
  return expandParents(draft, parents, metrics);
}

export function resizeBoundary(document: Snapshot, id: string, size: Size, metrics?: ContainmentMetrics): Result<DiagramDocument> {
  const draft = structuredClone(document) as DiagramDocument;
  const frame = draft.groups.find((group) => group.id === id);
  if (!frame || !validWorldRect({ ...origin(), ...size })) return fail(invalid("Invalid boundary or requested size."));
  frame.size = { ...size };
  if (!contained(frame, childrenOf(draft, frame.id), metrics)) return fail(invalid("Requested boundary size would hide content."));
  return expandParents(draft, frame.parentId === null ? [] : [frame.parentId], metrics);
}

export { geometryEpsilon, indexHierarchy };
