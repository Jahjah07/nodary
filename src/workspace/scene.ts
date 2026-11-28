import type { Boundary, Edge, Node, Position, Viewport } from "../core/contracts";
import { clientToWorld } from "../core/geometry";
import type { Rect } from "../core/graph";
import type { Immutable } from "../core/immutable";
import { componentFor } from "../core/registry";

import { hitVisual, visualOf } from "../core/visual";
import { worldAnchor, type Anchor } from "../core/routes";
import type { Endpoint } from "../core/edge-edits";

import type { Scene } from "../core/scene";
export { buildScene, projectConnection, type Scene, type SceneEdge } from "../core/scene";
export type SceneAnchor = Anchor & { endpoint: Endpoint };

const addStroke = ({ x, y, width, height }: Rect, pad: number): Rect =>
  ({ x: x - pad, y: y - pad, width: width + 2 * pad, height: height + 2 * pad });

export function rectBetween(a: Position, b: Position): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

export function connectionAnchor(scene: Pick<Scene, "nodes">, endpoint: Endpoint) {
  const node = scene.nodes.find(({ item }) => item.id === endpoint.nodeId);
  return node && worldAnchor(node.item, node.rect, endpoint.handleId);
}

export function connectionAnchors(scene: Scene): SceneAnchor[] {
  return scene.nodes.flatMap(({ item, rect }) => componentFor(item.type).allowedHandles.map((handleId) => ({
    ...worldAnchor(item, rect, handleId)!, endpoint: { nodeId: item.id, handleId },
  })));
}

const contains = (box: Rect, point: Position) =>
  point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height;
const inside = (area: Rect, box: Rect) =>
  contains(area, box) && contains(area, { x: box.x + box.width, y: box.y + box.height });

function distance(point: Position, a: Position, b: Position): number {
  const x = b.x - a.x;
  const y = b.y - a.y;
  const length = x * x + y * y;
  const t = length ? Math.max(0, Math.min(1, ((point.x - a.x) * x + (point.y - a.y) * y) / length)) : 0;
  return Math.hypot(point.x - a.x - t * x, point.y - a.y - t * y);
}
function roundedContains(box: Rect, point: Position, padding: number) {
  const corner = Math.min(8, box.width / 2, box.height / 2);
  const x = Math.max(box.x + corner, Math.min(point.x, box.x + box.width - corner));
  const y = Math.max(box.y + corner, Math.min(point.y, box.y + box.height - corner));
  return Math.hypot(point.x - x, point.y - y) <= corner + padding;
}

// DGS-07 §4. Layers remain stable even when React Flow reorders its internal DOM.
export function hitTest(scene: Scene, point: Position, zoom: number): string | null {
  for (const edge of scene.edges.toReversed()) if (edge.label && contains(edge.label.box, point)) return edge.item.id;
  for (const group of scene.groups.toReversed()) if (group.title && contains(group.title, point)) return group.item.id;
  for (const node of scene.nodes.toReversed()) {
    if (hitVisual(visualOf(node.item), node.item.size, { x: point.x - node.rect.x, y: point.y - node.rect.y },
      node.item.style.strokeWidth / 2 + 2 / zoom)) return node.item.id;
  }
  for (const edge of scene.edges.toReversed()) {
    const tolerance = Math.max(6 / zoom, edge.item.style.strokeWidth / 2 + 4 / zoom);
    if (edge.points.slice(1).some((p, i) => distance(point, edge.points[i], p) <= tolerance)) return edge.item.id;
  }
  for (const group of scene.groups.toReversed()) {
    const tolerance = Math.max(4 / zoom, group.item.style.strokeWidth / 2);
    if (roundedContains(group.rect, point, tolerance) && !contains(addStroke(group.rect, -tolerance), point)) return group.item.id;
  }
  return null;
}

export const objectsIn = (scene: Scene, area?: Rect) => [...scene.groups, ...scene.nodes, ...scene.edges]
  .filter(({ bounds }) => !area || inside(area, bounds)).map(({ item }) => item.id);

export function objectName(item: Immutable<Node | Boundary | Edge>, scene: Scene) {
  if ("title" in item) return item.title || "Boundary";
  if ("type" in item) return item.label || componentFor(item.type).displayName;
  if (item.label) return item.label;
  const label = (id: string) => scene.nodes.find(({ item }) => item.id === id)?.item.label || "Node";
  return `${label(item.source.nodeId)} → ${label(item.target.nodeId)}`;
}

export const originView: Viewport = { x: 0, y: 0, zoom: 1 };
const clampZoom = (zoom: number) => Math.min(2, Math.max(.25, zoom));
export const clampTranslation = (value: number) => Math.min(4e6, Math.max(-4e6, value));
export function zoomAt(view: Viewport, requested: number, pivot: Position): Viewport {
  const zoom = clampZoom(requested);
  const world = clientToWorld(pivot, view, originView);
  return { x: clampTranslation(pivot.x - world.x * zoom), y: clampTranslation(pivot.y - world.y * zoom), zoom };
}
export function fitScene(bounds: Rect | null, width: number, height: number) {
  if (!bounds || width <= 0 || height <= 0) return { view: originView, cropped: false };
  const pad = Math.min(48, Math.min(width, height) / 4);
  const requested = Math.min((width - 2 * pad) / Math.max(bounds.width, 1), (height - 2 * pad) / Math.max(bounds.height, 1));
  const zoom = clampZoom(requested);
  return { view: { x: clampTranslation(width / 2 - (bounds.x + bounds.width / 2) * zoom),
    y: clampTranslation(height / 2 - (bounds.y + bounds.height / 2) * zoom), zoom }, cropped: requested < .25 };
}
