import { Download } from "lucide-react";
import { useRef, useState } from "react";
import type { DiagramDocument, Viewport } from "../core/contracts";
import type { Immutable } from "../core/immutable";
import { buildScene, type Scene } from "../core/scene";
import { serializeSvg, visualExportBounds } from "../core/svg-export";
import { pngDimensions, rasterizePng, visualExportBusy, type PngScale } from "../infrastructure/png-export";
import { backupData, downloadFile, exportFilename } from "./backup";
import { measureLabel } from "./component-graphic";

export type ExportSnapshot = { document: Immutable<DiagramDocument>; viewport: Viewport | null };
type Format = "png" | "svg" | "json";

export function ExportDialog({ capture }: { capture(): ExportSnapshot | undefined }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const running = useRef<AbortController | null>(null);
  const [snapshot, setSnapshot] = useState<ExportSnapshot>();
  const [scene, setScene] = useState<Scene>();
  const [format, setFormat] = useState<Format>("png");
  const [scale, setScale] = useState<PngScale>(2);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");

  const world = scene && visualExportBounds(scene);
  const pixels = world?.ok ? pngDimensions(world.value, scale) : undefined;
  const visualProblem = !world?.ok ? world?.issues[0].message ?? "No diagram was captured." :
    format === "png" && !pixels?.ok ? pixels?.issues[0].message ?? "" : "";
  const lower = scale === 2 && world?.ok && pngDimensions(world.value, 1).ok;
  function open() {
    const current = capture();
    if (!current) return;
    setSnapshot(current);
    setFormat("png");
    setScale(2);
    setFilename(current.document.title);
    setStatus("");
    setProblem("");
    try { setScene(buildScene(current.document, measureLabel)); }
    catch {
      setScene(undefined);
      setFormat("json");
      setProblem("The visual scene could not be generated. You can still download editable JSON.");
    }
    dialog.current?.showModal();
  }
  async function generate() {
    if (!snapshot || running.current) return;
    if (format !== "json" && (!scene || visualProblem || visualExportBusy())) {
      setStatus("");
      setProblem(visualProblem || "A previous visual export is still finishing.");
      return;
    }
    const controller = new AbortController();
    running.current = controller;
    setBusy(true);
    setStatus("Preparing export…");
    setProblem("");
    const handoff = (blob: Blob, warning?: string) => {
      const result = downloadFile(blob, exportFilename(filename, format), warning);
      if (result.startsWith("Download started.")) setStatus(result);
      else { setStatus(""); setProblem(result); }
    };
    try {
      if (format === "json") {
        const result = backupData(snapshot.document, snapshot.viewport);
        if ("error" in result) setProblem(result.error ?? "Editable JSON could not be generated.");
        else {
          handoff(new Blob([result.bytes], { type: "application/json;charset=utf-8" }),
            result.omit ? "The invalid viewport was omitted." : undefined);
          return;
        }
      } else if (scene) {
        const svg = serializeSvg(scene, snapshot.document.title, format === "png" && pixels?.ok ? pixels.value : undefined);
        if (!svg.ok) setProblem(svg.issues[0].message);
        else if (format === "svg") { handoff(new Blob([svg.value.text], { type: "image/svg+xml;charset=utf-8" })); return; }
        else if (pixels?.ok) {
          const png = await rasterizePng(svg.value.text, pixels.value, controller.signal);
          if (!png.ok) setProblem(png.issues[0].message);
          else if (!controller.signal.aborted) { handoff(png.value); return; }
        }
      }
      setStatus("");
    } catch {
      setStatus("");
      setProblem("The browser could not prepare this export. Your diagram is still open.");
    } finally {
      running.current = null;
      setBusy(false);
    }
  }
  return <>
    <button ref={trigger} type="button" className="button tool-button" title="Export diagram" onClick={open}><Download size={16} /> Export</button>
    <dialog ref={dialog} className="workspace-dialog" aria-labelledby="export-title" onCancel={(event) => {
      if (running.current) { event.preventDefault(); running.current.abort(); }
    }} onClose={() => { setSnapshot(undefined); setScene(undefined); trigger.current?.focus(); }}>
      <form onSubmit={(event) => { event.preventDefault(); void generate(); }}>
        <h2 id="export-title">Export diagram</h2>
        <label>Format<select value={format} disabled={busy} onChange={(event) => {
          setFormat(event.target.value as Format); setStatus(""); setProblem("");
        }}>
          <option value="png">PNG image</option>
          <option value="svg">SVG scalable vector</option>
          <option value="json">Editable JSON backup</option>
        </select></label>
        <label>Filename<input value={filename} disabled={busy} onChange={(event) => setFilename(event.target.value)} /></label>
        {format !== "json" && <p>Full scene · White background</p>}
        {format !== "json" && world?.ok && <p>Scene size {world.value.width} × {world.value.height} world units</p>}
        {format === "png" && <>
          <label>Scale<select value={scale} disabled={busy} onChange={(event) => {
            setScale(event.target.value === "1" ? 1 : 2); setStatus(""); setProblem("");
          }}><option value={2}>2×</option><option value={1}>1×</option></select></label>
          {pixels?.ok && <p>PNG size {pixels.value.width} × {pixels.value.height} px</p>}
        </>}
        {format !== "json" && visualProblem && <p role="alert">{visualProblem}</p>}
        {format === "png" && visualProblem && lower && <button type="button" className="button" onClick={() => setScale(1)}>Use 1×</button>}
        {format === "png" && visualProblem && !lower && world?.ok && <p>Choose SVG or editable JSON to export this diagram.</p>}
        {status && <p role="status">{status}</p>}
        {problem && <p role="alert">{problem}</p>}
        <div className="dialog-actions">
          <button type="button" className="button" onClick={() => {
            if (running.current) running.current.abort();
            else dialog.current?.close();
          }}>{busy ? "Cancel export" : "Close"}</button>
          <button type="submit" className="primary" disabled={busy || (format !== "json" && !!visualProblem)}>Download</button>
        </div>
      </form>
    </dialog>
  </>;
}
