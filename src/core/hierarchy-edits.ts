import type { Boundary, DiagramDocument } from "./contracts";
import { expandParents, extent, insets, type ContainmentMetrics } from "./geometry";
import { add, ancestors, indexHierarchy, origin, subtract, transformRoots, type Hierarchy } from "./hierarchy";
import type { Immutable } from "./immutable";
import { componentFor } from "./registry";
import { unionBounds } from "./routes";
import { fail, limits, ok, type Issue, type Result } from "./validation";

export type HierarchyEdit =
  | { kind: "group"; ids: readonly string[]; id: string }
  | { kind: "reparent"; ids: readonly string[]; parentId: string | null }
  | { kind: "delete" | "ungroup"; ids: readonly string[] }
  | { kind: "duplicate"; ids: readonly string[]; copies: Readonly<Record<string, string>> };

type Graph = Immutable<Pick<DiagramDocument, "nodes" | "groups" | "edges">>;
const problem = (code: Issue["code"], message: string) => fail({ code, path: ["document"], message });

export function groupIssue(index: Hierarchy, roots: readonly string[]) {
  if (roots.length < 2) return "Select at least two sibling components or boundaries.";
  if (roots.some((id) => index.get(id)?.item.parentId !== index.get(roots[0])?.item.parentId)) {
    return "Group objects with the same parent boundary. Move them to a common parent first.";
  }
}

export function destinationIssue(index: Hierarchy, roots: readonly string[], parentId: string | null) {
  if (parentId === null) return;
  const parent = index.get(parentId);
  if (parent?.item.type !== "general.boundary") return { code: "INVALID_PARENT" as const, message: "Choose an existing boundary." };
  if ([parentId, ...ancestors(index, parentId)].some((id) => roots.includes(id))) {
    return { code: "GROUP_CYCLE" as const, message: "A boundary cannot contain itself or one of its ancestors." };
  }
  const selected = new Set(roots);
  for (const [id, entry] of index) {
    if (entry.depth <= limits.groupDepth - parent.depth - 1) continue;
    const root = [id, ...ancestors(index, id)].find((candidate) => selected.has(candidate));
    if (root && parent.depth + 1 + entry.depth - index.get(root)!.depth > limits.groupDepth) {
      return { code: "GROUP_DEPTH" as const, message: "This destination would exceed eight boundary ancestors." };
    }
  }
}

export function duplicatePlan(graph: Graph, index: Hierarchy, ids: readonly string[]) {
  const roots = transformRoots(index, ids);
  const selected = new Set(roots);
  const included = new Set([...index.keys()].filter((id) =>
    selected.has(id) || ancestors(index, id).some((parent) => selected.has(parent))));
  const edges = graph.edges.filter(({ source, target }) => included.has(source.nodeId) && included.has(target.nodeId));
  return { roots, included, edges };
}

