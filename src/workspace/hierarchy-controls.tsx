import { useMemo, useState } from "react";
import type { DiagramDocument } from "../core/contracts";
import { ancestors, indexHierarchy, transformRoots } from "../core/hierarchy";
import { destinationIssue, groupIssue } from "../core/hierarchy-edits";
import type { Immutable } from "../core/immutable";

export type HierarchyIntent =
  | { kind: "group" | "duplicate" | "ungroup" | "delete"; ids: readonly string[] }
  | { kind: "reparent"; ids: readonly string[]; parentId: string | null };
export type EditHierarchy = (intent: HierarchyIntent, generation: number) => string | null;

export function HierarchyControls({ document, ids, generation, pending, edit }: {
  document: Immutable<DiagramDocument>; ids: readonly string[]; generation: number; pending: boolean; edit: EditHierarchy;
}) {
  const [message, setMessage] = useState("");
  const hierarchy = useMemo(() => indexHierarchy(document), [document]);
  if (!hierarchy.ok) return null;
  const index = hierarchy.value;
  const roots = transformRoots(index, ids);
  const parents = new Set(roots.map((id) => index.get(id)!.item.parentId));
  const current = parents.size > 1 ? "mixed" : [...parents][0] ?? "";
  const group = groupIssue(index, roots);
  const hasFrame = ids.some((id) => index.get(id)?.item.type === "general.boundary");
  const act = (intent: HierarchyIntent) => setMessage(edit(intent, generation) ?? "");
  const destinations = document.groups.map(({ id, title }) => ({
    id, path: [...ancestors(index, id).reverse().map((parent) => {
      const item = index.get(parent)!.item;
      return "title" in item && item.title ? item.title : "Boundary";
    }), title || "Boundary"].join(" / "),
    reason: destinationIssue(index, roots, id)?.message,
  }));
  const directParent = roots.length === 1 ? index.get(roots[0])?.item.parentId : null;
  return <fieldset className="hierarchy-controls">
    <legend>Hierarchy</legend>
    {roots.length > 0 && <>
      <label>Parent boundary
        <select value={current} disabled={pending} onChange={(event) => act({ kind: "reparent", ids, parentId: event.target.value || null })}>
          {current === "mixed" && <option value="mixed" disabled>Mixed parents</option>}
          <option value="">Workspace (root)</option>
          {destinations.map(({ id, path, reason }) =>
            <option key={id} value={id} disabled={!!reason}>{path}{reason ? ` · ${reason}` : ""}</option>)}
        </select>
      </label>
      {directParent && <button className="button" disabled={pending} onClick={() => act({
        kind: "reparent", ids, parentId: index.get(directParent)!.item.parentId,
      })}>Remove from boundary</button>}
    </>}
    <div className="hierarchy-actions">
      {roots.length > 1 && <button className="button" disabled={pending} title={group}
        onClick={() => act({ kind: "group", ids })}>Group selection</button>}
      {hasFrame && <button className="button" disabled={pending}
        onClick={() => act({ kind: "ungroup", ids })}>Ungroup</button>}
      <button className="button" disabled={pending || !roots.length} onClick={() => act({ kind: "duplicate", ids })}>Duplicate</button>
      <button className="button" disabled={pending} onClick={() => act({ kind: "delete", ids })}>Delete selection</button>
    </div>
    {message && <p role="alert">{message}</p>}
  </fieldset>;
}
