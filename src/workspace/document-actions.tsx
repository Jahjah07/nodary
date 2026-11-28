import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { DraftRegistration } from "./properties";

export type DocumentAction = "rename" | "duplicate" | "delete";
export type RunDocumentAction = (action: DocumentAction, title?: string) => Promise<string | null>;
const names = { rename: "Rename", duplicate: "Duplicate", delete: "Delete" };

export function DocumentActions({ title, run, disabled = false }: { title: string; run: RunDocumentAction; disabled?: boolean }) {
  const [action, setAction] = useState<{ kind: DocumentAction; title: string; run: RunDocumentAction }>();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const registerDraft = useContext(DraftRegistration);
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (action) dialog.current?.showModal(); }, [action]);
  function trackTitle(value: string) {
    if (!form.current || action?.kind !== "rename") return;
    registerDraft?.(form.current, value === action.title ? undefined : () => {
      setError("Apply or cancel the diagram name before leaving.");
      form.current?.querySelector("input")?.focus();
      return false;
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    const value = new FormData(event.currentTarget).get("title");
    registerDraft?.(event.currentTarget);
    const failure = await action.run(action.kind, typeof value === "string" ? value : undefined);
    submitting.current = false;
    setBusy(false);
    if (failure) {
      if (typeof value === "string") trackTitle(value);
      setError(failure);
    }
    else dialog.current?.close();
  }
  return <div className="document-actions">
    {(["rename", "duplicate", "delete"] as const).map((id) => <button type="button" className="button" key={id} disabled={disabled}
      aria-label={`${names[id]} diagram ${title}`} onClick={(event) => {
        trigger.current = event.currentTarget;
        setError("");
        setAction({ kind: id, title, run });
      }}>{names[id]}</button>)}
    {action && <dialog ref={dialog} className="workspace-dialog" aria-label={`${names[action.kind]} diagram`}
      onCancel={(event) => { if (submitting.current) event.preventDefault(); }} onClose={() => {
        if (form.current) registerDraft?.(form.current);
        setAction(undefined);
        trigger.current?.focus();
      }}>
      <form ref={form} onSubmit={(event) => void submit(event)}>
        <h2>{names[action.kind]} diagram</h2>
        {action.kind === "rename" ? <label>Diagram name<input name="title" defaultValue={action.title} required
          onChange={(event) => trackTitle(event.target.value)} /></label> :
          <p>{action.kind === "delete" ? <>Permanently delete “{action.title}” and its saved view?</> : <>Create an independent copy of “{action.title}”?</>}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>{busy ? "Working…" : `${names[action.kind]} diagram`}</button>
        </div>
      </form>
    </dialog>}
  </div>;
}
