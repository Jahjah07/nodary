import type { Boundary, DiagramDocument, Edge, Node, Position, Viewport } from "../core/contracts";
import { clientToWorld, indexHierarchy } from "../core/geometry";
import type { Rect } from "../core/graph";
import type { Immutable } from "../core/immutable";
import { componentFor } from "../core/registry";

import { hitVisual, labelLayout, visualOf, type Measure } from "../core/visual";

type Box<T> = { item: Immutable<T>; rect: Rect; bounds: Rect };
type SceneEdge = { item: Immutable<Edge>; points: Position[]; arrows: Position[][]; label: Rect | null; bounds: Rect };
export type Scene = {
  nodes: Box<Node>[];
  groups: (Box<Boundary> & { title: Rect | null; depth: number })[];
  edges: SceneEdge[];
  bounds: Rect | null;
};

const addStroke = ({ x, y, width, height }: Rect, pad: number): Rect =>
  ({ x: x - pad, y: y - pad, width: width + 2 * pad, height: height + 2 * pad });

export function rectBetween(a: Position, b: Position): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function union(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((box) => box.x));
  const y = Math.min(...rects.map((box) => box.y));
  const right = Math.max(...rects.map((box) => box.x + box.width));
  const bottom = Math.max(...rects.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}

const pointsBounds = (points: Position[]): Rect => union(points.map((point) => ({ ...point, width: 0, height: 0 })))!;
const direction = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] } as const;
function anchor(box: Box<Node>, handle: Edge["source"]["handleId"]): Position {
  const offset = visualOf(box.item).anchors.find(({ id }) => id === handle)!.position;
  return { x: box.rect.x + offset.x, y: box.rect.y + offset.y };
}
function marker(tip: Position, previous: Position, stroke: number): Position[] {
  const distance = Math.hypot(tip.x - previous.x, tip.y - previous.y);
  if (!distance) return [];
  const length = Math.min(distance, Math.max(8, 4 * stroke));
  const half = Math.max(6, 3 * stroke) / 2 * length / Math.max(8, 4 * stroke);
  const x = (tip.x - previous.x) / distance;
  const y = (tip.y - previous.y) / distance;
  const base = { x: tip.x - x * length, y: tip.y - y * length };
  return [tip, { x: base.x + y * half, y: base.y - x * half }, { x: base.x - y * half, y: base.y + x * half }];
}
function pathMidpoint(points: Position[]): Position {
  const segments = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let remaining = segments.reduce((total, length) => total + length, 0) / 2;
  for (const [i, length] of segments.entries()) {
    if (length > 0 && remaining <= length) {
      const t = remaining / length;
      return { x: points[i].x + t * (points[i + 1].x - points[i].x), y: points[i].y + t * (points[i + 1].y - points[i].y) };
    }
    remaining -= length;
  }
  return points[0];
}

// DGS-06 component geometry and the Phase 03 representative connector routes.
export function buildScene(document: Immutable<DiagramDocument>, measure?: Measure): Scene {
  const hierarchy = indexHierarchy(document);
  if (!hierarchy.ok) throw Error("Scene requires a validated hierarchy.");
  const box = (item: Immutable<Node | Boundary>) => {
    const rect = { ...hierarchy.value.get(item.id)!.world, ...item.size };
    const local = visualOf(item).bounds;
    return { rect, bounds: { ...local, x: rect.x + local.x, y: rect.y + local.y } };
  };
  const nodes = document.nodes.map((item) => ({ item, ...box(item) }));
  const lookup = new Map(nodes.map((node) => [node.item.id, node]));
  const groups = document.groups.map((item) => {
    const geometry = box(item);
    const { x, y } = geometry.rect;
    const region = visualOf(item).region;
    const height = labelLayout(item, measure).height;
    return { item, ...geometry, depth: hierarchy.value.get(item.id)!.depth,
      title: item.title ? { ...region, x: x + region.x, y: y + region.y, height: Math.max(region.height, height) } : null };
  }).sort((a, b) => a.depth - b.depth);
  const edges = document.edges.map((item) => {
    const start = anchor(lookup.get(item.source.nodeId)!, item.source.handleId);
    const end = anchor(lookup.get(item.target.nodeId)!, item.target.handleId);
    const points = [start];
    if (item.route === "orthogonal" && start.x !== end.x && start.y !== end.y) {
      if (direction[item.source.handleId][0]) {
        const x = (start.x + end.x) / 2;
        points.push({ x, y: start.y }, { x, y: end.y });
      } else {
        const y = (start.y + end.y) / 2;
        points.push({ x: start.x, y }, { x: end.x, y });
      }
    }
    points.push(end);
    const arrows: Position[][] = [];
    if (item.arrows !== "none") arrows.push(marker(end, points.at(-2)!, item.style.strokeWidth));
    if (item.arrows === "both") arrows.push(marker(start, points[1], item.style.strokeWidth));
    const center = pathMidpoint(points);
    const width = Math.min(240, Math.max(38, item.label.length * item.style.text.fontSize * .55 + 16));
    const height = item.style.text.fontSize + 8;
    const label = item.label ? { x: center.x - width / 2, y: center.y - height / 2, width, height } : null;
    const bounds = union([addStroke(pointsBounds([...points, ...arrows.flat()]), item.style.strokeWidth / 2), ...(label ? [label] : [])])!;
    return { item, points, arrows, label, bounds };
  });
  return { nodes, groups, edges, bounds: union([...nodes, ...groups, ...edges].map(({ bounds }) => bounds)) };
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
  for (const edge of scene.edges.toReversed()) if (edge.label && contains(edge.label, point)) return edge.item.id;
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
