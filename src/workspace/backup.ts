import { viewportSchema, type DiagramDocument } from "../core/contracts";
import { parsePortable } from "../core/graph";
import type { Immutable } from "../core/immutable";
import { inspectJson, limits } from "../core/validation";

const encoder = new TextEncoder();

// DGS-08 §10. The filename derives from the title without modifying the document.
export function backupFilename(title: string) {
  let stem = title.normalize("NFC").replace(/[<>:"/\\|?*\p{Cc}]/gu, " ").trim().replace(/[. ]+$/u, "");
  stem = stem.replace(/\.json$/iu, "").replace(/[. ]+$/u, "");
  if (/^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/iu.test(stem)) stem = `_${stem}`;
  let safe = "", bytes = 0, count = 0;
  for (const point of stem) {
    const size = encoder.encode(point).length;
    if (++count > 100 || bytes + size > 200) break;
    safe += point;
    bytes += size;
  }
  safe = safe.replace(/[. ]+$/u, "");
  return `${safe || "Untitled diagram"}.json`;
}

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
  const anchor = document.createElement("a");
  let url: string | undefined;
  try {
    url = URL.createObjectURL(new Blob([capture.bytes], { type: "application/json;charset=utf-8" }));
    anchor.href = url;
    anchor.download = capture.filename;
    document.body.append(anchor);
    anchor.click();
    return capture.omit ? "Download started. The invalid viewport was omitted." : "Download started.";
  } catch {
    return "The browser could not start the backup download.";
  } finally {
    anchor.remove();
    if (url) {
      const temporary = url;
      window.setTimeout(() => URL.revokeObjectURL(temporary), 1000);
    }
  }
}
