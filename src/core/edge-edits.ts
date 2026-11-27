import type { DiagramDocument, Edge } from "./contracts";
import { directedKey, endpointIssues } from "./graph";
import { indexHierarchy } from "./hierarchy";
import type { Immutable } from "./immutable";
import { componentRegistry } from "./registry";
import { routeInk, worldAnchor } from "./routes";
import { fail, ok, type Result } from "./validation";

export type Endpoint = Edge["source"];
export type End = "source" | "target";
export type EdgeEdit =
  | { kind: "connect"; id: string; source: Endpoint; target: Endpoint }
  | { kind: "reconnect"; id: string; side: End; endpoint: Endpoint }
  | { kind: "route"; id: string; route: Edge["route"] }
  | { kind: "delete"; id: string };

type Graph = Immutable<Pick<DiagramDocument, "nodes" | "edges">>;

export function candidateEdge(graph: Graph, edit: Exclude<EdgeEdit, { kind: "delete" }>): Result<Immutable<Edge>> {
  const original = graph.edges.find(({ id }) => id === edit.id);
  if (edit.kind === "connect" ? original : !original) {
    return fail({ code: "INVALID_ENDPOINT", path: ["edges"], message: "This connection has changed." });
  }
  const edge = edit.kind === "connect" ? { ...componentRegistry.edgeDefaults, id: edit.id, source: edit.source, target: edit.target } :
    edit.kind === "reconnect" ? { ...original!, [edit.side]: edit.endpoint } : { ...original!, route: edit.route };
  const issues = endpointIssues(edge, new Map(graph.nodes.map((node) => [node.id, node])));
  if (issues.length) return fail(...issues);
  const key = directedKey(edge);
  if (graph.edges.some((other) => other.id !== edge.id && directedKey(other) === key)) {
    return fail({ code: "DUPLICATE_EDGE", path: ["edges"], message: "This directed connection already exists." });
  }
  return ok(edge);
}

export function applyEdgeEdit(draft: DiagramDocument, edit: EdgeEdit): Result<void> {
  if (edit.kind === "delete") {
    const index = draft.edges.findIndex(({ id }) => id === edit.id);
    if (index >= 0) draft.edges.splice(index, 1);
    return ok(undefined);
  }
  const candidate = candidateEdge(draft, edit);
  if (!candidate.ok) return candidate;
  const edge = structuredClone(candidate.value);
  const hierarchy = indexHierarchy(draft);
  if (!hierarchy.ok) return hierarchy;
  const anchor = ({ nodeId, handleId }: Endpoint) => {
    const { item, world } = hierarchy.value.get(nodeId)!;
    return worldAnchor(item as DiagramDocument["nodes"][number], { ...world, ...item.size }, handleId)!;
  };
  const route = routeInk(anchor(edge.source), anchor(edge.target), edge);
  if (!route.ok) return route;
  if (edit.kind === "connect") draft.edges.push(edge);
  else draft.edges[draft.edges.findIndex(({ id }) => id === edit.id)] = edge;
  return ok(undefined);
}
