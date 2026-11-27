import { useEffect, useState } from "react";
import { repository, type SaveFault, type Snapshot } from "./repository";

const initial: Snapshot = { title: "Seed", nodes: ["service"] };
const database = new URLSearchParams(location.search).get("db") ?? "nodary-sp05-demo";

export default function Persistence() {
  const [storage] = useState(() => repository(database));
  const [current, setCurrent] = useState(initial);
  const [base, setBase] = useState(0);
  const [committed, setCommitted] = useState(initial);
  const [lastRead, setLastRead] = useState("");
  const [notice, setNotice] = useState("Opening");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void storage.read().then((row) => {
      if (row) {
        setCurrent(row.snapshot);
        setCommitted(row.snapshot);
        setBase(row.revision);
      }
      setNotice(row ? "Loaded" : "No stored document");
    }).catch((error) => setNotice(String(error)));
    return () => storage.close();
  }, [storage]);
  async function save(fault?: SaveFault, editDuringSave = false) {
    const submitted = current;
    setSaving(true);
    setNotice("Saving");
    try {
      const pending = storage.save(submitted, base, fault);
      if (editDuringSave) setCurrent({ ...current, title: current.title + " + newer edit" });
      setBase(await pending);
      setCommitted(submitted);
      setNotice("Transaction committed");
    } catch (error) {
      setNotice(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
    } finally {
      setSaving(false);
    }
  }
  return <main>
    <h1>SP-05 IndexedDB persistence</h1>
    <button onClick={() => void storage.create().then(() => setNotice("Created"), (error) => setNotice(String(error)))}>Seed document</button>
    <label>Title <input value={current.title} onChange={(event) => setCurrent({ ...current, title: event.target.value })} /></label>
    <button disabled={saving} onClick={() => void save()}>Save</button>
    <button disabled={saving} onClick={() => void save("abort")}>Abort after write request</button>
    <button disabled={saving} onClick={() => void save("quota")}>Inject quota failure</button>
    <button disabled={saving} onClick={() => void save(undefined, true)}>Edit during save</button>
    <button onClick={() => void storage.read().then((row) => setLastRead(JSON.stringify(row ?? null)))}>Read storage</button>
    <button onClick={() => void storage.remove().then(() => setNotice("Deleted"))}>Delete stored record</button>
    <p role="status">{notice}</p>
    <p data-testid="revision">{base}</p>
    <p data-testid="dirty">{JSON.stringify(current) === JSON.stringify(committed) ? "clean" : "dirty"}</p>
    <pre data-testid="storage">{lastRead}</pre>
    <pre data-testid="backup">{JSON.stringify(current)}</pre>
  </main>;
}
