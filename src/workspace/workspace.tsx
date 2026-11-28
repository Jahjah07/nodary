"use client";

import { FileQuestion } from "lucide-react";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { createAutosave, hasPendingContent } from "../application/autosave";
import { copyDiagram, createWithFreshIds, remapDiagram } from "../application/document-lifecycle";
import { validatePortableFile } from "../application/portable-file";
import { starterTemplates, type StartPoint } from "../application/starter-templates";
import { summaryOf, type DocumentRepository, type DocumentSummary, type OpenDocument, type Panels } from "../application/document-repository";
import { editSession, openSession, viewSession, type DocumentSession } from "../application/document-session";
import type { CommandState, Outcome } from "../core/commands";
import type { EdgeEdit } from "../core/edge-edits";
import type { PropertyEdit } from "../core/properties";
import { duplicatePlan, type HierarchyEdit } from "../core/hierarchy-edits";
import { indexHierarchy } from "../core/hierarchy";
import type { EditHierarchy } from "./hierarchy-controls";
import { componentDispatcher, type ComponentEdit } from "../core/component-edits";
import { idSchema, type DiagramDocument, type PortableDiagram, type Viewport } from "../core/contracts";
import { ok, type Issue, type Result } from "../core/validation";
import { createIndexedDocumentRepository } from "../infrastructure/indexed-document-repository";
import { Editor, type EditorControls } from "./editor";
import { backupData, downloadBackup } from "./backup";
import type { DocumentAction } from "./document-actions";
import { measureLabel } from "./component-graphic";
import { BackToLibrary, Library } from "./library";
import { editorHref, navigate, useWorkspaceLocation } from "./navigation";
import { blankDiagram, sampleDiagram, sampleId } from "./sample";

const dispatcher = componentDispatcher(measureLabel);

type Entry = { route: string; session: DocumentSession | null; issue?: string };
type EntryState = { entry: Entry | undefined };
const defaults = { components: true, properties: true };
const externalConflict: Issue = {
  code: "REVISION_CONFLICT", message: "The stored diagram changed or was deleted in another tab.", path: [],
};
const titleInput = (title: string) => /[\r\v\f]/.test(title) ? title : title.trim();

