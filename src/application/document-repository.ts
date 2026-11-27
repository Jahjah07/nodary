import type { DiagramDocument, Viewport } from "../core/contracts";
import type { Immutable } from "../core/immutable";
import type { Result } from "../core/validation";

export type DocumentSummary = Immutable<Pick<DiagramDocument, "id" | "title" | "category" | "schemaVersion" | "createdAt" | "updatedAt"> & {
  revision: number;
}>;
export type StoredDocument = DocumentSummary & { readonly content: Immutable<DiagramDocument> };
export type OpenDocument = { readonly record: StoredDocument; readonly viewport: Viewport | null };

// DGS-05 §12 / DGS-08 §3. Repository revisions never enter portable graph data or history.
export interface DocumentRepository {
  readonly durability: "temporary" | "durable";
  list(): Promise<Result<readonly DocumentSummary[]>>;
  open(id: string): Promise<Result<OpenDocument>>;
  create(portable: unknown): Promise<Result<StoredDocument>>;
  save(id: string, document: unknown, expectedRevision: number): Promise<Result<StoredDocument>>;
  remove(id: string, expectedRevision: number): Promise<Result<void>>;
  saveViewport(id: string, viewport: Viewport | null): Promise<Result<void>>;
}

export function summaryOf(document: Immutable<DiagramDocument>, revision: number): DocumentSummary {
  const { id, title, category, schemaVersion, createdAt, updatedAt } = document;
  return { id, title, category, schemaVersion, createdAt, updatedAt, revision };
}
