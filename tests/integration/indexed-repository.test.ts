import Dexie from "dexie";
import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { expect, test } from "vitest";
import { copyDiagram } from "../../src/application/document-lifecycle";
import { parsePortable } from "../../src/core/graph";
import type { Result } from "../../src/core/validation";
import { createIndexedDocumentRepository } from "../../src/infrastructure/indexed-document-repository";
import { backupData, backupFilename } from "../../src/workspace/backup";
import { blankDiagram } from "../../src/workspace/sample";
import architecture from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";

const id = (n: number) => `dd9e6ad3-7d54-4d0c-8901-b91d283f${n.toString(16).padStart(4, "0")}`;
const timestamp = "2026-11-28T00:00:00.000Z";
const view = { x: -20, y: 200, zoom: .75 };
function value<T>(result: Result<T>) {
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  return result.value;
}
const fault = (code: string) => ({ ok: false, issues: [expect.objectContaining({ code })] });
function fixture() {
  const dependencies = { indexedDB: new IDBFactory(), IDBKeyRange };
  const repository = createIndexedDocumentRepository("test-documents", dependencies);
  const raw = new Dexie("test-documents", dependencies);
  raw.version(1).stores({ documents: "id, updatedAt, category", viewports: "documentId", preferences: "key" });
  return { repository, raw, dependencies };
}

test("PE-06 rolls back the new row if its second write fails and leaves earlier records intact", async () => {
  const { repository, raw } = fixture();
  const original = value(await repository.create(blankDiagram(id(0), "Original", "architecture", timestamp)));
  await raw.table("viewports").add({ documentId: id(1), viewport: view });
  const next = { ...blankDiagram(id(1), "Second", "flowchart", timestamp), viewport: view };
  expect(await repository.create(next)).toMatchObject(fault("RECORD_EXISTS"));
  expect(await raw.table("documents").get(id(1))).toBeUndefined();
  expect(await raw.table("viewports").get(id(1))).toEqual({ documentId: id(1), viewport: view });
  expect(value(await repository.open(id(0))).record).toEqual(original);
  raw.close();
  repository.close();
});

test("PE-14/15/20 checks both revisions and existence, leaving no resurrected rows or orphan views", async () => {
  const { repository, raw, dependencies } = fixture();
  const peer = createIndexedDocumentRepository("test-documents", dependencies);
  const initial = value(await repository.create({ ...blankDiagram(id(0), "Initial", "architecture", timestamp), viewport: view }));
  expect(initial.revision).toBe(1);
  const winner = value(await repository.save(id(0), { ...initial.content, title: "Saved title" }, 1));
  expect(await peer.remove(id(0), 1)).toMatchObject(fault("REVISION_CONFLICT"));
  expect(await peer.save(id(0), initial.content, 1)).toMatchObject(fault("REVISION_CONFLICT"));
  value(await peer.saveViewport(id(0), { x: -15, y: 40, zoom: 1.25 }));
  expect(value(await repository.open(id(0))).record).toEqual(winner);
  value(await repository.remove(id(0), 2));
  expect(await peer.save(id(0), winner.content, 2)).toMatchObject(fault("REVISION_CONFLICT"));
  expect(await peer.saveViewport(id(0), view)).toMatchObject(fault("RECORD_NOT_FOUND"));
  expect(await raw.table("documents").count()).toBe(0);
  expect(await raw.table("viewports").count()).toBe(0);
  raw.close(); repository.close(); peer.close();
});

test("PE-21 distinguishes corrupt rows, invalid views and invalid allowlisted preferences", async () => {
  const { repository, raw } = fixture();
  const good = value(await repository.create(blankDiagram(id(0), "Good", "architecture", timestamp)));
  const bad = { ...good, id: id(1), revision: -1 };
  await raw.table("documents").put(bad);
  await raw.table("viewports").put({ documentId: id(0), viewport: { ...view, zoom: 85 } });
  await raw.table("preferences").put({ key: "panels", value: { components: 7, properties: true } });
  const seen: number[] = [];
  expect(value(await repository.list((count) => seen.push(count))).map(({ id }) => id)).toEqual([good.id]);
  expect(seen).toEqual([1]);
  expect(value(await repository.open(good.id))).toMatchObject({ record: good, viewport: null, warning: { code: "INVALID_VIEWPORT" } });
  expect(await repository.open(bad.id)).toMatchObject(fault("CORRUPT_RECORD"));
  expect(await repository.getPanels!()).toMatchObject(fault("INVALID_PREFERENCE"));
  expect(await raw.table("documents").get(bad.id)).toEqual(bad);
  value(await repository.savePanels!({ components: false, properties: true }));
  expect(value(await repository.getPanels!())).toEqual({ components: false, properties: true });
  raw.close();
  repository.close();
});

test("PE-04/27 validates a complete remap and writes only the portable backup envelope", () => {
  const source = value(parsePortable(architecture));
  let counter = 0;
  const copy = value(copyDiagram(source.document, view, timestamp, () => id(++counter)));
  expect(copy.viewport).toEqual(view);
  const originals = [source.document.id, ...source.document.nodes.map(({ id }) => id), ...source.document.groups.map(({ id }) => id),
    ...source.document.edges.map(({ id }) => id)];
  const copied = [copy.document.id, ...copy.document.nodes.map(({ id }) => id), ...copy.document.groups.map(({ id }) => id),
    ...copy.document.edges.map(({ id }) => id)];
  const remap = new Map(originals.map((id, index) => [id, copied[index]]));
  for (const key of copied) expect(originals).not.toContain(key);
  for (const [index, item] of [...source.document.nodes, ...source.document.groups].entries()) {
    expect([...copy.document.nodes, ...copy.document.groups][index]).toEqual({
      ...item, id: remap.get(item.id), parentId: item.parentId ? remap.get(item.parentId) : null,
    });
  }
  for (const [index, edge] of source.document.edges.entries()) {
    expect(copy.document.edges[index]).toEqual({ ...edge, id: remap.get(edge.id),
      source: { ...edge.source, nodeId: remap.get(edge.source.nodeId) }, target: { ...edge.target, nodeId: remap.get(edge.target.nodeId) } });
  }
  const backup = backupData(source.document, { ...view, zoom: 37 });
  if ("error" in backup) throw Error(backup.error);
  expect(backup.omit).toBe(true);
  expect(JSON.parse(new TextDecoder().decode(backup.bytes))).toEqual({ document: source.document, viewport: null });
  expect(backupFilename("CON.json")).toBe("_CON.json");
  expect(backupFilename("..")).toBe("Untitled diagram.json");
  expect(backupFilename("💡".repeat(100))).toBe(`${"💡".repeat(50)}.json`);
});
