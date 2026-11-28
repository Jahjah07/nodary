import Dexie, { type DexieOptions } from "dexie";
import { z } from "zod";
import { summaryOf, type DocumentRepository, type OpenDocument, type StoredDocument } from "../application/document-repository";
import { idSchema, viewportSchema } from "../core/contracts";
import { parsePortable } from "../core/graph";
import { freeze } from "../core/immutable";
import { fail, inspectJson, ok, type Issue, type IssueCode, type Result } from "../core/validation";

export const databaseName = "diagramming-system";
export const storageVersion = 1;
const issue = (code: IssueCode, message: string): Issue => ({ code, message, path: [] });
const missing = issue("RECORD_NOT_FOUND", "Diagram not found.");
const conflict = issue("REVISION_CONFLICT", "The stored diagram changed or was deleted in another tab.");
const corrupt = issue("CORRUPT_RECORD", "A stored diagram is corrupt. Its original record was preserved.");
const obsolete = issue("STORAGE_VERSION", "This tab cannot use the current storage version. Reopen Nodary before saving.");
const blocked = issue("STORAGE_BLOCKED", "Storage is blocked by another tab. Close other Nodary tabs and retry.");
const unavailable = issue("STORAGE_UNAVAILABLE", "Browser storage is unavailable. Check browser permissions and try again.");
const corruptView = issue("INVALID_VIEWPORT", "The saved viewport is invalid. The diagram was fitted to the canvas.");
const corruptPanels = issue("INVALID_PREFERENCE", "The saved panel preferences are invalid. Default panels are in use.");
const rowSchema = z.strictObject({
  id: idSchema, title: z.string(), category: z.string(), schemaVersion: z.number(),
  createdAt: z.string(), updatedAt: z.string(), revision: z.number().int().positive(), content: z.unknown(),
});
const viewSchema = z.strictObject({ documentId: idSchema, viewport: viewportSchema });
const panelsSchema = z.strictObject({ components: z.boolean(), properties: z.boolean() });
const preferenceSchema = z.strictObject({ key: z.literal("panels"), value: panelsSchema });

function decode(row: unknown, key?: string): Result<StoredDocument> {
  const parsed = rowSchema.safeParse(row);
  if (!parsed.success || !Number.isSafeInteger(parsed.data.revision)) return fail(corrupt);
  if (parsed.data.schemaVersion !== 1) return fail(issue("UNSUPPORTED_VERSION", "This diagram uses an unsupported portable schema. Its original record was preserved."));
  const validated = parsePortable({ document: parsed.data.content, viewport: null });
  if (!validated.ok) return fail(validated.issues.some((item) => item.code === "UNSUPPORTED_VERSION")
    ? issue("UNSUPPORTED_VERSION", "This diagram uses an unsupported portable schema. Its original record was preserved.") : corrupt);
  const document = validated.value.document;
  const summary = summaryOf(document, parsed.data.revision);
  if ((key !== undefined && key !== summary.id) ||
      (Object.keys(summary) as (keyof typeof summary)[]).some((field) => summary[field] !== parsed.data[field])) return fail(corrupt);
  return ok(freeze({ ...summary, content: document }));
}

function storageIssue(error: unknown): Issue {
  const name = error instanceof Error || error instanceof DOMException ? error.name :
    typeof error === "object" && error !== null && "name" in error ? error.name : "";
  switch (name) {
    case "QuotaExceededError": return issue("STORAGE_QUOTA", "Browser storage quota was exceeded. Download a backup before freeing storage or retrying.");
    case "AbortError": return issue("STORAGE_ABORT", "The storage transaction was aborted. Retry to save the current diagram.");
    case "VersionError": case "UpgradeError": return obsolete;
    case "ConstraintError": return issue("RECORD_EXISTS", "A diagram with this identifier already exists.");
    default: return unavailable;
  }
}

