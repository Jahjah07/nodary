import type { Edge, Node, Position } from "./contracts";
import type { Rect } from "./graph";
import { add, subtract } from "./hierarchy";
import type { Immutable } from "./immutable";
import { fail, ok, type Result } from "./validation";
import { approximate, inset, lineMetrics, visualOf, wrapLines, type Measure } from "./visual";

export type Anchor = { point: Position; direction: Position; rect: Rect; stroke: number };
type Ink = { points: Position[]; line: Position[]; arrows: Position[][]; bounds: Rect; warning?: string };
const point = (x: number, y: number) => ({ x, y });
const scale = (p: Position, factor: number) => point(p.x * factor, p.y * factor);
const dot = (a: Position, b: Position) => a.x * b.x + a.y * b.y;
const cross = (a: Position, b: Position) => a.x * b.y - a.y * b.x;
const length = (a: Position, b: Position) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (a: Position, b: Position) => scale(subtract(b, a), 1 / length(a, b));
const positive = (a: Position, b: Position) => cross(a, b) === 0 && dot(a, b) > 0;
const unavailable = () => fail({ code: "ROUTE_UNAVAILABLE", path: ["edges"], message: "A visible path could not be calculated for these connection points." });

export function worldAnchor(node: Immutable<Node>, rect: Rect, id: Edge["source"]["handleId"]): Anchor | undefined {
  const anchor = visualOf(node).anchors.find((handle) => handle.id === id);
  return anchor && { point: add(rect, anchor.position), direction: anchor.direction, rect, stroke: node.style.strokeWidth };
}

function simplify(points: Position[]) {
  const result: Position[] = [];
  for (const vertex of points) {
    const last = result.at(-1);
    if (last && length(last, vertex) === 0) continue;
    if (result.length > 1 && positive(subtract(last!, result.at(-2)!), subtract(vertex, last!))) result.pop();
    result.push(vertex);
  }
  return result;
}

function intersects(a: Position, b: Position, rect: Rect) {
  return a.x === b.x
    ? a.x > rect.x && a.x < rect.x + rect.width && Math.max(a.y, b.y) > rect.y && Math.min(a.y, b.y) < rect.y + rect.height
    : a.y > rect.y && a.y < rect.y + rect.height && Math.max(a.x, b.x) > rect.x && Math.min(a.x, b.x) < rect.x + rect.width;
}

function orthogonal(a: Anchor, b: Anchor, stub: number) {
  const p = add(a.point, scale(a.direction, stub));
  const q = add(b.point, scale(b.direction, stub));
  const x = (p.x + q.x) / 2, y = (p.y + q.y) / 2;
  const xs = [Math.min(a.rect.x, b.rect.x, p.x, q.x) - stub, Math.max(a.rect.x + a.rect.width, b.rect.x + b.rect.width, p.x, q.x) + stub];
  const ys = [Math.min(a.rect.y, b.rect.y, p.y, q.y) - stub, Math.max(a.rect.y + a.rect.height, b.rect.y + b.rect.height, p.y, q.y) + stub];
  const candidates: Position[][] = [
    ...(p.x === q.x || p.y === q.y ? [[]] : []),
    [point(q.x, p.y)], [point(p.x, q.y)],
    [point(x, p.y), point(x, q.y)], [point(p.x, y), point(q.x, y)],
    ...xs.map((lane) => [point(lane, p.y), point(lane, q.y)]),
    ...ys.map((lane) => [point(p.x, lane), point(q.x, lane)]),
  ];
  for (const xx of xs) for (const yy of ys) {
    candidates.push([point(xx, p.y), point(xx, yy), point(q.x, yy)],
      [point(p.x, yy), point(xx, yy), point(xx, q.y)]);
  }
  const scored = candidates.flatMap((bends, order) => {
    const interior = simplify([p, ...bends, q]);
    const points = simplify([a.point, ...interior, b.point]);
    const vectors = points.slice(1).map((v, i) => subtract(v, points[i]));
    if (!vectors.length || !positive(vectors[0], a.direction) || !positive(vectors.at(-1)!, scale(b.direction, -1))) return [];
    if (vectors.some((v, i) => (v.x !== 0 && v.y !== 0) ||
      (i > 0 && cross(v, vectors[i - 1]) === 0 && dot(v, vectors[i - 1]) < 0))) return [];
    const crossings = interior.slice(1).reduce((n, current, i) => n +
      Number(intersects(interior[i], current, a.rect)) + Number(intersects(interior[i], current, b.rect)), 0);
    const distance = vectors.reduce((n, v) => n + Math.abs(v.x) + Math.abs(v.y), 0);
    return [{ points, crossings, distance, bends: vectors.length - 1, order }];
  });
  return scored.sort((a, b) => a.crossings - b.crossings || a.distance - b.distance || a.bends - b.bends || a.order - b.order)[0]?.points;
}

