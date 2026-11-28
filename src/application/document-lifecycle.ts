import type { PortableDiagram, DiagramDocument, Viewport } from "../core/contracts";
import { parsePortable } from "../core/graph";
import type { Immutable } from "../core/immutable";
import { fail, type Result } from "../core/validation";
import type { DocumentRepository } from "./document-repository";

// DGS-08 §4. Whole-document copies retain geometry and remap every canonical ID.
export function remapDiagram(
  source: Immutable<DiagramDocument>, viewport: Viewport | null, now: string, uuid: () => string, title = source.title,
): Result<PortableDiagram> {
  const document = structuredClone(source) as DiagramDocument;
  const keys = [source.id, ...source.nodes.map(({ id }) => id), ...source.groups.map(({ id }) => id),
    ...source.edges.map(({ id }) => id)];
  const original = new Set(keys);
  const ids = new Map(keys.map((id) => [id, uuid()]));
  if ([...ids.values()].some((id) => original.has(id)) || new Set(ids.values()).size !== ids.size) {
    return fail({ code: "RECORD_EXISTS", message: "Could not allocate independent diagram identifiers.", path: [] });
  }
  document.id = ids.get(source.id)!;
  document.title = title;
  document.createdAt = document.updatedAt = now;
  for (const item of [...document.nodes, ...document.groups]) {
    item.id = ids.get(item.id)!;
    if (item.parentId) item.parentId = ids.get(item.parentId)!;
  }
  for (const edge of document.edges) {
    edge.id = ids.get(edge.id)!;
    edge.source.nodeId = ids.get(edge.source.nodeId)!;
    edge.target.nodeId = ids.get(edge.target.nodeId)!;
  }
  return parsePortable({ document, viewport });
}

export function copyDiagram(source: Immutable<DiagramDocument>, viewport: Viewport | null, now: string, uuid: () => string) {
  return remapDiagram(source, viewport, now, uuid, `${[...source.title].slice(0, 113).join("")} (copy)`);
}

export async function createWithFreshIds(make: () => Result<PortableDiagram>, repository: {
  create: DocumentRepository["create"];
}) {
  for (let attempt = 0; ; attempt++) {
    const portable = make();
    const result = portable.ok ? await repository.create(portable.value) : portable;
    if (result.ok || attempt >= 2 || result.issues[0].code !== "RECORD_EXISTS") return result;
  }
}
