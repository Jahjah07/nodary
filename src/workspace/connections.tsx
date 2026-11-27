import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CommandState } from "../core/commands";
import { handles } from "../core/contracts";
import { candidateEdge, type EdgeEdit, type End, type Endpoint } from "../core/edge-edits";
import { componentFor } from "../core/registry";
import { objectName, type Scene } from "./scene";

export type EditEdge = (edit: EdgeEdit, generation: number) => string | null;
export type ConnectionStart =
  | { kind: "connect"; id: string; source: Endpoint }
  | { kind: "reconnect"; id: string; side: End };

export function targetEdit(start: ConnectionStart, endpoint: Endpoint) {
  return start.kind === "connect" ? { ...start, target: endpoint } : { ...start, endpoint };
}

const names = { top: "Top", right: "Right", bottom: "Bottom", left: "Left" };

export function EndpointDialog({ scene, editor, start, onEdge, close }: {
  scene: Scene; editor: CommandState; start: ConnectionStart; onEdge: EditEdge; close(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [source, setSource] = useState(start.kind === "connect" ? start.source :
    editor.document.edges.find(({ id }) => id === start.id)![start.side]);
  const [target, setTarget] = useState<Endpoint>({
    nodeId: start.kind === "reconnect" ? source.nodeId : "",
    handleId: start.kind === "reconnect" ? source.handleId : "left",
  });
  const [error, setError] = useState("");
  const generation = useRef(editor.generation);
  const title = start.kind === "connect" ? "Connect to…" : `Reconnect ${start.side}`;
  const eligible = scene.nodes.filter(({ item }) => componentFor(item.type).allowedHandles.length);
  const choices = (endpoint: Endpoint) => eligible.find(({ item }) => item.id === endpoint.nodeId);
  const draft = start.kind === "connect" ? { ...start, source } : start;
  const validation = target.nodeId ? candidateEdge(editor.document, targetEdit(draft, target)) : null;
  const sourceName = choices(source) ? objectName(choices(source)!.item, scene) : "";
  useEffect(() => {
    dialog.current?.showModal();
    form.current?.querySelector<HTMLElement>("select")?.focus();
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!validation?.ok) return;
    const message = onEdge(targetEdit(draft, target), generation.current);
    if (message) setError(message);
    else dialog.current?.close();
  }

  return <dialog ref={dialog} className="workspace-dialog" aria-labelledby="endpoint-title" onClose={close}>
    <div className="dialog-heading"><h2 id="endpoint-title">{title}</h2></div>
    <form ref={form} onSubmit={submit}>
      {start.kind === "connect" && <label>Source point on {sourceName}
        <select value={source.handleId} onChange={(event) => { setSource({ ...source, handleId: event.target.value as Endpoint["handleId"] }); setError(""); }}>
          {handles.map((handle) => <option key={handle} value={handle}>{names[handle]}</option>)}
        </select>
      </label>}
      <label>{start.kind === "connect" ? "Target component" : "Replacement component"}
        <select value={target.nodeId} onChange={(event) => { setTarget({ ...target, nodeId: event.target.value }); setError(""); }}>
          <option value="">Choose a component</option>
          {eligible.map(({ item, rect }) => <option key={item.id} value={item.id}
            disabled={item.id === (start.kind === "connect" ? source.nodeId :
              editor.document.edges.find(({ id }) => id === start.id)?.[start.side === "source" ? "target" : "source"].nodeId)}>
            {objectName(item, scene)} ({Math.round(rect.x)}, {Math.round(rect.y)})
          </option>)}
        </select>
      </label>
      <label>{start.kind === "connect" ? "Target point" : "Replacement point"}
        <select disabled={!choices(target)} value={target.handleId}
          onChange={(event) => { setTarget({ ...target, handleId: event.target.value as Endpoint["handleId"] }); setError(""); }}>
          {handles.map((handle) => <option key={handle} value={handle}
            disabled={!!target.nodeId && !candidateEdge(editor.document, targetEdit(draft, { ...target, handleId: handle })).ok}>
            {names[handle]}
          </option>)}
        </select>
      </label>
      {(error || (validation && !validation.ok)) && <p role="alert">{error || (!validation?.ok && validation?.issues[0].message)}</p>}
      <div className="dialog-actions">
        <button type="button" className="button" onClick={() => dialog.current?.close()}>Cancel</button>
        <button type="submit" className="button primary" disabled={!validation?.ok}>{start.kind === "connect" ? "Connect" : "Reconnect"}</button>
      </div>
    </form>
  </dialog>;
}
