import { viewportSchema, type DiagramDocument } from "../core/contracts";
import { parsePortable } from "../core/graph";
import type { Immutable } from "../core/immutable";
import { inspectJson, limits } from "../core/validation";

const encoder = new TextEncoder();

// DGS-08 §10. The filename derives from the title without modifying the document.
export function exportFilename(title: string, format: "json" | "svg" | "png") {
  let stem = title.normalize("NFC").replace(/[<>:"/\\|?*\p{Cc}]/gu, " ").trim().replace(/[. ]+$/u, "");
  const extension = `.${format}`;
  while (stem.toLowerCase().endsWith(extension)) stem = stem.slice(0, -extension.length).replace(/[. ]+$/u, "");
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/iu.test(stem.split(".", 1)[0].trimEnd())) stem = `_${stem}`;
  let safe = "", bytes = 0, count = 0;
  for (const point of stem) {
    const size = encoder.encode(point).length;
    if (++count > 100 || bytes + size > 200) break;
    safe += point;
    bytes += size;
  }
  safe = safe.replace(/[. ]+$/u, "");
  while (safe.toLowerCase().endsWith(extension)) safe = safe.slice(0, -extension.length).replace(/[. ]+$/u, "");
  return `${safe || "Untitled diagram"}${extension}`;
}
export const backupFilename = (title: string) => exportFilename(title, "json");

export function backupData(document: Immutable<DiagramDocument>, viewport: unknown) {
  const view = viewportSchema.nullable().safeParse(viewport);
  const omit = !view.success || !!inspectJson(viewport);
  const portable = parsePortable({ document, viewport: omit ? null : view.data });
  if (!portable.ok) return { error: portable.issues[0].message } as const;
  const bytes = encoder.encode(JSON.stringify(portable.value));
  if (bytes.length > limits.bytes) return { error: "This editable backup exceeds the 10 MiB portable limit." } as const;
  return { bytes, filename: backupFilename(document.title), omit } as const;
}

export function downloadBackup(capture: ReturnType<typeof backupData>) {
  if ("error" in capture) return capture.error;
  return downloadFile(new Blob([capture.bytes], { type: "application/json;charset=utf-8" }), capture.filename,
    capture.omit ? "The invalid viewport was omitted." : undefined);
}

export function downloadFile(blob: Blob, filename: string, warning?: string) {
  const anchor = document.createElement("a");
  let url: string | undefined;
  try {
    url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    return warning ? `Download started. ${warning}` : "Download started.";
  } catch {
    return "The browser could not start the download.";
  } finally {
    anchor.remove();
    if (url) {
      const temporary = url;
      window.setTimeout(() => URL.revokeObjectURL(temporary), 1000);
    }
  }
}
