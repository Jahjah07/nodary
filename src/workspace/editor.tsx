"use client";

import { CircleHelp, Clock3, Grid2X2, Hand, Magnet, MousePointer2, PanelLeft, PanelRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { DocumentSession } from "../application/document-session";
import type { Viewport } from "../core/contracts";
import { componentFor, componentRegistry } from "../core/registry";
import type { ComponentType } from "../core/component-edits";
import { EndpointDialog, type ConnectionStart, type EditEdge } from "./connections";
import { Canvas, type CanvasControls, type EditComponent, type PaletteDrag, type Tool } from "./canvas";
import { ComponentPreview, measureLabel } from "./component-graphic";
import { BackToLibrary, categoryName } from "./library";
import { sampleId } from "./sample";
import { buildScene, objectName, objectsIn, originView, type Scene } from "./scene";

type Panel = "components" | "properties";
const panelNames = { components: "Component library", properties: "Properties" };
const narrowQuery = "(max-width: 1023px)";
const isNarrow = () => window.matchMedia(narrowQuery).matches;
function subscribeNarrow(change: () => void) {
  const media = window.matchMedia(narrowQuery);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}

const categories = [["Flowchart", "flow."], ["Architecture", "arch."], ["General", "general."]] as const;

export function Editor({ session, onView, onToggle, onEdit, onEdge }: {
  session: DocumentSession;
  onView(viewport: Viewport | null, selection: readonly string[]): void;
  onToggle(key: "gridVisible" | "snapToGrid"): void;
  onEdit: EditComponent;
  onEdge: EditEdge;
}) {
  const { document, view } = session.editor;
  const scene = useMemo(() => buildScene(document, measureLabel), [document]);
  const isSample = document.id === sampleId;
  const canvas = useRef<CanvasControls>(null);
  const drag = useRef<PaletteDrag | null>(null);
  const [connection, setConnection] = useState<ConnectionStart>();
  const endpointTrigger = useRef<HTMLElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const [panels, setPanels] = useState({ components: true, properties: true });
  const [drawer, setDrawer] = useState<Panel>();
  const help = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const left = useRef<HTMLButtonElement>(null);
  const right = useRef<HTMLButtonElement>(null);
  const open = { components: narrow ? drawer === "components" : panels.components, properties: narrow ? drawer === "properties" : panels.properties };
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  function togglePanel(panel: Panel) {
    if (narrow) {
      setDrawer(open[panel] ? undefined : panel);
      if (!open[panel]) requestAnimationFrame(() => window.document.getElementById(`${panel}-heading`)?.focus());
    } else setPanels((previous) => ({ ...previous, [panel]: !previous[panel] }));
  }
  function closePanel(panel: Panel) {
    togglePanel(panel);
    (panel === "components" ? left : right).current?.focus();
  }

  return <div className="editor-shell">
    <header className="app-header editor-header">
      <span className="wordmark">Nodary</span><span className="header-divider" /><BackToLibrary /><span className="header-divider" />
      <h1 ref={heading} tabIndex={-1} title={document.title}>{document.title}</h1>
      <span className="temporary" title="Cleared when this tab is reloaded or closed"><Clock3 size={15} /> <span>Temporary session</span></span>
      <button className="icon-button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={() => help.current?.showModal()}><CircleHelp size={19} /></button>
    </header>
    <div className="editor-toolbar" role="group" aria-label="Editor toolbar">
      <button ref={left} className="icon-button" title="Component library" aria-label="Component library" aria-expanded={open.components}
        aria-controls={open.components ? "components-panel" : undefined} onClick={() => togglePanel("components")}><PanelLeft size={18} /></button>
      <span className="header-divider" />
      <button className="button tool-button" title="Select" aria-pressed={tool === "select"} onClick={() => setTool("select")}><MousePointer2 size={16} /> Select</button>
      <button className="button tool-button" title="Pan" aria-pressed={tool === "pan"} onClick={() => setTool("pan")}><Hand size={17} /> Pan</button>
      <span className="header-divider" />
      <button className="button tool-button" title="Show grid" aria-pressed={document.settings.gridVisible} disabled={!!session.pending}
        onClick={() => onToggle("gridVisible")}><Grid2X2 size={16} /> Grid</button>
      <button className="button tool-button" title="Snap to grid" aria-pressed={document.settings.snapToGrid} disabled={!!session.pending}
        onClick={() => onToggle("snapToGrid")}><Magnet size={16} /> Snap</button>
      <button ref={right} className="icon-button right-toggle" title="Properties" aria-label="Properties" aria-expanded={open.properties}
        aria-controls={open.properties ? "properties-panel" : undefined} onClick={() => togglePanel("properties")}><PanelRight size={18} /></button>
    </div>
    <main className="editor-main">
      {open.components && <Sidebar panel="components" close={() => closePanel("components")}>
        <div className="component-library">
          {categories.map(([name, prefix]) => <section key={prefix} aria-labelledby={`palette-${name}`}>
            <h3 id={`palette-${name}`}>{name}</h3>
            <ul>{componentRegistry.components.filter(({ type }) => type.startsWith(prefix)).map(({ type, displayName }) => <li key={type}>
              <button type="button" title={isSample ? "Create a diagram to insert components" : displayName}
                aria-label={`Insert ${displayName}`} data-type={type} draggable={!isSample && !session.pending}
                disabled={isSample || !!session.pending}
                onClick={() => { if (canvas.current?.insert(type as ComponentType) && narrow) setDrawer(undefined); }}
                onDragStart={(event) => {
                  const box = event.currentTarget.getBoundingClientRect();
                  const fraction = (value: number) => Math.max(0, Math.min(1, value));
                  drag.current = { type, hotspot: { x: fraction((event.clientX - box.left) / box.width), y: fraction((event.clientY - box.top) / box.height) } };
                  event.dataTransfer.setData("application/x-nodary-component", type);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onDragEnd={() => { drag.current = null; canvas.current?.clearDrop(); }}>
                <ComponentPreview type={type} /><span>{displayName}</span>
              </button>
            </li>)}</ul>
          </section>)}
        </div>
      </Sidebar>}
      <Canvas scene={scene} viewport={view.viewport} selection={view.selection} tool={tool} isSample={isSample}
        editor={session.editor} pending={!!session.pending} controls={canvas} drag={drag} onEdit={onEdit} onEdge={onEdge} onView={onView} />
      {open.properties && <Sidebar panel="properties" close={() => closePanel("properties")}>
        <Inspector scene={scene} session={session} readOnly={isSample} onEdge={onEdge}
          select={(ids) => onView(view.viewport ?? originView, ids)}
          openConnection={(start, trigger) => { endpointTrigger.current = trigger; setConnection(start); }} />
      </Sidebar>}
    </main>
    {session.failure && <p role="alert" className="editor-error">The temporary repository could not apply the latest edit.</p>}
    <footer className="editor-status">
      <span>{document.nodes.length} nodes · {document.edges.length} edges · {document.groups.length} boundaries</span>
      <span aria-live="polite">{view.selection.length ? `${view.selection.length} selected` : <>
        <span className="canvas-shortcut">Hold Space to pan</span><span className="desktop-hint">Desktop editing recommended</span>
      </>}</span>
    </footer>
    {connection && <EndpointDialog scene={scene} editor={session.editor} start={connection} onEdge={onEdge}
      close={() => {
        setConnection(undefined);
        requestAnimationFrame(() => {
          const target = endpointTrigger.current?.isConnected ? endpointTrigger.current : window.document.getElementById("object-picker");
          (target ?? window.document.getElementById("diagram-canvas"))?.focus({ preventScroll: true });
        });
      }} />}
    <dialog className="workspace-dialog" ref={help} aria-labelledby="shortcuts-title">
      <div className="dialog-heading"><h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <button type="button" className="icon-button" aria-label="Close" onClick={() => help.current?.close()}><X size={18} /></button></div>
      <p>Focus the canvas to use diagram shortcuts. Tab moves between workspace controls.</p>
      <dl className="shortcut-list"><div><dt>Select all</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>A</kbd></dd></div>
        <div><dt>Clear selection or cancel a gesture</dt><dd><kbd>Esc</kbd></dd></div>
        <div><dt>Pan temporarily</dt><dd><kbd>Space</kbd> + drag</dd></div>
        <div><dt>Zoom under the pointer</dt><dd><kbd>Ctrl / ⌘</kbd> + scroll</dd></div></dl>
    </dialog>
  </div>;
}

function Sidebar({ panel, close, children }: { panel: Panel; close(): void; children: ReactNode }) {
  return <aside className={`sidebar sidebar-${panel}`} id={`${panel}-panel`} aria-labelledby={`${panel}-heading`}
    onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <div className="panel-header"><h2 tabIndex={-1} id={`${panel}-heading`}>{panelNames[panel]}</h2>
      <button className="icon-button" aria-label={`Close ${panelNames[panel].toLowerCase()}`} onClick={close}><X size={16} /></button></div>
    <div className="panel-scroll">{children}</div>
  </aside>;
}

function Inspector({ scene, session, select, readOnly, openConnection, onEdge }: {
  scene: Scene; session: DocumentSession; select(ids: readonly string[]): void; readOnly: boolean;
  openConnection(start: ConnectionStart, trigger: HTMLElement): void; onEdge: EditEdge;
}) {
  const { document, view } = session.editor;
  const [edgeError, setEdgeError] = useState("");
  const all = [...scene.groups, ...scene.nodes, ...scene.edges];
  const picked = view.selection.length === 1 ? all.find(({ item }) => item.id === view.selection[0]) : undefined;
  const edge = picked && "source" in picked.item ? picked.item : undefined;
  const canConnect = picked && "type" in picked.item && componentFor(picked.item.type).allowedHandles.length > 0;
  const editEdge = (edit: Parameters<EditEdge>[0]) => setEdgeError(onEdge(edit, session.editor.generation) ?? "");
  return <div className="inspector">
    {all.length > 0 && <label>Find an object<select id="object-picker" value={picked?.item.id ?? ""} onChange={(event) => {
      select(event.target.value ? [event.target.value] : []); setEdgeError("");
    }}>
      <option value="">Choose an object</option>
      {all.map(({ item }) => <option key={item.id} value={item.id}>{objectName(item, scene)}</option>)}
    </select></label>}
    <section aria-labelledby="inspection-title">
      <h3 id="inspection-title">{picked ? objectName(picked.item, scene) : view.selection.length > 1 ? "Multiple objects" : "Document"}</h3>
      {picked ? "type" in picked.item ? <>
        <p className="inspection-type">{componentFor(picked.item.type).displayName}</p>
        <dl className="properties-list">
          <div><dt>{picked.item.parentId ? "Parent-local position" : "World position"}</dt><dd>{picked.item.position.x}, {picked.item.position.y}</dd></div>
          <div><dt>Size</dt><dd>{picked.item.size.width} × {picked.item.size.height}</dd></div>
          <div><dt>Boundary</dt><dd>{scene.groups.find(({ item }) => item.id === ("parentId" in picked.item ? picked.item.parentId : null))?.item.title || "Workspace"}</dd></div>
        </dl>
      </> : <dl className="properties-list"><div><dt>Connector</dt><dd>{picked.item.route}</dd></div><div><dt>Endpoints</dt><dd>{objectName({ ...picked.item, label: "" }, scene)}</dd></div></dl>
        : view.selection.length > 1 ? <p className="inspection-type">{view.selection.length} objects selected</p>
          : <dl className="properties-list"><div><dt>Category</dt><dd>{categoryName[document.category]}</dd></div>
            <div><dt>Grid spacing</dt><dd>{document.settings.gridSpacing} units</dd></div></dl>}
      {all.length > 0 && <div className="selection-actions">
        <button className="button selection-button" disabled={view.selection.length === all.length} onClick={() => select(objectsIn(scene))}>Select all</button>
        {view.selection.length > 0 && <button className="button selection-button" onClick={() => select([])}>Clear selection</button>}
      </div>}
      {!readOnly && canConnect && <button className="button selection-button" disabled={!!session.pending}
        onClick={(event) => openConnection({ kind: "connect", id: crypto.randomUUID(),
          source: { nodeId: picked.item.id, handleId: "right" } }, event.currentTarget)}>Connect to…</button>}
      {!readOnly && edge && <div className="connection-actions">
        <label>Connector route<select value={edge.route} disabled={!!session.pending} onChange={(event) =>
          editEdge({ kind: "route", id: edge.id, route: event.target.value as typeof edge.route })}>
          <option value="orthogonal">Orthogonal</option><option value="straight">Straight</option>
        </select></label>
        {(["source", "target"] as const).map((side) => <button className="button selection-button" key={side} disabled={!!session.pending}
          onClick={(event) => openConnection({ kind: "reconnect", id: edge.id, side }, event.currentTarget)}>Reconnect {side}</button>)}
        <button className="button selection-button" disabled={!!session.pending}
          onClick={() => editEdge({ kind: "delete", id: edge.id })}>Delete connection</button>
      </div>}
      {edgeError && <p role="alert">{edgeError}</p>}
    </section>
  </div>;
}