// DGS-08 §3–6. Dexie is constructed on the first browser operation.
export function createIndexedDocumentRepository(
  name = databaseName, dependencies?: Pick<DexieOptions, "indexedDB" | "IDBKeyRange">,
): DocumentRepository & { close(): void } {
  let database: Dexie | undefined;
  let invalidated: Issue | undefined;
  let opening: Promise<Dexie> | undefined;
  let rejectBlocked: ((reason: Issue) => void) | undefined;
  const listeners = new Set<(failure: Issue) => void>();
  function connect() {
    if (database?.isOpen()) return Promise.resolve(database);
    if (opening) return opening;
    const factory = dependencies?.indexedDB ?? globalThis.indexedDB;
    const db = database ?? new Dexie(name, {
      // Dexie can retry a VersionError without a version or patch a schema at a higher native version.
      indexedDB: factory ? { open(database: string, version?: number) {
        if (version !== storageVersion * 10) throw new DOMException("Unsupported storage version", "VersionError");
        return factory.open(database, version);
      } } : undefined,
      IDBKeyRange: dependencies?.IDBKeyRange ?? globalThis.IDBKeyRange,
      autoOpen: false, cache: "disabled", chromeTransactionDurability: "strict",
    });
    if (!database) {
      db.version(storageVersion).stores({ documents: "id, updatedAt, category", viewports: "documentId", preferences: "key" });
      db.on("blocked", () => { rejectBlocked?.(blocked); db.close(); });
      db.on("versionchange", () => {
        invalidated = obsolete;
        db.close();
        listeners.forEach((listener) => listener(obsolete));
      });
      database = db;
    }
    const blocking = new Promise<never>((_, reject) => { rejectBlocked = reject; });
    opening = Promise.race([db.open(), blocking]).finally(() => { opening = undefined; rejectBlocked = undefined; });
    return opening;
  }
  async function run<T>(operation: (db: Dexie) => Promise<Result<T>>): Promise<Result<T>> {
    try {
      if (invalidated) return fail(invalidated);
      return await operation(await connect());
    } catch (error) {
      return fail(error === blocked ? blocked : storageIssue(error));
    }
  }
  const checked = (row: unknown, id: string, expected: number): Result<StoredDocument> => {
    if (row === undefined) return fail(conflict);
    const previous = decode(row, id);
    return previous.ok && previous.value.revision !== expected ? fail(conflict) : previous;
  };

  return {
    durability: "durable",
    close: () => database?.close(),
    onVersionChange(callback) { listeners.add(callback); return () => { listeners.delete(callback); }; },
    list(onCorrupt) {
      return run(async (db) => {
        const rows = await db.table<unknown, string>("documents").toArray();
        const valid = rows.map((row) => decode(row)).flatMap((entry) => entry.ok
          ? [summaryOf(entry.value.content, entry.value.revision)] : []);
        onCorrupt?.(rows.length - valid.length);
        return ok(valid.sort((a, b) => a.updatedAt === b.updatedAt ? a.id.localeCompare(b.id) : a.updatedAt < b.updatedAt ? 1 : -1));
      });
    },
    open(id) {
      return run<OpenDocument>(async (db) => {
        const documents = db.table<unknown, string>("documents"), views = db.table<unknown, string>("viewports");
        const [raw, savedView] = await db.transaction("r", documents, views, () => Promise.all([documents.get(id), views.get(id)]));
        if (raw === undefined) return fail(missing);
        const record = decode(raw, id);
        if (!record.ok) return record;
        const view = viewSchema.safeParse(savedView);
        return ok({ record: record.value, viewport: view.success && view.data.documentId === id ? view.data.viewport : null,
          ...(savedView !== undefined && (!view.success || view.data.documentId !== id) ? { warning: corruptView } : {}) });
      });
    },
    async create(input) {
      const parsed = parsePortable(input);
      if (!parsed.ok) return parsed;
      const { document, viewport } = parsed.value;
      const row = freeze({ ...summaryOf(document, 1), content: document });
      return run(async (db) => {
        const documents = db.table<StoredDocument, string>("documents"), views = db.table("viewports");
        await db.transaction("rw", documents, views, async () => {
          await documents.add(row);
          if (viewport) await views.add({ documentId: row.id, viewport });
        });
        return ok(row);
      });
    },
    async save(id, input, expectedRevision) {
      const parsed = parsePortable({ document: input, viewport: null });
      if (!parsed.ok) return parsed;
      const document = parsed.value.document;
      if (id !== document.id) return fail(issue("INVALID_FIELD", "The diagram identifier does not match the save target."));
      return run((db) => {
        const documents = db.table<StoredDocument, string>("documents");
        return db.transaction("rw", documents, async () => {
          const previous = checked(await documents.get(id), id, expectedRevision);
          if (!previous.ok) return previous;
          if (document.createdAt !== previous.value.createdAt || document.updatedAt < previous.value.updatedAt) {
            return fail(issue("INVALID_FIELD", "The diagram lifecycle fields do not match the stored record."));
          }
          const revision = previous.value.revision + 1;
          if (!Number.isSafeInteger(revision)) return fail(issue("LIMIT_EXCEEDED", "The storage revision is exhausted."));
          const row = freeze({ ...summaryOf(document, revision), content: document });
          await documents.put(row);
          return ok(row);
        });
      });
    },
    remove(id, expectedRevision) {
      return run((db) => {
        const documents = db.table<StoredDocument, string>("documents"), views = db.table("viewports");
        return db.transaction("rw", documents, views, async () => {
          const previous = checked(await documents.get(id), id, expectedRevision);
          if (!previous.ok) return previous;
          await documents.delete(id);
          await views.delete(id);
          return ok(undefined);
        });
      });
    },
    async saveViewport(id, viewport) {
      const valid = viewportSchema.nullable().safeParse(viewport);
      if (inspectJson(viewport) || !valid.success) return fail(corruptView);
      return run((db) => {
        const documents = db.table<StoredDocument, string>("documents"), views = db.table("viewports");
        return db.transaction("rw", documents, views, async () => {
          if (await documents.get(id) === undefined) return fail(missing);
          if (valid.data) await views.put({ documentId: id, viewport: valid.data });
          else await views.delete(id);
          return ok(undefined);
        });
      });
    },
    getPanels() {
      return run(async (db) => {
        const raw: unknown = await db.table("preferences").get("panels");
        if (raw === undefined) return ok(undefined);
        const parsed = preferenceSchema.safeParse(raw);
        return parsed.success ? ok(parsed.data.value) : fail(corruptPanels);
      });
    },
    savePanels(value) {
      return run(async (db) => {
        const parsed = preferenceSchema.safeParse({ key: "panels", value });
        if (!parsed.success) return fail(corruptPanels);
        await db.table("preferences").put(parsed.data);
        return ok(undefined);
      });
    },
  };
}
