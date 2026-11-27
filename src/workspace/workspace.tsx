"use client";

import { FileQuestion } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { DocumentSummary } from "../application/document-repository";
import { beginSave, editSession, openSession, settleSave, viewSession, type DocumentSession } from "../application/document-session";
import { createDispatcher } from "../core/commands";
import { idSchema, type DiagramDocument, type Viewport } from "../core/contracts";
import { ok } from "../core/validation";
import { createMemoryDocumentRepository } from "../infrastructure/memory-document-repository";
import { Editor } from "./editor";
import { BackToLibrary, Library } from "./library";
import { editorHref, navigate, useWorkspaceLocation } from "./navigation";
import { blankDiagram, sampleDiagram, sampleId } from "./sample";

type SettingsKey = "gridVisible" | "snapToGrid";
const dispatcher = createDispatcher<{ toggle: SettingsKey }>({
  toggle(draft, key) { draft.settings[key] = !draft.settings[key]; return ok(undefined); },
}, () => new Date().toISOString());

type Entry = { route: string; session: DocumentSession | null; issue?: string };
type EntryState = { entry: Entry | undefined };

export function Workspace({ initial }: { initial: "/" | "/editor/" }) {
  const route = useWorkspaceLocation(initial);
  const path = route.split("?")[0];
  const editorRoute = path === "/editor/" || path === "/editor";
  const [repository] = useState(createMemoryDocumentRepository);
  const initialized = useRef<Promise<void> | null>(null);
  const [ready, setReady] = useState(false);
  const [documents, setDocuments] = useState<readonly DocumentSummary[]>([]);
  const [error, setError] = useState("");
  const [sessionStore] = useState(() => createStore<EntryState>(() => ({ entry: undefined })));
  const entry = useStore(sessionStore, (state) => state.entry);
  const setEntry = useCallback((next: Entry | ((current: Entry | undefined) => Entry | undefined)) => {
    sessionStore.setState(({ entry }) => ({ entry: typeof next === "function" ? next(entry) : next }));
  }, [sessionStore]);
  const [hasWork, setHasWork] = useState(false);

  useEffect(() => {
    let live = true;
    initialized.current ??= repository.create(sampleDiagram()).then((result) => {
      if (!result.ok) throw Error("The sample diagram could not be opened.");
    });
    void initialized.current.then(() => repository.list()).then((result) => {
      if (!live) return;
      if (result.ok) { setDocuments(result.value); setReady(true); }
      else setError("The temporary workspace could not be opened.");
    }).catch(() => { if (live) setError("The temporary workspace could not be opened."); });
    return () => { live = false; };
  }, [repository]);

  useEffect(() => {
    if (!hasWork) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasWork]);

  useEffect(() => {
    if (!editorRoute || !ready) return;
    let live = true;
    const query = new URLSearchParams(route.split("?")[1]);
    const value = query.get("id");
    const id = value === "fixture" ? sampleId : value;
    const foundId = query.getAll("id").length === 1 && idSchema.safeParse(id).success ? id : null;
    void (foundId ? repository.open(foundId) : Promise.resolve(null)).then((record) => {
      if (!live) return;
      if (!record?.ok) { setEntry({ route, session: null }); return; }
      const opened = openSession(crypto.randomUUID(), repository, record.value);
      setEntry(opened.ok ? { route, session: opened.value } : { route, session: null, issue: "This diagram could not be opened." });
    }).catch(() => { if (live) setEntry({ route, session: null, issue: "This diagram could not be opened." }); });
    return () => { live = false; };
  }, [editorRoute, ready, repository, route, setEntry]);

  async function refresh() {
    const list = await repository.list();
    if (list.ok) setDocuments(list.value);
  }

  async function create(title: string, category: DiagramDocument["category"]) {
    const result = await repository.create(blankDiagram(crypto.randomUUID(), title, category, new Date().toISOString()));
    if (!result.ok) return result.issues[0].message;
    setHasWork(true);
    await refresh();
    navigate(editorHref(result.value.id));
    return null;
  }

  const opened = entry?.route === route ? entry : undefined;
  const session = opened?.session;
  function updateView(viewport: Viewport | null, selection: readonly string[]) {
    if (!session) return;
    setEntry((current) => {
      if (current?.session?.token !== session.token) return current;
      const updated = viewSession(current.session, viewport, selection);
      return updated.ok ? { ...current, session: updated.value } : current;
    });
    if (viewport !== session.editor.view.viewport) void repository.saveViewport(session.editor.document.id, viewport);
  }

  async function toggle(key: SettingsKey) {
    if (!session || session.pending) return;
    const edited = editSession(session, (state) => dispatcher.dispatch(state, { type: "toggle", payload: key }));
    if (edited.outcome.status !== "committed") return;
    const saving = beginSave(edited.session);
    const capture = saving.pending!;
    setHasWork(true);
    setEntry({ route, session: saving });
    const written = await repository.save(capture.id, capture.document, capture.revision);
    setEntry((current) => current?.session?.token === session.token ? {
      ...current, session: settleSave(current.session, capture, written),
    } : current);
    await refresh();
  }

  if (!editorRoute) return <Library documents={documents} loading={!ready && !error} error={error} create={create} />;
  if (session) return <Editor key={session.token} session={session} onView={updateView} onToggle={(key) => void toggle(key)} />;
  return <>
    <header className="app-header"><span className="wordmark">Nodary</span><span className="header-divider" /><BackToLibrary /></header>
    <main className="route-state">
      <FileQuestion size={30} aria-hidden="true" />
      <h1>Diagram editor</h1>
      {error || opened?.issue ? <p role="alert">{error || opened?.issue}</p> : opened ?
        <><p role="status">Diagram not found.</p><p>Temporary diagrams are available only in the tab where you created them.</p></> :
        <p role="status">Opening diagram…</p>}
    </main>
  </>;
}
