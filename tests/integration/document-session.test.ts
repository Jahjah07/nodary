import { expect, test } from "vitest";
import { beginSave, editSession, openSession, saveStatus, settleSave, viewSession, type DocumentSession } from "../../src/application/document-session";
import { createDispatcher, type CommandHandlers } from "../../src/core/commands";
import { fail, ok, type Result } from "../../src/core/validation";
import { createMemoryDocumentRepository } from "../../src/infrastructure/memory-document-repository";
import example from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";

type Edits = { label: string; noop: undefined };
const handlers: CommandHandlers<Edits> = {
  label: (draft, label) => { draft.nodes[0].label = label; return ok(undefined); },
  noop: () => ok(undefined),
};
const dispatcher = createDispatcher<Edits>(handlers, () => "2026-11-27T12:00:00.000Z");
const id = example.document.id;

function value<T>(result: Result<T>): T {
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}
function fault(result: Result<unknown>, code: string) {
  expect(result).toMatchObject({ ok: false, issues: expect.arrayContaining([expect.objectContaining({ code })]) });
}
function edit(session: DocumentSession, label: string): DocumentSession {
  return editSession(session, (state) => dispatcher.dispatch(state, { type: "label", payload: label })).session;
}

test("DM-19 temporary repository isolates snapshots, rejects stale saves, and never resurrects a deleted record", async () => {
  const repository = createMemoryDocumentRepository();
  expect(value(await repository.list())).toEqual([]);
  const original = structuredClone(example);
  const record = value(await repository.create(original));
  expect(record.revision).toBe(1);
  original.document.nodes[0].label = "Mutation outside repository";
  expect(value(await repository.open(id)).record.content.nodes[0].label).toBe(example.document.nodes[0].label);
  expect(Object.isFrozen(record.content.nodes[0].style.text)).toBe(true);
  fault(await repository.create(original), "RECORD_EXISTS");
  const one = structuredClone(example.document);
  const two = structuredClone(example.document);
  one.nodes[0].label = "First save";
  two.nodes[0].label = "Stale save";
  const [winner, loser] = await Promise.all([repository.save(id, one, 1), repository.save(id, two, 1)]);
  expect(value(winner).revision).toBe(2);
  fault(loser, "REVISION_CONFLICT");
  fault(await repository.remove(id, 1), "REVISION_CONFLICT");
  expect(value(await repository.list())[0]).toMatchObject({ revision: 2, id });
  expect(value(await repository.open(id)).record.content.nodes[0].label).toBe("First save");
  expect((await repository.remove(id, 2)).ok).toBe(true);
  fault(await repository.save(id, one, 2), "REVISION_CONFLICT");
  fault(await repository.open(id), "RECORD_NOT_FOUND");
  fault(await createMemoryDocumentRepository().open(id), "RECORD_NOT_FOUND");
});

test("DM-19/20 rejects unsupported or CR-01-invalid input without altering either input or stored record", async () => {
  const repository = createMemoryDocumentRepository();
  const initial = value(await repository.create(example));
  const invalid = structuredClone(example);
  invalid.document.title = "Invalid\uFFFE label";
  const raw = JSON.stringify(invalid);
  fault(await repository.create(invalid), "INVALID_TEXT");
  fault(await repository.save(id, invalid.document, 1), "INVALID_TEXT");
  expect(JSON.stringify(invalid)).toBe(raw);
  invalid.document.schemaVersion = 2;
  invalid.document.title = "Unknown format";
  const unsupported = JSON.stringify(invalid);
  fault(await repository.create(invalid), "UNSUPPORTED_VERSION");
  expect(JSON.stringify(invalid)).toBe(unsupported);
  expect(value(await repository.open(id)).record).toBe(initial);
  const loaded = value(await repository.open(id));
  fault(openSession("corrupt", repository, { ...loaded, record: { ...loaded.record, title: "Wrong index projection" } }), "INVALID_FIELD");
  const corrupt = { ...loaded.record, content: { ...loaded.record.content, title: "Bad\uFFFF" } };
  fault(openSession("corrupt", repository, { ...loaded, record: corrupt }), "INVALID_TEXT");
  expect(corrupt.content.title).toBe("Bad\uFFFF");
});

