import Dexie, { type Table } from "dexie";
import { z } from "zod";

const snapshotSchema = z.strictObject({ title: z.string().min(1).max(120), nodes: z.array(z.string()).max(1000) });
export type Snapshot = z.infer<typeof snapshotSchema>;
type Row = { id: string; revision: number; snapshot: Snapshot };
export type SaveFault = "abort" | "quota";
const id = "sp-05-synthetic";

export function repository(databaseName: string) {
  const db = new Dexie(databaseName);
  db.version(1).stores({ diagrams: "id" });
  const diagrams: Table<Row, string> = db.table("diagrams");
  return {
    close: () => db.close(),
    create: () => diagrams.add({ id, revision: 0, snapshot: { title: "Seed", nodes: ["service"] } }),
    read: () => diagrams.get(id),
    remove: () => diagrams.delete(id),
    async save(snapshot: Snapshot, expected: number, fault?: SaveFault) {
      const validated = snapshotSchema.parse(snapshot);
      return db.transaction("rw", diagrams, async () => {
        const current = await diagrams.get(id);
        if (!current) throw Error("Document was deleted");
        if (current.revision !== expected) throw Error("Revision conflict");
        const next = { id, revision: expected + 1, snapshot: validated };
        if (fault === "quota") throw new DOMException("Injected quota error", "QuotaExceededError");
        await diagrams.put(next);
        if (fault === "abort") {
          Dexie.currentTransaction!.abort();
          throw new DOMException("Injected abort after write request", "AbortError");
        }
        return next.revision;
      });
    },
  };
}
