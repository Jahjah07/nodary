import { useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";

type Graph = { width: number; edge: string | null; service: boolean };
const initial: Graph = { width: 120, edge: null, service: true };

export default function KeyboardPrototype() {
  const [graph, setGraph] = useState(initial);
  const [selected, setSelected] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"connect" | "resize">("connect");
  const [past, setPast] = useState<Graph[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement>(null);

  function commit(next: Graph) {
    setPast([...past, graph]);
    setGraph(next);
  }
  function open(next: typeof mode, trigger: HTMLElement) {
    if (!graph.service) return;
    returnFocus.current = trigger;
    flushSync(() => setMode(next));
    dialog.current!.showModal();
  }
  function canvasKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || dialog.current?.open || event.nativeEvent.isComposing) return;
    if (event.key === "Enter" && graph.service) {
      setSelected(true);
      setNotice("Service selected");
    } else if (event.key === "Escape") {
      setSelected(false);
      setNotice("Selection cleared");
    } else if (event.key === "Delete" && selected && graph.service) {
      event.preventDefault();
      commit({ ...graph, service: false, edge: null });
      setSelected(false);
      setNotice("Service deleted");
    } else if (event.key.toLowerCase() === "z" && (event.ctrlKey || event.metaKey) && !event.shiftKey && past.length) {
      event.preventDefault();
      setGraph(past.at(-1)!);
      setPast(past.slice(0, -1));
      setNotice("Canvas edit undone");
    }
  }
  return <main>
    <h1>SP-07 Keyboard interactions</h1>
    <p id="canvas-instructions">Enter selects the service. Escape clears selection. Use the buttons to connect or resize.</p>
    <div role="region" aria-label="Diagram canvas" aria-describedby="canvas-instructions" tabIndex={0}
      onKeyDown={canvasKey} className="keyboard-canvas">
      <svg width="480" height="140" role="img" aria-label={graph.service ? "Service and database diagram" : "Database diagram"}>
        {graph.edge && <line x1={24 + graph.width} x2="300" y1="52" y2="52" stroke="#243953" strokeWidth="2" />}
        {graph.service && <g>
          <rect x="24" y="30" width={graph.width} height="44" fill="#e2edff" stroke={selected ? "#165bcb" : "#505d77"} strokeWidth={selected ? 3 : 1} />
          <text x="40" y="58">Service</text>
        </g>}
        <rect x="300" y="30" width="120" height="44" fill="#ecf8f1" stroke="#505d77" />
        <text x="318" y="58">Database</text>
      </svg>
    </div>
    <button disabled={!graph.service} onClick={(event) => open("connect", event.currentTarget)}>Connect to…</button>
    <button disabled={!graph.service} onClick={(event) => open("resize", event.currentTarget)}>Resize service…</button>
    <label>Label draft <input defaultValue="Service" /></label>
    <p role="status">{notice}</p>
    <pre data-testid="graph">{JSON.stringify({ ...graph, history: past.length, selected })}</pre>

    <dialog ref={dialog} aria-labelledby="command-title"
      onCancel={() => setNotice("Command cancelled")}
      onClose={() => returnFocus.current?.focus()}>
      <h2 id="command-title">{mode === "connect" ? "Connect service" : "Resize service"}</h2>
      <form key={mode} onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        if (mode === "connect") {
          const target = data.get("target");
          if (target !== "database") return;
          if (graph.edge !== target) commit({ ...graph, edge: target });
          setNotice("Connection committed");
        } else {
          const width = Number(data.get("width"));
          if (width !== graph.width) commit({ ...graph, width });
          setNotice("Resize committed");
        }
        dialog.current!.close();
      }}>
        {mode === "connect" ? <label>Target <select name="target" required defaultValue="">
          <option value="" disabled>Choose an object</option><option value="database">Database: west handle</option>
        </select></label> : <label>Width <input name="width" type="number" required min="80" max="264" defaultValue={graph.width} /></label>}
        <button type="submit">Apply</button>
        <button type="button" onClick={() => { dialog.current!.close(); setNotice("Command cancelled"); }}>Cancel</button>
      </form>
    </dialog>
  </main>;
}