test("DM-18 viewport and selection leave graph, history, generation and repository revision independent", async () => {
  const repository = createMemoryDocumentRepository();
  const saved = value(await repository.create(example));
  const loaded = value(await repository.open(id));
  const session = value(openSession("tab-1", repository, loaded));
  const viewed = value(viewSession(session, { x: 10.5, y: -40, zoom: 0.75 }, [example.document.nodes[0].id]));
  expect(viewed.editor.document).toBe(session.editor.document);
  expect(viewed.editor.history).toBe(session.editor.history);
  expect(viewed.editor.generation).toBe(0);
  expect(viewed.editor.view.selection).toEqual([example.document.nodes[0].id]);
  expect((await repository.saveViewport(id, viewed.editor.view.viewport)).ok).toBe(true);
  expect(value(await repository.open(id))).toEqual({ record: saved, viewport: viewed.editor.view.viewport });
  expect(saveStatus(viewed)).toBe("temporary");
});

test("DM-19 temporary acknowledgement never claims durability or acknowledges edits after capture", async () => {
  const repository = createMemoryDocumentRepository();
  value(await repository.create(example));
  const initial = value(openSession("tab-1", repository, value(await repository.open(id))));
  expect(editSession(initial, (state) => dispatcher.dispatch(state, { type: "noop", payload: undefined })).session).toBe(initial);
  const edited = edit(initial, "Captured");
  expect(saveStatus(edited)).toBe("unsaved");
  const pending = beginSave(edited);
  expect(saveStatus(pending)).toBe("saving");
  const captured = pending.pending!;
  const later = edit(pending, "Newer");
  const saved = await repository.save(captured.id, captured.document, captured.revision);
  const settled = settleSave(later, captured, saved);
  expect(settled.revision).toBe(2);
  expect(settled.editor.document.nodes[0].label).toBe("Newer");
  expect(saveStatus(settled)).toBe("unsaved");
  const reopened = value(openSession("tab-2", repository, value(await repository.open(id))));
  expect(settleSave(reopened, captured, saved)).toBe(reopened);
  expect(reopened.editor.history.past).toEqual([]);
  const next = beginSave(settled);
  const final = settleSave(next, next.pending!, await repository.save(id, next.pending!.document, next.revision));
  expect(saveStatus(final)).toBe("temporary");
  expect(final.acknowledgedGeneration).toBe(final.editor.generation);
});

test("DM-19 real revision mismatch pauses the temporary session and retains its committed edits", async () => {
  const repository = createMemoryDocumentRepository();
  value(await repository.create(example));
  const open = value(await repository.open(id));
  const a = beginSave(edit(value(openSession("a", repository, open)), "A"));
  const b = beginSave(edit(value(openSession("b", repository, open)), "B"));
  const first = await repository.save(id, a.pending!.document, a.revision);
  expect(first.ok).toBe(true);
  const second = await repository.save(id, b.pending!.document, b.revision);
  const failed = settleSave(b, b.pending!, second);
  expect(saveStatus(failed)).toBe("conflict");
  expect(failed.editor.document.nodes[0].label).toBe("B");
  expect(beginSave(failed)).toBe(failed);
});

test("DM-19 failed writes retain current edits and explicit retry captures the latest generation", async () => {
  const repository = createMemoryDocumentRepository();
  value(await repository.create(example));
  const initial = value(openSession("tab-1", repository, value(await repository.open(id))));
  const pending = beginSave(edit(initial, "Pending"));
  const failed = settleSave(pending, pending.pending!, fail({ code: "COMMAND_FAILED", path: [], message: "Injected write failure." }));
  expect(saveStatus(failed)).toBe("failed");
  expect(failed.revision).toBe(1);
  expect(failed.editor.document.nodes[0].label).toBe("Pending");
  expect(value(await repository.open(id)).record.content.nodes[0].label).toBe(example.document.nodes[0].label);
  const retried = beginSave(edit(failed, "Latest"));
  expect(retried.pending?.document.nodes[0].label).toBe("Latest");
  const settled = settleSave(retried, retried.pending!, await repository.save(id, retried.pending!.document, retried.revision));
  expect(saveStatus(settled)).toBe("temporary");
});