// DGS-05 §7 and DGS-07 §8. Membership uses the old hierarchy's world positions.
export function applyHierarchyEdit(draft: DiagramDocument, edit: HierarchyEdit, metrics: ContainmentMetrics): Result<void> {
  const before = indexHierarchy(draft);
  if (!before.ok) return before;
  const index = before.value;
  const edgeIds = new Set(draft.edges.map(({ id }) => id));
  if (edit.ids.some((id) => !index.has(id) && !edgeIds.has(id))) {
    return problem("INVALID_FIELD", "The selection contains an object that no longer exists.");
  }
  const roots = transformRoots(index, edit.ids);
  const frames = new Set<string>();
  const assign = (id: string, parentId: string | null, parentWorld: ReturnType<typeof origin>) => {
    const { item, world } = index.get(id)!;
    item.parentId = parentId;
    item.position = subtract(world, parentWorld);
  };
  if (edit.kind === "group") {
    const issue = groupIssue(index, roots);
    if (issue) return problem("INVALID_PARENT", issue);
    const parentId = index.get(roots[0])!.item.parentId;
    const registry = componentFor("general.boundary");
    if (registry.entity !== "group") return problem("COMMAND_FAILED", "Boundary defaults are unavailable.");
    const spread = unionBounds(roots.map((id) => {
      const { item, world } = index.get(id)!;
      return extent(item, metrics, world);
    }))!;
    const frame: Boundary = { id: edit.id, type: registry.type, parentId, title: registry.defaultTitle,
      style: structuredClone(registry.defaultStyle), size: { ...registry.minSize }, position: origin() };
    const border = insets(frame, metrics);
    const world = { x: spread.x - border.left, y: spread.y - border.top };
    frame.position = subtract(world, parentId ? index.get(parentId)!.world : origin());
    frame.size.width = Math.max(frame.size.width, spread.width + border.left + border.right);
    frame.size.height = Math.max(frame.size.height, spread.height + border.top + border.bottom);
    draft.groups.push(frame);
    for (const id of roots) assign(id, frame.id, world);
    frames.add(frame.id);
  } else if (edit.kind === "reparent") {
    const issue = destinationIssue(index, roots, edit.parentId);
    if (issue) return problem(issue.code, issue.message);
    const changed = roots.filter((id) => index.get(id)?.item.parentId !== edit.parentId);
    if (!changed.length) return ok(undefined);
    const world = edit.parentId ? index.get(edit.parentId)!.world : origin();
    for (const id of changed) assign(id, edit.parentId, world);
    if (edit.parentId) frames.add(edit.parentId);
  } else if (edit.kind === "duplicate") {
    const plan = duplicatePlan(draft, index, roots);
    if (!plan.included.size) return ok(undefined);
    const copyId = (id: string) => Object.hasOwn(edit.copies, id) ? edit.copies[id] : undefined;
    const sourceIds = [...plan.included, ...plan.edges.map(({ id }) => id)];
    const fresh = sourceIds.map(copyId);
    if (fresh.some((id) => !id || id === draft.id || index.has(id) || edgeIds.has(id)) ||
      new Set(fresh).size !== fresh.length) return problem("DUPLICATE_ID", "Every copied object needs a fresh unique ID.");
    const clone = <T extends DiagramDocument["nodes"][number] | Boundary>(item: T): T => {
      const copy = structuredClone(item);
      copy.id = copyId(item.id)!;
      if (roots.includes(item.id)) {
        copy.position = add(item.position, { x: 20, y: 20 });
        if (copy.parentId) frames.add(copy.parentId);
      } else copy.parentId = copyId(item.parentId!)!;
      return copy;
    };
    draft.nodes.push(...draft.nodes.filter(({ id }) => plan.included.has(id)).map(clone));
    draft.groups.push(...draft.groups.filter(({ id }) => plan.included.has(id)).map(clone));
    draft.edges.push(...plan.edges.map((edge) => ({
      ...structuredClone(edge), id: copyId(edge.id)!,
      source: { ...edge.source, nodeId: copyId(edge.source.nodeId)! },
      target: { ...edge.target, nodeId: copyId(edge.target.nodeId)! },
    })));
  } else {
    const selected = new Set(edit.ids);
    const removedFrames = new Set(draft.groups.filter(({ id }) => selected.has(id)).map(({ id }) => id));
    if (!selected.size || (edit.kind === "ungroup" && !removedFrames.size)) return ok(undefined);
    const removedNodes = new Set(edit.kind === "delete" ? draft.nodes.filter(({ id }) => selected.has(id)).map(({ id }) => id) : []);
    for (const [id, { item }] of index) {
      if (removedFrames.has(id) || removedNodes.has(id) || !item.parentId || !removedFrames.has(item.parentId)) continue;
      const parent = ancestors(index, id).find((candidate) => !removedFrames.has(candidate)) ?? null;
      assign(id, parent, parent ? index.get(parent)!.world : origin());
      if (parent) frames.add(parent);
    }
    draft.groups = draft.groups.filter(({ id }) => !removedFrames.has(id));
    draft.nodes = draft.nodes.filter(({ id }) => !removedNodes.has(id));
    if (edit.kind === "delete") draft.edges = draft.edges.filter(({ id, source, target }) =>
      !selected.has(id) && !removedNodes.has(source.nodeId) && !removedNodes.has(target.nodeId));
  }
  const result = expandParents(draft, frames, metrics);
  return result.ok ? ok(undefined) : result;
}
