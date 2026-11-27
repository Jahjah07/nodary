// SP-02 synthetic geometry. Titles fit one line; padding is fixed for this fixture.
export type Point = { x: number; y: number };
type Item = Point & {
  id: string; parent: string | null; width: number; height: number; group?: true;
  fill?: string; status?: "proposed" | "existing";
};
export type Graph = { items: Item[]; edges: { id: string; source: string; target: string; label?: string }[] };
export const initial: Graph = {
  items: [
    { id: "outer", parent: null, x: 180, y: 130, width: 410, height: 310, group: true },
    { id: "inner", parent: "outer", x: 65, y: 75, width: 220, height: 150, group: true },
    { id: "worker", parent: "inner", x: 35, y: 50, width: 84, height: 36 },
    { id: "peer", parent: "outer", x: 295, y: 135, width: 84, height: 36 },
    { id: "outside", parent: null, x: 645, y: 170, width: 84, height: 36 },
  ],
  edges: [{ id: "cross-boundary", source: "worker", target: "outside" }],
};

export function item(graph: Graph, id: string) {
  const found = graph.items.find((entry) => entry.id === id);
  if (!found) throw Error("Unknown object");
  return found;
}

export function world(graph: Graph, id: string | null): Point {
  if (!id) return { x: 0, y: 0 };
  const node = item(graph, id);
  const parent = world(graph, node.parent);
  return { x: parent.x + node.x, y: parent.y + node.y };
}

function ancestors(graph: Graph, id: string): string[] {
  const parent = item(graph, id).parent;
  return parent ? [parent, ...ancestors(graph, parent)] : [];
}

const padding = { left: 16, top: 36, right: 16, bottom: 16 };

function fitChildren(graph: Graph, id: string, rejectShrink = false) {
  const frame = item(graph, id);
  const children = graph.items.filter((child) => child.parent === id);
  const left = Math.min(0, ...children.map((child) => child.x - padding.left));
  const top = Math.min(0, ...children.map((child) => child.y - padding.top));
  const right = Math.max(frame.width, ...children.map((child) => child.x + child.width + padding.right));
  const bottom = Math.max(frame.height, ...children.map((child) => child.y + child.height + padding.bottom));
  if (rejectShrink && (left || top || right > frame.width || bottom > frame.height)) {
    throw Error("Frame cannot shrink below its content");
  }
  frame.x += left;
  frame.y += top;
  frame.width = right - left;
  frame.height = bottom - top;
  for (const child of children) {
    child.x -= left;
    child.y -= top;
  }
}

export function move(graph: Graph, ids: string[], delta: Point) {
  const candidate = structuredClone(graph);
  const touched = new Set<string>();
  for (const id of ids) {
    const chain = ancestors(graph, id);
    if (chain.some((parent) => ids.includes(parent))) continue;
    const node = item(candidate, id);
    node.x += delta.x;
    node.y += delta.y;
    chain.forEach((parent) => touched.add(parent));
  }
  [...touched].sort((a, b) => ancestors(graph, b).length - ancestors(graph, a).length)
    .forEach((id) => fitChildren(candidate, id));
  return candidate;
}

export function reparent(graph: Graph, id: string, parent: string | null) {
  if (parent && (!item(graph, parent).group || parent === id || ancestors(graph, parent).includes(id))) {
    throw Error("Invalid boundary target");
  }
  const point = world(graph, id);
  const origin = world(graph, parent);
  const candidate = structuredClone(graph);
  Object.assign(item(candidate, id), { x: point.x - origin.x, y: point.y - origin.y, parent });
  if (candidate.items.some((node) => ancestors(candidate, node.id).length > 8)) {
    throw Error("Boundary depth exceeded");
  }
  if (parent) [parent, ...ancestors(candidate, parent)].forEach((frame) => fitChildren(candidate, frame));
  return candidate;
}

export function ungroup(graph: Graph, id: string) {
  const frame = item(graph, id);
  const children = graph.items.filter((node) => node.parent === id);
  const candidate = children.reduce((state, child) => reparent(state, child.id, frame.parent), graph);
  return { ...candidate, items: candidate.items.filter((node) => node.id !== id) };
}

export function resize(graph: Graph, id: string, width: number, height: number) {
  if (width < 160 || height < 100) throw Error("Frame minimum is 160 × 100");
  const candidate = structuredClone(graph);
  Object.assign(item(candidate, id), { width, height });
  fitChildren(candidate, id, true);
  ancestors(graph, id).forEach((parent) => fitChildren(candidate, parent));
  return candidate;
}

export function parentFirst(graph: Graph) {
  return [...graph.items].sort((a, b) => ancestors(graph, a.id).length - ancestors(graph, b.id).length);
}
