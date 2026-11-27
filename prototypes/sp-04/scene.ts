// SP-04 controlled synthetic scene, with fixed known stroke and label extents.
export const sampleLabel = "Service & worker\nCafé — <script>";
export const viewBox = { x: -72, y: -57, width: 532, height: 277 };
const svgLimit = 2_100_000;

export function pngDimensions(width: number, height: number, scale: 1 | 2) {
  const w = Math.ceil(width * scale);
  const h = Math.ceil(height * scale);
  if (![w, h].every((n) => Number.isFinite(n) && n >= 1 && n <= 8192) || w * h > 16_777_216) {
    throw Error("PNG exceeds the raster budget. Try 1× or export SVG.");
  }
  return { width: w, height: h };
}

export function xmlText(text: string): string {
  for (const character of text) {
    const n = character.codePointAt(0)!;
    if (n !== 9 && n !== 10 && (n < 32 || (n >= 0x7f && n <= 0x9f) ||
      (n >= 0xd800 && n <= 0xdfff) || n === 0xfffe || n === 0xffff)) {
      throw Error(`Unsupported text character U+${n.toString(16).toUpperCase()}`);
    }
  }
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function svg(label = sampleLabel, width: number = viewBox.width, height: number = viewBox.height): string {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0 && n <= svgLimit)) {
    throw Error("SVG exceeds its dimension limit");
  }
  const { x, y } = viewBox;
  const safe = xmlText(label);
  const lines = safe.split("\n");
  if (lines.length > 2 || [...label].length > 100) throw Error("Sample label exceeds its bounds");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" role="img" aria-labelledby="scene-title">
  <title id="scene-title">Portable scene</title>
  <desc>Two nested boundaries, a service and a database connected by an arrow.</desc>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff"/>
  <g fill="none" stroke="#334e68" stroke-width="2">
    <rect x="-39" y="-24" width="280" height="210" rx="10"/>
    <rect x="-13" y="20" width="222" height="151" rx="8"/>
    <polyline points="158,100 260,100 260,75 304,75"/>
  </g>
  <polygon points="314,75 302,70 302,80" fill="#334e68"/>
  <g stroke="#24548a" stroke-width="2">
    <rect x="8" y="61" width="150" height="83" rx="8" fill="#dbeafe"/>
    <rect x="315" y="45" width="110" height="60" rx="8" fill="#e8f5e9"/>
    <circle cx="332" cy="74" r="8" fill="none"/>
    <path d="M327 74l3 3 6-6" fill="none"/>
  </g>
  <g fill="#17385b" font-family="Arial, Liberation Sans, sans-serif" font-size="14">
    <text x="-25" y="0">Outer boundary</text>
    <text x="0" y="45">Inner boundary</text>
    <text xml:space="preserve">${lines.map((line, i) => `<tspan x="20" y="${86 + i * 20}">${line}</tspan>`).join("")}</text>
    <text x="20" y="129" fill="#165a44">Proposed</text>
    <text x="345" y="79">Database</text>
  </g>
</svg>`;
}

export async function png(markup: string, width = viewBox.width, height = viewBox.height, scale: 1 | 2 = 2) {
  const size = pngDimensions(width, height, scale);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = Object.assign(document.createElement("canvas"), size);
    const context = canvas.getContext("2d");
    if (!context) throw Error("Canvas 2D unavailable");
    context.drawImage(image, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(Error("PNG encoding failed")), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
