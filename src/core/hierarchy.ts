import type { Boundary, Node, Position } from "./contracts";
import type { Immutable } from "./immutable";
import { fail, limits, ok, type Issue, type Result } from "./validation";

export type Placed = Node | Boundary;
export type Placement<T extends Immutable<Placed>> = { item: T; path: Issue["path"]; world: Position; depth: number };
export type Hierarchy = ReadonlyMap<string, Placement<Immutable<Placed>>>;
export const origin = (): Position => ({ x: 0, y: 0 });
export const add = (a: Position, b: Position): Position => ({ x: a.x + b.x, y: a.y + b.y });
export const subtract = (a: Position, b: Position): Position => ({ x: a.x - b.x, y: a.y - b.y });

export function ancestors(index: Hierarchy, id: string) {
  const result: string[] = [];
  for (let parent = index.get(id)?.item.parentId; parent; parent = index.get(parent)?.item.parentId) result.push(parent);
  return result;
}

export function transformRoots(index: Hierarchy, ids: readonly string[]) {
  const selected = new Set(ids);
  return [...selected].filter((id) => index.has(id) && !ancestors(index, id).some((parent) => selected.has(parent)));
}

// DGS-05 parent chains are bounded independently of array order.
export function indexHierarchy<N extends Immutable<Node>, B extends Immutable<Boundary>>(
  document: { nodes: readonly N[]; groups: readonly B[] },
): Result<Map<string, Placement<N | B>>> {
  const items = new Map<string, { item: N | B; path: Issue["path"] }>();
  const groups = new Set(document.groups.map(({ id }) => id));
  for (const collection of ["groups", "nodes"] as const) {
    for (const [index, item] of document[collection].entries()) {
      const path = ["document", collection, index];
      if (items.has(item.id)) return fail({ code: "DUPLICATE_ID", path: [...path, "id"], message: "Object ID is already used." });
      items.set(item.id, { item, path });
    }
  }
  const index = new Map<string, Placement<N | B>>();
  for (const [id, entry] of items) {
    const visited = new Set([id]);
    let current = entry.item;
    let world = origin();
    while (true) {
      world = add(current.position, world);
      const parent = current.parentId;
      if (parent === null) break;
      const path = [...entry.path, "parentId"];
      if (!groups.has(parent)) return fail({ code: "INVALID_PARENT", path, message: "Parent must refer to an existing boundary." });
      if (visited.has(parent)) return fail({ code: "GROUP_CYCLE", path, message: "Boundary ancestry contains a cycle." });
      if (visited.size > limits.groupDepth) return fail({ code: "GROUP_DEPTH", path, message: "Object exceeds eight boundary ancestors." });
      visited.add(parent);
      current = items.get(parent)!.item;
    }
    index.set(id, { ...entry, world, depth: visited.size - 1 });
  }
  return ok(index);
}
