import type { DiagramDocument, Viewport } from "../core/contracts";
import type { Immutable } from "../core/immutable";
import type { Issue, Result } from "../core/validation";

export type DocumentSummary = Immutable<Pick<DiagramDocument, "id" | "title" | "category" | "schemaVersion" | "createdAt" | "updatedAt"> & {
  revision: number;
}>;
export type StoredDocument = DocumentSummary & { readonly content: Immutable<DiagramDocument> };
export type OpenDocument = { readonly record: StoredDocument; readonly viewport: Viewport | null; readonly warning?: Issue };
export type Panels = { components: boolean; properties: boolean };

// DGS-05 §12 / DGS-08 §3. Repository revisions never enter portable graph data or history.
export interface DocumentRepository {
  readonly durability: "temporary" | "durable";
  list(onCorrupt?: (count: number) => void): Promise<Result<readonly DocumentSummary[]>>;
  open(id: string): Promise<Result<OpenDocument>>;
  create(portable: unknown): Promise<Result<StoredDocument>>;
  save(id: string, document: unknown, expectedRevision: number): Promise<Result<StoredDocument>>;
  remove(id: string, expectedRevision: number): Promise<Result<void>>;
  saveViewport(id: string, viewport: Viewport | null): Promise<Result<void>>;
  getPanels?(): Promise<Result<Panels | undefined>>;
  savePanels?(value: Panels): Promise<Result<void>>;
  onVersionChange?(callback: (issue: Issue) => void): () => void;
}

export function summaryOf(document: Immutable<DiagramDocument>, revision: number): DocumentSummary {
  const { id, title, category, schemaVersion, createdAt, updatedAt } = document;
  return { id, title, category, schemaVersion, createdAt, updatedAt, revision };
}
