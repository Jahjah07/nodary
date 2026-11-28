import { afterEach, expect, test, vi } from "vitest";
import { createAutosave } from "../../src/application/autosave";
import { summaryOf, type DocumentRepository, type StoredDocument } from "../../src/application/document-repository";
import { editSession, openSession, saveStatus } from "../../src/application/document-session";
import { componentDispatcher } from "../../src/core/component-edits";
import type { DiagramDocument } from "../../src/core/contracts";
import { fail, ok, type Result } from "../../src/core/validation";
import { blankDiagram } from "../../src/workspace/sample";

const dispatcher = componentDispatcher();
const id = "dd9e6ad3-7d54-4d0c-8901-b91d283f8d40";
const failure = fail<StoredDocument>({ code: "STORAGE_QUOTA", message: "Injected quota failure.", path: [] });
afterEach(() => vi.useRealTimers());

function exercise() {
  vi.useFakeTimers();
  const { document } = blankDiagram(id, "Seed", "general", new Date(0).toISOString());
  const initial = openSession("fixture", { durability: "durable" }, {
    record: { ...summaryOf(document, 1), content: document }, viewport: null,
  });
  if (!initial.ok) throw Error("Invalid fixture");
  let current = initial.value;
  const save = vi.fn<DocumentRepository["save"]>();
  const captures: { document: DiagramDocument; revision: number; settle(result: Result<StoredDocument>): void }[] = [];
  save.mockImplementation((_, input, revision) => new Promise((settle) => {
    captures.push({ document: input as DiagramDocument, revision, settle });
  }));
  const coordinator = createAutosave({ save }, () => current, (session) => { current = session; });
  return {
    coordinator, save, captures, state: () => current,
    edit(title: string) {
      current = editSession(current, (state) => dispatcher.dispatch(state, { type: "rename", payload: title })).session;
      coordinator.edited();
    },
    settle(index: number, result?: Result<StoredDocument>) {
      const { document, revision, settle } = captures[index];
      settle(result ?? ok({ ...summaryOf(document, revision + 1), content: document }));
    },
  };
}

test("PE-07/08/09 coalesces changes, bounds scheduling wait and acknowledges each actual generation", async () => {
  const flow = exercise();
  flow.edit("One");
  await vi.advanceTimersByTimeAsync(450);
  flow.edit("Two");
  await vi.advanceTimersByTimeAsync(450);
  flow.edit("Three");
  await vi.advanceTimersByTimeAsync(99);
  expect(flow.save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(flow.captures.map(({ document }) => document.title)).toEqual(["Three"]);
  expect(saveStatus(flow.state())).toBe("saving");
  flow.edit("Four");
  await vi.advanceTimersByTimeAsync(1000);
  expect(flow.save).toHaveBeenCalledTimes(1);
  flow.settle(0);
  await vi.advanceTimersByTimeAsync(0);
  expect(flow.state().revision).toBe(2);
  expect(flow.state().acknowledgedGeneration).toBe(3);
  expect(saveStatus(flow.state())).not.toBe("saved");
  await vi.advanceTimersByTimeAsync(1);
  expect(flow.captures.map(({ document, revision }) => [document.title, revision])).toEqual([["Three", 1], ["Four", 2]]);
  flow.settle(1);
  await vi.advanceTimersByTimeAsync(0);
  expect(flow.state().revision).toBe(3);
  expect(saveStatus(flow.state())).toBe("saved");
});

test("PE-12/18 failure pauses writes, retry takes latest content, and a disposed session ignores late completion", async () => {
  const flow = exercise();
  flow.edit("Before failure");
  await vi.advanceTimersByTimeAsync(749);
  expect(flow.save).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  flow.settle(0, failure);
  await vi.advanceTimersByTimeAsync(0);
  expect(saveStatus(flow.state())).toBe("failed");
  flow.edit("Latest unsaved");
  await vi.advanceTimersByTimeAsync(4000);
  expect(await flow.coordinator.flush()).toBe(false);
  expect(flow.save).toHaveBeenCalledTimes(1);
  const retry = flow.coordinator.flush(true);
  await vi.advanceTimersByTimeAsync(0);
  expect(flow.captures[1].document.title).toBe("Latest unsaved");
  flow.settle(1);
  expect(await retry).toBe(true);
  flow.edit("Old session");
  const navigating = flow.coordinator.flush();
  await vi.advanceTimersByTimeAsync(0);
  const during = flow.state();
  flow.coordinator.dispose();
  flow.settle(2);
  expect(await navigating).toBe(false);
  expect(flow.state()).toBe(during);
});