export function Workspace({ initial, repository: provided }: { initial: "/" | "/editor/"; repository?: DocumentRepository }) {
  const requested = useWorkspaceLocation(initial);
  const [route, setRoute] = useState<string>(initial);
  const path = route.split("?")[0];
  const editorRoute = path === "/editor/" || path === "/editor";
  const [repository] = useState(() => provided ?? createIndexedDocumentRepository());
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState<readonly DocumentSummary[]>([]);
  const [corrupt, setCorrupt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");
  const [panelWarning, setPanelWarning] = useState("");
  const [panels, setPanels] = useState<Panels>(defaults);
  const panelEdited = useRef(false);
  const libraryRequest = useRef(0);
  const [sessionStore] = useState(() => createStore<EntryState>(() => ({ entry: undefined })));
  const entry = useStore(sessionStore, (state) => state.entry);
  const setEntry = useCallback((next: Entry | undefined | ((current: Entry | undefined) => Entry | undefined)) => {
    sessionStore.setState(({ entry }) => ({ entry: typeof next === "function" ? next(entry) : next }));
  }, [sessionStore]);
  const active = useCallback(() => sessionStore.getState().entry?.session ?? undefined, [sessionStore]);
  const controls = useRef<EditorControls>(null);
  const save = useRef<ReturnType<typeof createAutosave> | null>(null);
  const operation = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dirtyDraft, setDirtyDraft] = useState(false);
  const [blockedRoute, setBlockedRoute] = useState<string>();
  const viewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queuedView = useRef<{ token: string; id: string; viewport: Viewport | null } | null>(null);
  const [reload, setReload] = useState(0);
  const reloadSnapshot = useRef<OpenDocument | undefined>(undefined);

  const refresh = useCallback(async () => {
    const sequence = ++libraryRequest.current;
    let invalid = 0;
    const result = await repository.list((count) => { invalid = count; });
    if (sequence !== libraryRequest.current) return;
    setReady(true);
    if (result.ok) {
      setDocuments(result.value);
      setCorrupt(invalid);
      setError("");
    } else setError(result.issues[0].message);
  }, [repository]);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => { if (live) void refresh(); });
    void repository.getPanels?.().then((result) => {
      if (!live || panelEdited.current) return;
      if (result.ok) setPanels(result.value ?? defaults);
      else if (result.issues[0].code === "INVALID_PREFERENCE") setPanelWarning(result.issues[0].message);
    });
    const unsubscribe = repository.onVersionChange?.((issue) => {
      setWarning(issue.message);
      setError(issue.message);
      setEntry((current) => current?.session && current.session.editor.document.id !== sampleId && !current.session.pending
        ? { ...current, session: { ...current.session, failure: "failed", issue } } : current);
    });
    return () => { live = false; unsubscribe?.(); };
  }, [repository, refresh, setEntry]);

  const session = entry?.route === route ? entry.session : undefined;
  const needsUnload = dirtyDraft || !!(session && session.editor.document.id !== sampleId && hasPendingContent(session));
  useEffect(() => {
    if (!needsUnload) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [needsUnload]);

  useEffect(() => {
    if (!editorRoute) return;
    let live = true;
    const query = new URLSearchParams(route.split("?")[1]);
    const value = query.get("id");
    const id = value === "fixture" ? sampleId : value;
    const foundId = query.getAll("id").length === 1 && idSchema.safeParse(id).success ? id : null;
    const source = foundId === sampleId ? sampleDiagram() : null;
    const cached = reloadSnapshot.current;
    const opened = cached && cached.record.id === foundId ? Promise.resolve(ok(cached)) : source ? Promise.resolve(ok<OpenDocument>({
      record: { ...summaryOf(source.document, 1), content: source.document }, viewport: source.viewport,
    })) : foundId ? repository.open(foundId) : Promise.resolve(null);
    void opened.then((record) => {
      if (!live) return;
      if (!record?.ok) {
        setEntry({ route, session: null, issue: record && record.issues[0].code !== "RECORD_NOT_FOUND" ? record.issues[0].message : undefined });
        return;
      }
      const result = openSession(crypto.randomUUID(), repository, record.value);
      if (!result.ok) {
        setEntry({ route, session: null, issue: "This diagram could not be opened. Its stored record was preserved." });
        return;
      }
      const token = result.value.token;
      if (cached === record.value) reloadSnapshot.current = undefined;
      setWarning(record.value.warning?.message ?? "");
      setEntry({ route, session: result.value });
      save.current = createAutosave(repository, () => {
        const latest = active();
        return latest?.token === token ? latest : undefined;
      }, (next) => setEntry((current) =>
        current?.session?.token === token ? { ...current, session: next } : current), () => void refresh());
    }).catch(() => { if (live) setEntry({ route, session: null, issue: "This diagram could not be opened." }); });
    return () => { live = false; save.current?.dispose(); };
  }, [active, editorRoute, refresh, reload, repository, route, setEntry]);

  function accept(target: string) {
    save.current?.dispose();
    clearTimeout(viewTimer.current);
    queuedView.current = null;
    setEntry(undefined);
    setDirtyDraft(false);
    setNotice("");
    setWarning("");
    setBlockedRoute(undefined);
    setRoute(target);
    navigate(target);
  }
  async function writeView() {
    clearTimeout(viewTimer.current);
    const view = queuedView.current;
    queuedView.current = null;
    if (!view || active()?.token !== view.token) return;
    const result = await repository.saveViewport(view.id, view.viewport);
    if (!result.ok && active()?.token === view.token) setWarning("The viewport could not be saved. Diagram content is unaffected.");
  }
  function prepare() {
    if (controls.current?.prepare() !== false) return true;
    setNotice("Finish or cancel the active draft before continuing.");
    return false;
  }
  function setOperating(value: boolean) { operation.current = value; setBusy(value); }
  async function leave(target: string, retry = false, discard = false) {
    if (operation.current || !prepare()) return false;
    const current = active();
    if (current && current.editor.document.id !== sampleId) {
      setOperating(true);
      try {
        if (!discard && hasPendingContent(current) && !await save.current?.flush(retry)) { setBlockedRoute(target); return false; }
        await writeView();
      } finally { setOperating(false); }
    }
    accept(target);
    return true;
  }
  const acceptLocation = useEffectEvent((target: string) => {
    if (target !== route) void leave(target).then((allowed) => {
      if (!allowed && window.location.pathname + window.location.search === target) navigate(route, true);
    });
  });
  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => { if (live) acceptLocation(requested); });
    return () => { live = false; };
  }, [requested]);

  const recheck = useEffectEvent(async () => {
    void refresh();
    const before = active();
    if (!before || before.editor.document.id === sampleId || before.pending) return;
    const result = await repository.open(before.editor.document.id);
    setEntry((current) => {
      const latest = current?.session;
      if (!latest || latest.token !== before.token || latest.revision !== before.revision || latest.pending) return current;
      if (result.ok ? result.value.record.revision !== latest.revision : result.issues[0].code === "RECORD_NOT_FOUND") {
        return { ...current!, session: { ...latest, failure: "conflict", issue: externalConflict } };
      }
      if (!result.ok && (result.issues[0].code === "CORRUPT_RECORD" || result.issues[0].code === "UNSUPPORTED_VERSION")) {
        return { ...current!, session: { ...latest, failure: "failed", issue: result.issues[0] } };
      }
      return current;
    });
  });
  const flushOnHide = useEffectEvent(() => { void save.current?.flush(); void writeView(); });
  useEffect(() => {
    const focus = () => { void recheck(); };
    const visibility = () => { if (document.visibilityState === "visible") focus(); else flushOnHide(); };
    const hide = () => flushOnHide();
    window.addEventListener("focus", focus);
    window.addEventListener("pagehide", hide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("focus", focus);
      window.removeEventListener("pagehide", hide);
      document.removeEventListener("visibilitychange", visibility);
      clearTimeout(viewTimer.current);
    };
  }, []);

  function updateView(viewport: Viewport | null, selection: readonly string[]) {
    const current = active();
    if (!session || !current || current.token !== session.token) return;
    const updated = viewSession(current, viewport, selection);
    if (!updated.ok) return;
    setEntry({ route, session: updated.value });
    if (current.editor.document.id === sampleId || !current.editor.view.viewport ||
      updated.value.editor.view.viewport === current.editor.view.viewport) return;
    queuedView.current = { token: current.token, id: current.editor.document.id, viewport };
    clearTimeout(viewTimer.current);
    viewTimer.current = setTimeout(() => { void writeView(); }, 500);
  }

  function apply(applyEdit: (state: CommandState) => Outcome, selection?: readonly string[]) {
    const current = active();
    if (!session || !current || current.token !== session.token || operation.current) return "Wait for the current document action to finish.";
    const edited = editSession(current, applyEdit);
    if (edited.outcome.status === "rejected") return edited.outcome.issues[0].message;
    const selected = selection && viewSession(edited.session, edited.session.editor.view.viewport, selection);
    const next = selected?.ok ? selected.value : edited.session;
    setEntry({ route, session: next });
    if (edited.outcome.status === "committed" && current.editor.document.id !== sampleId) save.current?.edited();
    return null;
  }

  function edit(payload: ComponentEdit, selection: readonly string[] | undefined, expectedGeneration: number) {
    if (session?.editor.document.id === sampleId) return "Create a diagram to edit components.";
    const issue = apply((state) => dispatcher.dispatch(state, { type: "component", payload, expectedGeneration }), selection);
    return issue ?? sessionStore.getState().entry!.session!.editor;
  }
  function editEdge(payload: EdgeEdit, expectedGeneration: number) {
    if (session?.editor.document.id === sampleId) return "Create a diagram to edit connections.";
    return apply((state) => dispatcher.dispatch(state, { type: "edge", payload, expectedGeneration }), payload.kind === "delete" ? [] : [payload.id]);
  }
  const editHierarchy: EditHierarchy = (intent, expectedGeneration) => {
    if (!session || session.editor.document.id === sampleId) return "Create a diagram to edit its hierarchy.";
    let payload: HierarchyEdit;
    let selection: string[] | undefined;
    if (intent.kind === "group") {
      const id = crypto.randomUUID();
      payload = { kind: "group", ids: intent.ids, id };
      selection = [id];
    } else if (intent.kind === "duplicate") {
      const document = session.editor.document;
      const index = indexHierarchy(document);
      if (!index.ok) return index.issues[0].message;
      const plan = duplicatePlan(document, index.value, intent.ids);
      const ids = [...plan.included, ...plan.edges.map(({ id }) => id)];
      const copies = Object.fromEntries(ids.map((id) => [id, crypto.randomUUID()]));
      payload = { kind: "duplicate", ids: intent.ids, copies };
      if (ids.length) selection = [...plan.roots, ...plan.edges.map(({ id }) => id)].map((id) => copies[id]);
    } else if (intent.kind === "reparent") payload = intent;
    else payload = { kind: intent.kind, ids: intent.ids };
    return apply((state) => dispatcher.dispatch(state, { type: "hierarchy", payload, expectedGeneration }), selection);
  };
  const now = () => new Date().toISOString();
  const uuid = () => crypto.randomUUID();
  async function addDiagram(make: () => Result<PortableDiagram>) {
    if (operation.current) return "Wait for the current document action to finish.";
    setOperating(true);
    try {
      const result = await createWithFreshIds(make, repository);
      if (!result.ok) return result.issues[0].message;
      await refresh();
      accept(editorHref(result.value.id));
      return null;
    } finally { setOperating(false); }
  }
  function importDiagram(source: PortableDiagram, title = source.document.title) {
    return addDiagram(() => {
      const copy = remapDiagram(source.document, source.viewport, now(), uuid, title);
      return copy.ok ? validatePortableFile(copy.value, measureLabel) : copy;
    });
  }
  async function create(title: string, category: DiagramDocument["category"], startingPoint: StartPoint) {
    if (startingPoint === "blank") return addDiagram(() => ok(blankDiagram(uuid(), title, category, now())));
    const checked = validatePortableFile(starterTemplates[startingPoint].source, measureLabel);
    if (!checked.ok) return checked.issues.map(({ code, path, message }) => `${path.join(".")} · ${code} · ${message}`).join(" ");
    return importDiagram(checked.value, title);
  }
  async function libraryAction(row: DocumentSummary, action: DocumentAction, title?: string) {
    if (operation.current) return "Wait for the current document action to finish.";
    setOperating(true);
    try {
      if (action === "delete") {
        const result = await repository.remove(row.id, row.revision);
        await refresh();
        return result.ok ? null : result.issues[0].message;
      }
      const stored = await repository.open(row.id);
      if (!stored.ok) return stored.issues[0].message;
      if (action === "duplicate") {
        const { record, viewport } = stored.value;
        const result = await createWithFreshIds(() => copyDiagram(record.content, viewport, now(), uuid), repository);
        if (!result.ok) return result.issues[0].message;
      } else {
        if (stored.value.record.revision !== row.revision) { await refresh(); return externalConflict.message; }
        const opened = openSession(uuid(), repository, stored.value);
        if (!opened.ok) return opened.issues[0].message;
        const renamed = dispatcher.dispatch(opened.value.editor, { type: "rename", payload: titleInput(title ?? "") });
        if (renamed.status === "rejected") return renamed.issues[0].message;
        if (renamed.status === "committed") {
          const result = await repository.save(row.id, renamed.state.document, row.revision);
          if (!result.ok) { await refresh(); return result.issues[0].message; }
        }
      }
      await refresh();
      return null;
    } finally { setOperating(false); }
  }
  async function duplicateActive(openCopy = false) {
    if (operation.current || !prepare()) return "Finish the current edit before copying.";
    const current = active();
    if (!current) return "The active diagram could not be copied.";
    setOperating(true);
    try {
      const { document, view } = current.editor;
      const result = await createWithFreshIds(() => copyDiagram(document, view.viewport, now(), uuid), repository);
      if (!result.ok) return result.issues[0].message;
      await refresh();
      if (openCopy) accept(editorHref(result.value.id));
      else setNotice("Independent copy created in the diagram library.");
      return null;
    } finally { setOperating(false); }
  }
  async function editorAction(action: DocumentAction, title?: string): Promise<string | null> {
    if (action === "duplicate") return duplicateActive();
    if (operation.current || !prepare()) return "Finish the current edit before continuing.";
    if (action === "rename") return apply((state) => dispatcher.dispatch(state, { type: "rename", payload: titleInput(title ?? "") }));
    setOperating(true);
    try {
      if (!await save.current?.flush()) return "Resolve the save failure before deleting the diagram.";
      const current = active();
      if (!current) return "The active diagram is unavailable.";
      const result = await repository.remove(current.editor.document.id, current.revision);
      await refresh();
      if (!result.ok) {
        if (result.issues[0].code === "REVISION_CONFLICT") {
          setEntry({ route, session: { ...current, failure: "conflict", issue: result.issues[0] } });
        }
        return result.issues[0].message;
      }
      accept("/");
      return null;
    } finally { setOperating(false); }
  }
  async function reloadLatest() {
    if (operation.current || !prepare()) return;
    const current = active();
    if (!current || (hasPendingContent(current) && !window.confirm("Discard your unsaved changes and reload the stored diagram?"))) return;
    setOperating(true);
    try {
      const result = await repository.open(current.editor.document.id);
      if (!result.ok) {
        if (result.issues[0].code === "RECORD_NOT_FOUND") { accept("/"); await refresh(); }
        else setNotice(result.issues[0].message);
        return;
      }
      reloadSnapshot.current = result.value;
      accept(route);
      setReload((previous) => previous + 1);
    } finally { setOperating(false); }
  }
  async function retry() {
    if (operation.current || !prepare()) return;
    if (blockedRoute) { await leave(blockedRoute, true); return; }
    await save.current?.flush(true);
  }
  function capture() {
    if (!prepare()) return undefined;
    const current = active();
    return current ? { document: current.editor.document, viewport: current.editor.view.viewport } : undefined;
  }
  function backup() {
    const current = capture();
    if (current) setNotice(downloadBackup(backupData(current.document, current.viewport)) ?? "");
  }
  function changePanels(value: Panels) {
    panelEdited.current = true;
    setPanels(value);
    void repository.savePanels?.(value).then((result) => setPanelWarning(result.ok ? "" : result.issues[0].message));
  }

  const opened = entry?.route === route ? entry : undefined;
  if (!editorRoute) return <Library documents={documents} loading={!ready && !error} error={error} corrupt={corrupt}
    refresh={() => void refresh()} create={create} importDiagram={importDiagram} action={libraryAction} />;
  if (session) return <Editor key={session.token} session={session} onView={updateView} onEdit={edit} onEdge={editEdge} onHierarchy={editHierarchy}
    controls={controls} onDirty={setDirtyDraft} onLibrary={() => void leave("/")} onDocumentAction={editorAction} onBackup={backup} onExport={capture}
    panelPreference={panels} onPanels={changePanels} busy={busy}
    recovery={<>
      {(notice || warning || panelWarning) && <p className="storage-notice" role="status">{[notice, warning, panelWarning].filter(Boolean).join(" ")}</p>}
      {(session.failure || blockedRoute) && <section className="storage-notice storage-recovery" aria-label="Storage recovery">
        <p role="alert">{session.issue?.message ?? "There are unsaved changes."} {blockedRoute && "Resolve the changes before leaving."}</p>
        <div className="document-actions">
          {session.failure === "conflict" ? <>
            <button className="button" type="button" disabled={busy} onClick={() => void reloadLatest()}>Reload latest</button>
            <button className="button" type="button" disabled={busy} onClick={() => void duplicateActive(true).then((problem) => {
              if (problem) setNotice(problem);
            })}>Save as independent copy</button>
          </> : <button className="button" type="button" disabled={busy} onClick={() => void retry()}>{blockedRoute ? "Retry and leave" : "Retry save"}</button>}
          <button className="button" type="button" onClick={backup}>Download editable backup</button>
          <button className="button" type="button" onClick={() => {
            setBlockedRoute(undefined);
            setNotice("Stayed in the editor. Your current diagram is still open.");
          }}>Stay in editor</button>
          {blockedRoute && <button className="button" type="button" disabled={busy} onClick={() => {
            if (window.confirm("Discard unsaved changes and leave this diagram?")) void leave(blockedRoute, false, true);
          }}>Discard changes and leave</button>}
        </div>
      </section>}
    </>}
    onHistory={(action) => session.editor.document.id === sampleId ? null : apply(dispatcher[action])}
    onProperty={(payload: PropertyEdit, expectedGeneration) => {
      if (session.editor.document.id === sampleId) return "Create a diagram to edit properties.";
      return apply((state) => dispatcher.dispatch(state, { type: "property", payload, expectedGeneration }));
    }}
    onToggle={(key) => apply((state) => dispatcher.dispatch(state, { type: "toggle", payload: key }))} />;
  return <>
    <header className="app-header"><span className="wordmark">Nodary</span><span className="header-divider" /><BackToLibrary /></header>
    <main className="route-state">
      <FileQuestion size={30} aria-hidden="true" />
      <h1>Diagram editor</h1>
      {opened?.issue ? <><p role="alert">{opened.issue}</p><button type="button" className="button" onClick={() => {
        setEntry(undefined);
        setReload((previous) => previous + 1);
      }}>Retry storage</button></> : opened ?
        <><p role="status">Diagram not found.</p><p>Diagrams are available in the browser profile and site where they were saved.</p></> :
        <p role="status">Opening diagram…</p>}
    </main>
  </>;
}