export function unionBounds(rects: readonly Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((box) => box.x));
  const y = Math.min(...rects.map((box) => box.y));
  const right = Math.max(...rects.map((box) => box.x + box.width));
  const bottom = Math.max(...rects.map((box) => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}

export const dashPattern = (style: Edge["style"]) => style.strokeStyle === "dashed" ? [4 * style.strokeWidth, 3 * style.strokeWidth] : undefined;

// DGS-07 §7. Stubs and label travel use the untrimmed centerline.
export function routeInk(a: Anchor, b: Anchor, edge: Pick<Edge, "route" | "arrows" | "style">): Result<Ink> {
  if (![a, b].every(({ point, direction, rect, stroke }) =>
    [...Object.values(point), ...Object.values(direction), ...Object.values(rect), stroke].every(Number.isFinite) &&
    Math.abs(direction.x) + Math.abs(direction.y) === 1 && (direction.x === 0 || direction.y === 0))) return unavailable();
  const stroke = edge.style.strokeWidth;
  if (!Number.isFinite(stroke) || stroke <= 0) return unavailable();
  const markerLength = Math.max(8, 4 * stroke);
  const markerWidth = Math.max(6, 3 * stroke);
  const straight = edge.route === "straight" && length(a.point, b.point) !== 0;
  const points = straight ? [a.point, b.point] : orthogonal(a, b, Math.max(12, markerLength + stroke + 4));
  if (!points || points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) return unavailable();
  const warning = edge.route === "straight" && (!straight || dot(subtract(b.point, a.point), a.direction) < 0 ||
    dot(subtract(a.point, b.point), b.direction) < 0) ? "Straight connector endpoints overlap or face inward." : undefined;
  const arrows: Position[][] = [];
  const line = [...points];
  const count = points.length;
  for (const [from, next, node] of [[0, 1, a], [count - 1, count - 2, b]] as const) {
    if (edge.arrows === "none" || (from === 0 && edge.arrows !== "both")) continue;
    const outward = unit(points[from], points[next]);
    const available = length(points[from], points[next]) / (count === 2 && edge.arrows === "both" ? 2 : 1);
    const offset = Math.min(node.stroke / 2, available / 3);
    const tip = add(points[from], scale(outward, offset));
    const depth = Math.min(markerLength, available - offset);
    const base = add(tip, scale(outward, depth));
    const side = scale(point(-outward.y, outward.x), markerWidth * depth / (2 * markerLength));
    line[from] = base;
    arrows.push([tip, add(base, side), subtract(base, side)]);
  }
  const bounds = unionBounds([inset(unionBounds(line.map((p) => ({ ...p, width: 0, height: 0 })))!, -stroke / 2),
    ...arrows.flat().map((p) => ({ ...p, width: 0, height: 0 }))])!;
  return ok({ points, line, arrows, bounds, warning });
}

export function halfPath(points: readonly Position[]) {
  const lengths = points.slice(1).map((p, i) => length(points[i], p));
  let remaining = lengths.reduce((total, distance) => total + distance, 0) / 2;
  for (const [i, distance] of lengths.entries()) {
    if (distance && remaining <= distance) return add(points[i], scale(subtract(points[i + 1], points[i]), remaining / distance));
    remaining -= distance;
  }
  return points[0];
}

export function edgeLabel(edge: Pick<Edge, "label" | "style">, points: readonly Position[], measure: Measure = approximate) {
  if (!edge.label) return null;
  const { fontSize, align } = edge.style.text;
  const { lines } = wrapLines(edge.label, 232, fontSize, measure);
  const { ink, baseline, lineHeight } = lineMetrics(lines, fontSize, measure);
  const width = Math.max(...ink.map((line) => line.width)) + 8;
  const height = lines.length * lineHeight + 4;
  const center = halfPath(points);
  const box = { x: center.x - width / 2, y: center.y - height / 2, width, height };
  const available = width - 8;
  const placements = lines.map((text, i) => ({ text, x: 4 + ink[i].left +
    (available - ink[i].width) * (align === "left" ? 0 : align === "right" ? 1 : .5), y: 2 + baseline + i * lineHeight }));
  return { box, lines, placements, lineHeight, align };
}
