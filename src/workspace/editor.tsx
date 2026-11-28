"use client";

import { CircleHelp, Download, Grid2X2, Hand, Magnet, MousePointer2, PanelLeft, PanelRight, Redo2, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref, type SyntheticEvent } from "react";
import { saveStatus, type DocumentSession } from "../application/document-session";
import type { Panels } from "../application/document-repository";
import type { Viewport } from "../core/contracts";
import { componentFor, componentRegistry } from "../core/registry";
import type { ComponentType } from "../core/component-edits";
import { EndpointDialog, type ConnectionStart, type EditEdge } from "./connections";
import { DraftRegistration, LabelDialog, PropertyControls, type EditProperty } from "./properties";
import { DocumentActions, type RunDocumentAction } from "./document-actions";
import { HierarchyControls, type EditHierarchy } from "./hierarchy-controls";
import { Canvas, type CanvasControls, type EditComponent, type HistoryAction, type PaletteDrag, type Tool } from "./canvas";
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
const saveLabels = { temporary: "Temporary session", unsaved: "Unsaved changes", saving: "Saving", saved: "Saved locally",
  failed: "Save failed", conflict: "Changes conflict" };
export type EditorControls = { prepare(): boolean };

export function Editor({ session, onView, onToggle, onEdit, onEdge, onProperty, onHierarchy, onHistory,
  controls, onDirty, onLibrary, onDocumentAction, onBackup, recovery, panelPreference, onPanels, busy = false }: {
  session: DocumentSession;
  onView(viewport: Viewport | null, selection: readonly string[]): void;
  onToggle(key: "gridVisible" | "snapToGrid"): void;
  onEdit: EditComponent;
  onEdge: EditEdge;
  onProperty: EditProperty;
  onHierarchy: EditHierarchy;
  onHistory(action: HistoryAction): string | null;
  controls?: Ref<EditorControls>;
  onDirty?(dirty: boolean): void;
  onLibrary?(): void;
  onDocumentAction?: RunDocumentAction;
  onBackup?(): void;
  recovery?: ReactNode;
  panelPreference?: Panels;
  onPanels?(panels: Panels): void;
  busy?: boolean;
}) {
  const { document, view } = session.editor;
  const scene = useMemo(() => buildScene(document, measureLabel), [document]);
  const isSample = document.id === sampleId;
  const canvas = useRef<CanvasControls>(null);
  const drag = useRef<PaletteDrag | null>(null);
  const [connection, setConnection] = useState<ConnectionStart>();
  const [labelId, setLabelId] = useState<string>();
  const labelItem = labelId ? [...document.nodes, ...document.edges, ...document.groups].find(({ id }) => id === labelId) : undefined;
  const endpointTrigger = useRef<HTMLElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const [panels, setPanels] = useState({ components: true, properties: true });
  const [drawer, setDrawer] = useState<Panel>();
  const help = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const left = useRef<HTMLButtonElement>(null);
  const right = useRef<HTMLButtonElement>(null);
  const preferred = panelPreference ?? panels;
  const open = { components: narrow ? drawer === "components" : preferred.components, properties: narrow ? drawer === "properties" : preferred.properties };
  const drafts = useRef(new Map<HTMLFormElement, () => boolean>());
  const registerDraft = useCallback((form: HTMLFormElement, resolve?: () => boolean) => {
    if (resolve) drafts.current.set(form, resolve);
    else drafts.current.delete(form);
    onDirty?.(drafts.current.size > 0);
  }, [onDirty]);
  useImperativeHandle(controls, () => ({
    prepare() {
      canvas.current?.cancel();
      return [...drafts.current.values()].every((resolve) => resolve());
    },
  }));
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  function togglePanel(panel: Panel) {
    if (narrow) {
      setDrawer(open[panel] ? undefined : panel);
      if (!open[panel]) requestAnimationFrame(() => window.document.getElementById(`${panel}-heading`)?.focus());
    } else {
      const next = { ...preferred, [panel]: !preferred[panel] };
      if (onPanels) onPanels(next);
      else setPanels(next);
    }
  }
  function closePanel(panel: Panel) {
    togglePanel(panel);
    (panel === "components" ? left : right).current?.focus();
  }

  function guardDraft(event: SyntheticEvent<HTMLDivElement>) {
    const invalid = event.currentTarget.querySelector<HTMLFormElement>('.property-field[data-invalid="true"]');
    if (invalid && !invalid.contains(event.target as HTMLElement)) {
      event.preventDefault();
      event.stopPropagation();
      invalid.querySelector<HTMLElement>("input, textarea, select")?.focus();
    }
  }
  return <DraftRegistration.Provider value={registerDraft}><div className="editor-shell" onPointerDownCapture={guardDraft} onClickCapture={guardDraft}>
    <header className="app-header editor-header">
      <span className="wordmark">Nodary</span><span className="header-divider" /><BackToLibrary onNavigate={onLibrary} /><span className="header-divider" />
      <h1 ref={heading} tabIndex={-1} title={document.title}>{document.title}</h1>
      <span className="save-state" data-save-state={isSample ? "sample" : saveStatus(session)} aria-live="polite">
        {isSample ? "Read-only sample" : saveLabels[saveStatus(session)]}
      </span>
      <button className="icon-button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={() => help.current?.showModal()}><CircleHelp size={19} /></button>
    </header>
    <div className="editor-toolbar" role="group" aria-label="Editor toolbar">
      <button ref={left} className="icon-button" title="Component library" aria-label="Component library" aria-expanded={open.components}
        aria-controls={open.components ? "components-panel" : undefined} onClick={() => togglePanel("components")}><PanelLeft size={18} /></button>
      <span className="header-divider" />
      <button className="button tool-button" title="Select" aria-pressed={tool === "select"} onClick={() => setTool("select")}><MousePointer2 size={16} /> Select</button>
      <button className="button tool-button" title="Pan" aria-pressed={tool === "pan"} onClick={() => setTool("pan")}><Hand size={17} /> Pan</button>
      <span className="header-divider" />
      <button className="icon-button" type="button" aria-label="Undo" aria-keyshortcuts="Control+Z Meta+Z" title="Undo (Ctrl / ⌘ + Z)"
        data-history-action disabled={isSample || busy || !session.editor.history.past.length} onClick={() => canvas.current?.history("undo")}><Undo2 size={18} /></button>
      <button className="icon-button" type="button" aria-label="Redo" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" title="Redo (Ctrl / ⌘ + Shift + Z, or Ctrl + Y)"
        data-history-action disabled={isSample || busy || !session.editor.history.future.length} onClick={() => canvas.current?.history("redo")}><Redo2 size={18} /></button>
      <span className="header-divider" />
      <button className="button tool-button" title="Show grid" aria-pressed={document.settings.gridVisible} disabled={busy}
        onClick={() => onToggle("gridVisible")}><Grid2X2 size={16} /> Grid</button>
      <button className="button tool-button" title="Snap to grid" aria-pressed={document.settings.snapToGrid} disabled={busy}
        onClick={() => onToggle("snapToGrid")}><Magnet size={16} /> Snap</button>
      {!isSample && onDocumentAction && <DocumentActions title={document.title} run={onDocumentAction} disabled={busy} />}
      {!isSample && onBackup && <button className="button tool-button" title="Download editable backup" onClick={onBackup}><Download size={16} /> Backup</button>}
      <button ref={right} className="icon-button right-toggle" title="Properties" aria-label="Properties" aria-expanded={open.properties}
        aria-controls={open.properties ? "properties-panel" : undefined} onClick={() => togglePanel("properties")}><PanelRight size={18} /></button>
    </div>
    {recovery}
    <main className="editor-main">
      {open.components && <Sidebar panel="components" close={() => closePanel("components")}>
        <div className="component-library">
          {categories.map(([name, prefix]) => <section key={prefix} aria-labelledby={`palette-${name}`}>
            <h3 id={`palette-${name}`}>{name}</h3>
            <ul>{componentRegistry.components.filter(({ type }) => type.startsWith(prefix)).map(({ type, displayName }) => <li key={type}>
              <button type="button" title={isSample ? "Create a diagram to insert components" : displayName}
                aria-label={`Insert ${displayName}`} data-type={type} draggable={!isSample && !busy}
                disabled={isSample || busy}
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
        editor={session.editor} pending={busy} controls={canvas} drag={drag} onEdit={onEdit} onEdge={onEdge} onView={onView}
        onLabel={setLabelId} onHierarchy={onHierarchy} onHistory={onHistory} />
      {open.properties && <Sidebar panel="properties" close={() => closePanel("properties")}>
        <Inspector scene={scene} session={session} readOnly={isSample} busy={busy} onEdge={onEdge} onProperty={onProperty} onHierarchy={onHierarchy}
          select={(ids) => { canvas.current?.finishNudge(); onView(view.viewport ?? originView, ids); }}
          openConnection={(start, trigger) => { endpointTrigger.current = trigger; setConnection(start); }} />
      </Sidebar>}
    </main>
    <footer className="editor-status">
      <span>{document.nodes.length} nodes · {document.edges.length} edges · {document.groups.length} boundaries</span>
      <span aria-live="polite">{view.selection.length ? `${view.selection.length} selected` : <>
        <span className="canvas-shortcut">Hold Space to pan</span><span className="desktop-hint">Desktop editing recommended</span>
      </>}</span>
    </footer>
    {labelItem && <LabelDialog key={labelItem.id} item={labelItem} generation={session.editor.generation} onEdit={onProperty}
      close={() => {
        setLabelId(undefined);
        window.document.getElementById("diagram-canvas")?.focus({ preventScroll: true });
      }} />}
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
        <div><dt>Undo</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Z</kbd></dd></div>
        <div><dt>Redo</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> or <kbd>Ctrl</kbd> + <kbd>Y</kbd> on Windows</dd></div>
        <div><dt>Duplicate selection</dt><dd><kbd>Ctrl / ⌘</kbd> + <kbd>D</kbd></dd></div>
        <div><dt>Delete selection</dt><dd><kbd>Delete</kbd> or <kbd>Backspace</kbd></dd></div>
        <div><dt>Nudge selection</dt><dd><kbd>Arrow keys</kbd> · 1 unit, or 20 with snap</dd></div>
        <div><dt>Edit selected label or title</dt><dd><kbd>Enter</kbd></dd></div>
        <div><dt>Clear selection or cancel a gesture</dt><dd><kbd>Esc</kbd></dd></div>
        <div><dt>Pan temporarily</dt><dd><kbd>Space</kbd> + drag</dd></div>
        <div><dt>Zoom under the pointer</dt><dd><kbd>Ctrl / ⌘</kbd> + scroll</dd></div></dl>
      <p>Use the Hierarchy controls in Properties to group or ungroup objects and assign a parent boundary.</p>
      <p>Local storage is specific to this browser profile and site. Private browsing, eviction, or clearing site data can remove diagrams. Download an editable backup for work you need to keep.</p>
    </dialog>
  </div></DraftRegistration.Provider>;
}

function Sidebar({ panel, close, children }: { panel: Panel; close(): void; children: ReactNode }) {
  return <aside className={`sidebar sidebar-${panel}`} id={`${panel}-panel`} aria-labelledby={`${panel}-heading`}
    onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
    <div className="panel-header"><h2 tabIndex={-1} id={`${panel}-heading`}>{panelNames[panel]}</h2>
      <button className="icon-button" aria-label={`Close ${panelNames[panel].toLowerCase()}`} onClick={close}><X size={16} /></button></div>
    <div className="panel-scroll">{children}</div>
  </aside>;
}

function Inspector({ scene, session, select, readOnly, busy, openConnection, onEdge, onProperty, onHierarchy }: {
  scene: Scene; session: DocumentSession; select(ids: readonly string[]): void; readOnly: boolean; busy: boolean;
  openConnection(start: ConnectionStart, trigger: HTMLElement): void; onEdge: EditEdge;
  onProperty: EditProperty;
  onHierarchy: EditHierarchy;
}) {
  const { document, view } = session.editor;
  const [edgeError, setEdgeError] = useState("");
  const all = [...scene.groups, ...scene.nodes, ...scene.edges];
  const selectedItems = all.filter(({ item }) => view.selection.includes(item.id)).map(({ item }) => item);
  const picked = view.selection.length === 1 ? all.find(({ item }) => item.id === view.selection[0]) : undefined;
  const edge = picked && "source" in picked.item ? picked.item : undefined;
  const canConnect = picked && "type" in picked.item && componentFor(picked.item.type).allowedHandles.length > 0;
  const editEdge = (edit: Parameters<EditEdge>[0]) => setEdgeError(onEdge(edit, session.editor.generation) ?? "");
  return <div className="inspector">
    {all.length > 0 && <label>Find an object<select id="object-picker" data-selection-action value={picked?.item.id ?? ""} onChange={(event) => {
      select(event.target.value ? [event.target.value] : []); setEdgeError("");
    }}>
      <option value="">Choose an object</option>
      {all.map(({ item }) => <option key={item.id} value={item.id}>{objectName(item, scene)}
        {"status" in item && item.status !== "not_specified" ? ` · ${componentRegistry.statuses[item.status].label}` : ""}
      </option>)}
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
        <button className="button selection-button" data-selection-action disabled={view.selection.length === all.length} onClick={() => select(objectsIn(scene))}>Select all</button>
        {view.selection.length > 0 && <button className="button selection-button" data-selection-action onClick={() => select([])}>Clear selection</button>}
      </div>}
      {!readOnly && canConnect && <button className="button selection-button" disabled={busy}
        onClick={(event) => openConnection({ kind: "connect", id: crypto.randomUUID(),
          source: { nodeId: picked.item.id, handleId: "right" } }, event.currentTarget)}>Connect to…</button>}
      {!readOnly && edge && <div className="connection-actions">
        {(["source", "target"] as const).map((side) => <button className="button selection-button" key={side} disabled={busy}
          onClick={(event) => openConnection({ kind: "reconnect", id: edge.id, side }, event.currentTarget)}>Reconnect {side}</button>)}
        <button className="button selection-button" disabled={busy}
          onClick={() => editEdge({ kind: "delete", id: edge.id })}>Delete connection</button>
      </div>}
      {edgeError && <p role="alert">{edgeError}</p>}
      {!readOnly && selectedItems.length > 0 && <HierarchyControls key={JSON.stringify(view.selection)}
        document={document} ids={view.selection} generation={session.editor.generation} pending={busy} edit={onHierarchy} />}
      {!readOnly && selectedItems.length > 0 && <PropertyControls items={selectedItems} generation={session.editor.generation}
        busy={busy} onEdit={onProperty} />}
    </section>
  </div>;
}
