import type { Boundary, DiagramDocument, Edge, Node, Position } from "./contracts";
import { indexHierarchy } from "./geometry";
import type { Rect } from "./graph";
import type { Immutable } from "./immutable";
import { edgeLabel, routeInk, unionBounds, worldAnchor, type Anchor } from "./routes";
import { labelLayout, visualBounds, visualOf, type Measure } from "./visual";

type Box<T> = { item: Immutable<T>; rect: Rect; bounds: Rect; label: ReturnType<typeof labelLayout> };
export type SceneEdge = { item: Immutable<Edge>; points: Position[]; line: Position[]; arrows: Position[][]; bounds: Rect;
  label: ReturnType<typeof edgeLabel>; source: Anchor; target: Anchor; warning?: string };
export type Scene = {
  nodes: Box<Node>[];
  groups: (Box<Boundary> & { title: Rect | null; depth: number })[];
  edges: SceneEdge[];
  diagnostics: string[];
  bounds: Rect | null;
};

export function projectConnection(item: Immutable<Edge>, source: Anchor, target: Anchor, measure?: Measure): SceneEdge | string {
  const rendered = routeInk(source, target, item);
  if (!rendered.ok) return rendered.issues[0].message;
  const ink = rendered.value;
  const label = edgeLabel(item, ink.points, measure);
  return { item, ...ink, label, source, target, bounds: label ? unionBounds([ink.bounds, label.box])! : ink.bounds };
}

export function buildScene(document: Immutable<DiagramDocument>, measure?: Measure): Scene {
  const hierarchy = indexHierarchy(document);
  if (!hierarchy.ok) throw Error("Scene requires a validated hierarchy.");
  const box = (item: Immutable<Node | Boundary>) => {
    const rect = { ...hierarchy.value.get(item.id)!.world, ...item.size };
    const label = labelLayout(item, measure);
    const local = visualBounds(item, label);
    return { rect, label, bounds: { ...local, x: rect.x + local.x, y: rect.y + local.y } };
  };
  const nodes = document.nodes.map((item) => ({ item, ...box(item) }));
  const lookup = new Map(nodes.map((node) => [node.item.id, node]));
  const groups = document.groups.map((item) => {
    const geometry = box(item);
    const { x, y } = geometry.rect;
    const region = visualOf(item).region;
    const height = geometry.label.height;
    return { item, ...geometry, depth: hierarchy.value.get(item.id)!.depth,
      title: item.title ? { ...region, x: x + region.x, y: y + region.y, height: Math.max(region.height, height) } : null };
  }).sort((a, b) => a.depth - b.depth);
  const edges: SceneEdge[] = [];
  const diagnostics: string[] = [];
  for (const item of document.edges) {
    const sourceBox = lookup.get(item.source.nodeId);
    const targetBox = lookup.get(item.target.nodeId);
    const source = sourceBox && worldAnchor(sourceBox.item, sourceBox.rect, item.source.handleId);
    const target = targetBox && worldAnchor(targetBox.item, targetBox.rect, item.target.handleId);
    const edge = source && target ? projectConnection(item, source, target, measure) : "A saved connection endpoint could not be resolved.";
    if (typeof edge === "string") diagnostics.push(edge);
    else edges.push(edge);
  }
  return { nodes, groups, edges, diagnostics, bounds: unionBounds([...nodes, ...groups, ...edges].map(({ bounds }) => bounds)) };
}

