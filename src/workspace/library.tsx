"use client";

import { ArrowLeft, ArrowUpRight, FileText, Plus, Workflow, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { DocumentSummary } from "../application/document-repository";
import type { DiagramDocument, PortableDiagram } from "../core/contracts";
import { starterTemplates, type StartPoint } from "../application/starter-templates";
import { ComponentPreview } from "./component-graphic";
import { ImportDialog } from "./import-dialog";
import { DocumentActions, type DocumentAction } from "./document-actions";
import { editorHref, follow } from "./navigation";
import { sampleId } from "./sample";

const format = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
export const categoryName = { architecture: "Architecture", flowchart: "Flowchart", general: "General" };

export function BackToLibrary({ onNavigate }: { onNavigate?: () => void } = {}) {
  // eslint-disable-next-line @next/next/no-html-link-for-pages -- Native link fallback and static same-document navigation.
  return <a className="button back-link" href="/" onClick={(event) => {
    if (!onNavigate) { follow(event); return; }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate();
  }}><ArrowLeft size={16} /> Back to diagram library</a>;
}

export function Library({ documents, loading, error, corrupt, refresh, create, importDiagram, action }: {
  documents: readonly DocumentSummary[];
  loading: boolean;
  error: string;
  corrupt: number;
  refresh(): void;
  create(title: string, category: DiagramDocument["category"], source: StartPoint): Promise<string | null>;
  importDiagram(value: PortableDiagram): Promise<string | null>;
  action(row: DocumentSummary, name: DocumentAction, title?: string): Promise<string | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState<StartPoint>("blank");
  const [title, setTitle] = useState("Untitled diagram");
  const submitting = useRef(false);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true;
    setBusy(true);
    const title = String(data.get("title"));
    // Preserve prohibited whitespace for the canonical validator to diagnose.
    const failure = await create(/[\r\v\f]/.test(title) ? title : title.trim(), data.get("category") as DiagramDocument["category"], choice);
    submitting.current = false;
    setBusy(false);
    if (failure) setProblem(failure);
    else dialog.current?.close();
  }

  return <>
    <header className="app-header library-header"><span className="wordmark">Nodary</span><span className="header-divider" /><span>Workspace</span></header>
    <main className="library">
      <div className="library-heading">
        <div><h1 ref={heading} tabIndex={-1}>Nodary diagram library</h1><p>Diagrams are stored in this browser profile and site. Private browsing, eviction, or clearing site data can remove them. Keep editable backups of important work.</p></div>
        <div className="library-actions">
          <ImportDialog disabled={loading || !!error} save={importDiagram} />
          <button className="primary" disabled={loading || !!error} onClick={() => {
            setProblem(""); setChoice("blank"); setTitle("Untitled diagram"); dialog.current?.showModal();
          }}><Plus size={16} /> New diagram</button>
        </div>
      </div>
      {loading && <p role="status">Opening your workspace…</p>}
      {error && <div className="storage-notice"><p role="alert">{error}</p><button type="button" className="button" onClick={refresh}>Retry storage</button></div>}
      {!loading && !error && <>
        <section aria-labelledby="diagrams-heading">
          <h2 id="diagrams-heading">My diagrams</h2>
          {corrupt > 0 && <p role="alert" className="storage-notice">{corrupt} stored {corrupt === 1 ? "diagram is" : "diagrams are"} unavailable because the records are corrupt or unsupported. The original records were preserved.</p>}
          {documents.length ? <div className="table-scroll"><table>
            <thead><tr><th scope="col">Name</th><th scope="col">Category</th><th scope="col">Last modified</th><th scope="col">Actions</th></tr></thead>
            <tbody>{documents.map((item) => <tr key={item.id}>
              <td><a href={editorHref(item.id)} onClick={follow}><FileText size={16} />{item.title}</a></td>
              <td>{categoryName[item.category]}</td>
              <td><time dateTime={item.updatedAt}>{format.format(new Date(item.updatedAt))}</time></td>
              <td><DocumentActions title={item.title} run={(name, title) => action(item, name, title)} /></td>
            </tr>)}</tbody>
          </table></div> : <div className="library-empty"><FileText size={24} /><div><strong>{corrupt ? "No readable diagrams" : "No diagrams yet"}</strong><p>Create a blank diagram to start editing.</p></div></div>}
        </section>
        <section aria-labelledby="sample-heading">
          <h2 id="sample-heading">Sample diagram</h2>
          <div className="sample-row">
            <span className="sample-icon"><Workflow size={20} /></span>
            <div><strong>Service architecture</strong><p>Architecture</p></div>
            <a className="button" href={editorHref(sampleId)} onClick={follow}>Open sample diagram <ArrowUpRight size={14} /></a>
          </div>
        </section>
      </>}
    </main>
    <dialog className="workspace-dialog" ref={dialog} aria-labelledby="create-title" onCancel={(event) => { if (busy) event.preventDefault(); }}>
      <form onSubmit={(event) => void submit(event)}>
        <div className="dialog-heading"><h2 id="create-title">New diagram</h2>
          <button type="button" className="icon-button" aria-label="Close" disabled={busy} onClick={() => dialog.current?.close()}><X size={18} /></button>
        </div>
        <fieldset className="template-options"><legend>Starting point</legend>
          {(["blank", "flowchart", "architecture"] as const).map((kind) => <label key={kind}>
            <input type="radio" name="starting-point" value={kind} checked={choice === kind} disabled={busy} onChange={() => {
              setChoice(kind);
              setTitle(kind === "blank" ? "Untitled diagram" : starterTemplates[kind].name);
              setProblem("");
            }} />
            {kind === "blank" ? <span className="template-blank" aria-hidden="true" /> : <ComponentPreview type={starterTemplates[kind].icon} />}
            <span>{kind === "blank" ? "Blank diagram" : starterTemplates[kind].name}</span>
          </label>)}
        </fieldset>
        <label>Diagram name<input name="title" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        {choice === "blank" && <label>Category<select name="category"><option value="general">General</option><option value="flowchart">Flowchart</option><option value="architecture">Architecture</option></select></label>}
        {problem && <p role="alert">{problem}</p>}
        <div className="dialog-actions"><button className="button" disabled={busy} type="button" onClick={() => dialog.current?.close()}>Cancel</button>
          <button className="primary" disabled={busy} type="submit">{busy ? "Creating…" : "Create diagram"}</button></div>
      </form>
    </dialog>
  </>;
}
