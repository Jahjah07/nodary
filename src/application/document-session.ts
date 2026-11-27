import { openCommandState, setSelection, setViewport, type CommandState, type Outcome } from "../core/commands";
import type { DiagramDocument, Viewport } from "../core/contracts";
import { freeze, type Immutable } from "../core/immutable";
import { fail, ok, type Result } from "../core/validation";
import { summaryOf, type DocumentRepository, type OpenDocument, type StoredDocument } from "./document-repository";

export type SaveStatus = "temporary" | "unsaved" | "saving" | "saved" | "failed" | "conflict";
type Capture = Immutable<{ token: string; id: string; revision: number; generation: number; document: DiagramDocument }>;
export type DocumentSession = Readonly<{
  token: string;
  editor: CommandState;
  durability: DocumentRepository["durability"];
  revision: number;
  acknowledgedGeneration: number;
  pending: Capture | null;
  failure: "failed" | "conflict" | null;
}>;

export function openSession(token: string, repository: Pick<DocumentRepository, "durability">, opened: OpenDocument): Result<DocumentSession> {
  const { record, viewport } = opened;
  const editor = openCommandState({ document: record.content, viewport });
  if (!editor.ok) return editor;
  const projection = summaryOf(editor.value.document, record.revision);
  if (!token || !Number.isSafeInteger(record.revision) || record.revision < 1 ||
    Object.entries(projection).some(([key, value]) => record[key as keyof typeof projection] !== value)) {
    return fail({ code: "INVALID_FIELD", path: [], message: "Repository metadata does not match canonical content." });
  }
  return ok(freeze({
    token, durability: repository.durability, editor: editor.value, revision: record.revision,
    acknowledgedGeneration: 0, pending: null, failure: null,
  }));
}

export function editSession(session: DocumentSession, apply: (state: CommandState) => Outcome) {
  const outcome = apply(session.editor);
  return { outcome, session: outcome.status === "committed" ? freeze({ ...session, editor: outcome.state }) : session };
}

export function viewSession(session: DocumentSession, viewport: Viewport | null, selection: readonly string[]): Result<DocumentSession> {
  const view = setViewport(session.editor, viewport);
  return view.ok ? ok(freeze({ ...session, editor: setSelection(view.value, selection) })) : view;
}

export function saveStatus(session: DocumentSession): SaveStatus {
  if (session.failure) return session.failure;
  if (session.pending) return "saving";
  if (session.editor.generation !== session.acknowledgedGeneration) return "unsaved";
  return session.durability === "durable" ? "saved" : "temporary";
}

// DGS-08 write coordination values. Scheduling and real IndexedDB are later phases.
export function beginSave(session: DocumentSession): DocumentSession {
  if (session.pending || session.failure === "conflict" || session.editor.generation === session.acknowledgedGeneration) return session;
  return freeze({
    ...session, failure: null, pending: {
      token: session.token, id: session.editor.document.id, revision: session.revision,
      generation: session.editor.generation, document: session.editor.document,
    },
  });
}

export function settleSave(session: DocumentSession, captured: Capture, result: Result<StoredDocument>): DocumentSession {
  if (session.pending !== captured || session.token !== captured.token || session.editor.document.id !== captured.id) return session;
  if (!result.ok) return freeze({
    ...session, pending: null, failure: result.issues.some((issue) => issue.code === "REVISION_CONFLICT") ? "conflict" : "failed",
  });
  if (result.value.id !== captured.id || result.value.revision !== captured.revision + 1 ||
    JSON.stringify(result.value.content) !== JSON.stringify(captured.document)) {
    return freeze({ ...session, pending: null, failure: "conflict" });
  }
  return freeze({ ...session, pending: null, failure: null, revision: result.value.revision, acknowledgedGeneration: captured.generation });
}
