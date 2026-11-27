import { summaryOf, type DocumentRepository, type StoredDocument } from "../application/document-repository";
import { viewportSchema, type Viewport } from "../core/contracts";
import { parsePortable } from "../core/graph";
import { freeze } from "../core/immutable";
import { fail, inspectJson, ok, type IssueCode } from "../core/validation";

const storageError = (code: IssueCode, message: string) => fail({ code, message, path: [] });

// T-02-05 test adapter. Map writes have process-local lifetime.
export function createMemoryDocumentRepository(): DocumentRepository {
  const documents = new Map<string, StoredDocument>();
  const views = new Map<string, Viewport>();
  return {
    durability: "temporary",
    async list() {
      return ok(freeze([...documents.values()].map(({ content, revision }) => summaryOf(content, revision)).sort((a, b) =>
        a.updatedAt === b.updatedAt ? a.id.localeCompare(b.id) : a.updatedAt < b.updatedAt ? 1 : -1)));
    },
    async open(id) {
      const record = documents.get(id);
      return record ? ok({ record, viewport: structuredClone(views.get(id) ?? null) }) :
        storageError("RECORD_NOT_FOUND", "Document does not exist.");
    },
    async create(input) {
      const parsed = parsePortable(input);
      if (!parsed.ok) return parsed;
      const { document, viewport } = parsed.value;
      if (documents.has(document.id)) return storageError("RECORD_EXISTS", "Document ID already exists.");
      const record = freeze({ ...summaryOf(document, 1), content: document });
      documents.set(document.id, record);
      if (viewport) views.set(document.id, viewport);
      return ok(record);
    },
    async save(id, input, expectedRevision) {
      const old = documents.get(id);
      if (!old || old.revision !== expectedRevision) return storageError("REVISION_CONFLICT", "Document revision changed or was deleted.");
      const parsed = parsePortable({ document: input, viewport: views.get(id) ?? null });
      if (!parsed.ok) return parsed;
      const document = parsed.value.document;
      if (document.id !== id || document.createdAt !== old.createdAt || document.updatedAt < old.updatedAt) {
        return storageError("INVALID_FIELD", "Content identity or lifecycle does not match the stored record.");
      }
      const revision = old.revision + 1;
      if (!Number.isSafeInteger(revision)) return storageError("LIMIT_EXCEEDED", "Document revision is exhausted.");
      const record = freeze({ ...summaryOf(document, revision), content: document });
      documents.set(id, record);
      return ok(record);
    },
    async remove(id, expectedRevision) {
      const old = documents.get(id);
      if (!old || old.revision !== expectedRevision) return storageError("REVISION_CONFLICT", "Document revision changed or was deleted.");
      documents.delete(id);
      views.delete(id);
      return ok(undefined);
    },
    async saveViewport(id, viewport) {
      if (!documents.has(id)) return storageError("RECORD_NOT_FOUND", "Document does not exist.");
      const issue = inspectJson(viewport, ["viewport"]);
      if (issue) return fail(issue);
      const parsed = viewportSchema.nullable().safeParse(viewport);
      if (!parsed.success) return fail({ code: "INVALID_FIELD", path: ["viewport"], message: "Invalid viewport." });
      if (parsed.data) views.set(id, parsed.data);
      else views.delete(id);
      return ok(undefined);
    },
  };
}
