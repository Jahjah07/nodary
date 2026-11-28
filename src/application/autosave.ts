import type { DocumentRepository } from "./document-repository";
import { beginSave, settleSave, type DocumentSession } from "./document-session";
import { fail } from "../core/validation";

export function hasPendingContent(session: DocumentSession) {
  return session.editor.generation !== session.acknowledgedGeneration || !!session.pending;
}

// DGS-08 §5. One coordinator per opened session. The session owns the latest snapshot.
export function createAutosave(
  repository: Pick<DocumentRepository, "save">,
  read: () => DocumentSession | undefined,
  publish: (session: DocumentSession) => void,
  onSaved: () => void = () => {},
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let flight: Promise<void> | undefined;
  let first: number | undefined, last = 0;
  let disposed = false;
  function schedule() {
    clearTimeout(timer);
    const current = read();
    if (disposed || !current || current.failure || flight || first === undefined) return;
    const due = Math.min(last + 750, first + 1000);
    timer = setTimeout(() => { void write(); }, Math.max(0, due - Date.now()));
  }
  function write(): Promise<void> {
    if (flight) return flight;
    const state = read();
    if (disposed || !state || state.failure === "conflict" || !hasPendingContent(state)) return Promise.resolve();
    clearTimeout(timer);
    first = undefined;
    const saving = beginSave(state);
    const capture = saving.pending;
    if (!capture) return Promise.resolve();
    publish(saving);
    flight = Promise.resolve().then(() => repository.save(capture.id, capture.document, capture.revision))
      .catch(() => fail({ code: "STORAGE_UNAVAILABLE", message: "Browser storage is unavailable. Retry or download a backup.", path: [] }))
      .then((result) => {
        const current = read();
        if (disposed || !current || current.token !== capture.token) return;
        publish(settleSave(current, capture, result));
        if (result.ok) onSaved();
      }).finally(() => {
        flight = undefined;
        schedule();
      });
    return flight;
  }
  return {
    edited() {
      last = Date.now();
      first ??= last;
      schedule();
    },
    async flush(retry = false): Promise<boolean> {
      while (!disposed) {
        const current = read();
        if (!current || current.failure === "conflict") return false;
        if (current.failure && !retry) return false;
        if (!hasPendingContent(current)) return true;
        retry = false;
        await write();
      }
      return false;
    },
    dispose() { disposed = true; clearTimeout(timer); },
  };
}
