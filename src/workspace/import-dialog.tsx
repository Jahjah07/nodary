import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { readNativeFile } from "../application/portable-file";
import type { PortableDiagram } from "../core/contracts";
import type { Issue } from "../core/validation";
import { measureLabel } from "./component-graphic";

function diagnosticPath(path: Issue["path"]) {
  return path.map((part) => typeof part === "number" || /^[A-Za-z][A-Za-z0-9_-]{0,49}$/.test(part) ? part : "[field]")
    .join(".").slice(0, 150);
}

export function ImportDialog({ disabled, save }: { disabled: boolean; save(value: PortableDiagram): Promise<string | null> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const request = useRef(0);
  const writing = useRef(false);
  const [snapshot, setSnapshot] = useState<PortableDiagram>();
  const [issues, setIssues] = useState<readonly Issue[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  function reset() {
    ++request.current;
    if (picker.current) picker.current.value = "";
    setSnapshot(undefined);
    setIssues([]);
    setStatus("");
    setFailure("");
  }
  async function validate(file?: File) {
    const sequence = ++request.current;
    setSnapshot(undefined);
    setIssues([]);
    setFailure("");
    setStatus(file ? "Validating file…" : "");
    if (!file) return;
    const result = await readNativeFile(file, measureLabel);
    if (request.current !== sequence) return;
    if (!result.ok) { setIssues(result.issues); setStatus(""); return; }
    setSnapshot(result.value);
    setStatus("File validated. Ready to create a separate diagram.");
  }
  async function submit() {
    if (!snapshot || writing.current) return;
    writing.current = true;
    setBusy(true);
    setFailure("");
    setStatus("Creating diagram…");
    try {
      const failure = await save(snapshot);
      if (failure) { setStatus(""); setFailure(failure); }
      else dialog.current?.close();
    } finally { writing.current = false; setBusy(false); }
  }
  return <>
    <button ref={trigger} type="button" className="button" disabled={disabled} onClick={() => { reset(); dialog.current?.showModal(); }}>
      <FileUp size={16} /> Import JSON
    </button>
    <dialog ref={dialog} className="workspace-dialog" aria-labelledby="import-title"
      onCancel={(event) => { if (writing.current) event.preventDefault(); }}
      onClose={() => { reset(); trigger.current?.focus(); }}>
      <form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <h2 id="import-title">Import JSON</h2>
        <p>Import a portable JSON file up to 10 MiB into a separate local diagram.</p>
        <label>JSON file<input ref={picker} type="file" accept=".json,application/json" disabled={busy}
          onChange={(event) => void validate(event.target.files?.[0])} /></label>
        {status && <p role="status">{status}</p>}
        {issues.length > 0 && <ul role="alert" className="file-diagnostics">
          {issues.map(({ code, path, message }, i) => <li key={i}>{path.length ? `${diagnosticPath(path)} · ` : ""}{code} · {message}</li>)}
        </ul>}
        {failure && <p role="alert">{failure}</p>}
        <div className="dialog-actions">
          <button type="button" className="button" disabled={busy} onClick={() => { reset(); dialog.current?.close(); }}>Cancel</button>
          <button type="submit" className="primary" disabled={busy || !snapshot}>Import diagram</button>
        </div>
      </form>
    </dialog>
  </>;
}
