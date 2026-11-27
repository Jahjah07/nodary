import { useEffect, useRef, useState } from "react";
import { png, sampleLabel, svg } from "./scene";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: filename }).click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ExportScene() {
  const preview = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const doc = new DOMParser().parseFromString(svg(), "image/svg+xml");
    preview.current!.replaceChildren(document.importNode(doc.documentElement, true));
  }, []);
  async function exportFile(format: "svg" | "png", label = sampleLabel) {
    try {
      await document.fonts.ready;
      const markup = svg(label);
      const blob = format === "svg" ? new Blob([markup], { type: "image/svg+xml;charset=utf-8" }) : await png(markup);
      download(blob, `sp-04.${format}`);
      setNotice(`${format.toUpperCase()} prepared`);
    } catch (error) {
      setNotice(String(error));
    }
  }
  return <main>
    <h1>SP-04 Vector and raster export</h1>
    <button onClick={() => void exportFile("svg")}>Download SVG</button>
    <button onClick={() => void exportFile("png")}>Download PNG</button>
    <button onClick={() => void exportFile("svg", "Unsafe \ufffe")}>Try XML-incompatible label</button>
    <p role="status">{notice}</p>
    <div ref={preview} />
  </main>;
}
