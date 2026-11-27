import { parseStructure, type DiagramDocument, type PortableDiagram, type Position, type Size, type Viewport } from "./contracts";
import { indexHierarchy } from "./hierarchy";
import type { Immutable } from "./immutable";
import { componentFor } from "./registry";
import { fail, limits, ok, type Issue, type Result } from "./validation";

export type Rect = Position & Size;
export const padding = { left: 16, top: 36, right: 16, bottom: 16 } as const;
export const geometryEpsilon = 1e-6;

export function validWorldRect(rect: Rect): boolean {
  const { x, y, width, height } = rect;
  return [x, y, width, height].every(Number.isFinite) && width >= 1 && height >= 1 &&
    width <= limits.size && height <= limits.size && x >= -limits.coordinates && y >= -limits.coordinates &&
    x + width <= limits.coordinates && y + height <= limits.coordinates;
}

export function contains(parent: Size, child: Rect, inset: Record<keyof typeof padding, number> = padding): boolean {
  return child.x >= inset.left - geometryEpsilon && child.y >= inset.top - geometryEpsilon &&
    child.x + child.width <= parent.width - inset.right + geometryEpsilon &&
    child.y + child.height <= parent.height - inset.bottom + geometryEpsilon;
}

export function snapshotFits(envelope: Immutable<PortableDiagram>): boolean {
  let size = 0;
  for (const char of JSON.stringify(envelope)) {
    const point = char.codePointAt(0)!;
    size += point < 0x80 ? 1 : point < 0x800 ? 2 : point < 0x10000 ? 3 : 4;
    if (size > limits.bytes) return false;
  }
  return true;
}

// DGS-05 VAL-05–14. Measured scene ink is supplied by later layout integration.
export function validateGraph<D extends Immutable<DiagramDocument>>(document: D, viewport: Viewport | null = null): Result<D> {
  const issues: Issue[] = [];
  const add = (code: Issue["code"], path: Issue["path"], message: string) => {
    if (issues.length < limits.issues) issues.push({ code, path, message });
  };
  const ids = new Set([document.id]);
  for (const collection of ["nodes", "groups", "edges"] as const) {
    document[collection].forEach(({ id }, i) => {
      if (ids.has(id)) add("DUPLICATE_ID", ["document", collection, i, "id"], "ID is already used in this document.");
      ids.add(id);
    });
  }
  if (issues.length) return fail(...issues);

  const hierarchy = indexHierarchy(document);
  if (!hierarchy.ok) return hierarchy;
  for (const { item, path, world } of hierarchy.value.values()) {
    const component = componentFor(item.type);
    const { width, height } = item.size;
    if (Math.abs(item.position.x) > limits.coordinates || Math.abs(item.position.y) > limits.coordinates ||
      !validWorldRect({ ...world, width, height })) {
      add("INVALID_GEOMETRY", path, "Rectangle exceeds the canonical world limits.");
    }
    if (width < component.minSize.width || height < component.minSize.height ||
      (component.aspectRatio !== null && Math.abs(width / height - component.aspectRatio) > geometryEpsilon)) {
      add("CONTENT_DOES_NOT_FIT", [...path, "size"], "Size fails the component minimum or aspect ratio.");
    }
    if (item.parentId !== null && !contains(hierarchy.value.get(item.parentId)!.item.size, { ...item.position, ...item.size })) {
      add("INVALID_GEOMETRY", [...path, "position"], "Rectangle falls outside its boundary's content area.");
    }
    if ("status" in item && item.status !== "not_specified" && !component.supportsStatus) {
      add("INVALID_CAPABILITY", [...path, "status"], "This component cannot hold a status.");
    }
    if (item.type === "general.text" && component.entity === "node") {
      for (const field of ["fill", "stroke", "strokeWidth", "strokeStyle"] as const) {
        if (item.style[field] !== component.defaultStyle[field]) {
          add("INVALID_CAPABILITY", [...path, "style", field], "Unsupported style must retain its neutral value.");
        }
      }
    }
  }

  const nodes = new Map(document.nodes.map((node) => [node.id, node]));
  const connections = new Set<string>();
  for (const [i, edge] of document.edges.entries()) {
    const path = ["document", "edges", i];
    for (const side of ["source", "target"] as const) {
      const endpoint = edge[side];
      const node = nodes.get(endpoint.nodeId);
      if (!node || !componentFor(node.type).allowedHandles.includes(endpoint.handleId)) {
        add("INVALID_ENDPOINT", [...path, side], "Endpoint requires an eligible node and handle.");
      }
    }
    const key = JSON.stringify([edge.source.nodeId, edge.source.handleId, edge.target.nodeId, edge.target.handleId]);
    if (edge.source.nodeId === edge.target.nodeId) add("SELF_LOOP", path, "Self-loops are unsupported.");
    if (connections.has(key)) add("DUPLICATE_EDGE", path, "A directed edge already uses these endpoints.");
    connections.add(key);
  }
  if (document.updatedAt < document.createdAt) {
    add("INVALID_TIMESTAMP", ["document", "updatedAt"], "Updated timestamp precedes creation.");
  }
  if (!issues.length && !snapshotFits({ document, viewport })) {
    add("LIMIT_EXCEEDED", [], "Serialized snapshot exceeds 10 MiB.");
  }
  return issues.length ? fail(...issues) : ok(document);
}

export function parsePortable(input: unknown): Result<PortableDiagram> {
  const result = parseStructure(input);
  if (!result.ok) return result;
  const graph = validateGraph(result.value.document, result.value.viewport);
  return graph.ok ? result : graph;
}
