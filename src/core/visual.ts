import type { Boundary, Edge, Node, Position, Size } from "./contracts";
import type { Rect } from "./graph";
import type { Immutable } from "./immutable";
import { componentFor, componentRegistry } from "./registry";
import vectors from "./assets/lucide-vectors.json";

type Item = Immutable<Node | Boundary>;
export type HandleId = Edge["source"]["handleId"];
export const diagramFont = "Arial, Liberation Sans, sans-serif";
export const normals = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } } as const;
type Ink = { left: number; right: number; ascent: number; descent: number };
export type Measure = ((text: string, size: number) => number) &
  { ink?(text: string, size: number): Ink | undefined };
export const approximate: Measure = (text, size) => [...text].length * size * .55;
export const inset = (box: Rect, s: number): Rect => ({ x: box.x + s, y: box.y + s, width: box.width - 2 * s, height: box.height - 2 * s });
const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });
type Outline = { kind: "rect"; radius: number } | { kind: "ellipse" } | { kind: "path"; d: string } | { kind: "none" };

export const iconVectors = vectors;

// DGS-06 §5–6. One local outline, label region and anchor definition per registry primitive.
export function visualOf(item: Item) {
  const { width: w, height: h } = item.size;
  const { primitiveKey, textRegionKey, iconKey, allowedHandles } = componentFor(item.type);
  const c = w / 2, m = h / 2, r = Math.min(c, m), d = Math.min(16, w / 6), a = Math.min(12, h / 6), q = Math.min(8, h / 8);
  const s = item.style.strokeWidth / 2;
  const status = "status" in item && componentRegistry.statuses[item.status].visible ? componentRegistry.statuses[item.status] : null;
  const paths: Record<string, string> = {
    diamond: `M ${c} 0 L ${w} ${m} L ${c} ${h} L 0 ${m} Z`,
    parallelogram: `M ${d} 0 L ${w} 0 L ${w - d} ${h} L 0 ${h} Z`,
    document: `M 0 0 H ${w} V ${h - q} Q ${.75 * w} ${h - q} ${c} ${h} C ${.33 * w} ${h} ${.17 * w} ${h - q} 0 ${h - q} Z`,
    cylinder: `M 0 ${a} A ${c} ${a} 0 0 1 ${w} ${a} V ${h - a} A ${c} ${a} 0 0 1 0 ${h - a} Z`,
  };
  const corners: Record<string, number> = { rounded_rect: 8, capsule: r, arch_card: 6, note: 4, boundary: 8 };
  const outline: Outline = (() => {
    if (primitiveKey === "ellipse") return { kind: "ellipse" };
    if (primitiveKey === "text") return { kind: "none" };
    if (paths[primitiveKey]) return { kind: "path", d: paths[primitiveKey] };
    return { kind: "rect", radius: Math.min(r, corners[primitiveKey] ?? 0) };
  })();
  const k = Math.SQRT1_2;
  const regions: Record<string, Rect> = {
    rect: rect(8, 8, w-16, h-16), capsule: rect(r+4, 8, w-2*r-8, h-16),
    diamond: rect(w/4+4, h/4+4, w/2-8, h/2-8), parallelogram: rect(d+8, 8, w-2*d-16, h-16),
    document: rect(8, 8, w-16, h-q-16), cylinder: rect(8, 2*a+4, w-16, h-3*a-8),
    subprocess: rect(d+6, 8, w-2*d-12, h-16), ellipse: rect(w*(1-k)/2+4, h*(1-k)/2+4, w*k-8, h*k-8),
    arch_card: rect(44,8,w-56,h-(status ? 38 : 16)), text: rect(4,4,w-8,h-8),
    note: rect(10,10,w-20,h-20), boundary: rect(16,8,w-32,20),
  };
  const bevel = primitiveKey === "parallelogram" ? d/2 : 0;
  const positions = { top: {x:c,y:0}, right:{x:w-bevel,y:m}, bottom:{x:c,y:h}, left:{x:bevel,y:m} };
  const anchors = allowedHandles.map((id) => ({ id, position: positions[id], direction: normals[id] }));
  return { outline, anchors, bounds: inset(rect(0,0,w,h), -s), region: inset(regions[textRegionKey], s),
    topAligned: ["text", "note", "boundary"].includes(primitiveKey), primitiveKey,
    decoration: primitiveKey === "cylinder" ? `M 0 ${a} A ${c} ${a} 0 0 0 ${w} ${a}` :
      primitiveKey === "subprocess" ? `M ${d} 0 V ${h} M ${w-d} 0 V ${h}` : null,
    icon: iconKey ? { key: iconKey as keyof typeof vectors, box: rect(Math.max(12, s),m-12,24,24) } : null,
    status: status ? { ...status, box: inset(rect(44,h-30,w-56,22),s) } : null,
    dash: item.style.strokeStyle === "dashed" ? [4*item.style.strokeWidth,3*item.style.strokeWidth] : null,
  };
}

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const words = new Intl.Segmenter(undefined, { granularity: "word" });
export function measuredInk(text: string, size: number, measure: Measure) {
  const advance = measure(text, size);
  const ink = measure.ink?.(text, size) ?? { left: 0, right: advance, ascent: size * .75, descent: size * .2 };
  const left = Math.max(0, ink.left);
  return { ...ink, left, width: left + Math.max(advance, ink.right), right: Math.max(advance, ink.right) };
}

export function wrapLines(text: string, width: number, fontSize: number, measure: Measure) {
  const lines: string[] = [];
  let widthFits = true;
  for (const paragraph of text ? text.replaceAll("\t", "    ").split("\n") : []) {
    let line = "";
    const fits = (value: string) => measuredInk(value, fontSize, measure).width <= width;
    for (const { segment: word } of words.segment(paragraph)) {
      if (fits(line + word)) { line += word; continue; }
      if (line) { lines.push(line); line = ""; }
      if (fits(word)) { line = word; continue; }
      for (const { segment } of graphemes.segment(word)) {
        if (line && !fits(line + segment)) { lines.push(line); line = ""; }
        line += segment;
        if (!fits(line)) widthFits = false;
      }
    }
    lines.push(line);
  }
  return { lines, widthFits };
}

export function lineMetrics(lines: readonly string[], fontSize: number, measure: Measure) {
  const ink = lines.map((line) => measuredInk(line, fontSize, measure));
  const ascent = Math.max(fontSize * .75, ...ink.map((line) => line.ascent));
  const descent = Math.max(fontSize * .2, ...ink.map((line) => line.descent));
  const lineHeight = Math.max(fontSize * 1.25, ascent + descent);
  return { ink, lineHeight, baseline: ascent + (lineHeight - ascent - descent) / 2 };
}

export function labelLayout(item: Item, measure: Measure = approximate) {
  const shape = visualOf(item);
  const text = "title" in item ? item.title : item.label;
  const { fontSize, align } = item.style.text;
  const { lines, widthFits } = wrapLines(text, shape.region.width, fontSize, measure);
  const { ink, lineHeight, baseline } = lineMetrics(lines, fontSize, measure);
  const height = lines.length * lineHeight;
  const statusFits = !shape.status || (measuredInk(shape.status.label, 11, measure).width + 25 <= shape.status.box.width && shape.status.box.height >= 13.75);
  const heightLimit = item.type === "general.boundary" ? item.size.height - 16 - item.style.strokeWidth : shape.region.height;
  const x = shape.region.x + (align === "left" ? 0 : align === "right" ? shape.region.width : shape.region.width/2);
  const y = shape.region.y + baseline + (shape.topAligned ? 0 : (shape.region.height-height)/2);
  const placements = lines.map((text, i) => ({
    text, x: x + ink[i].left - ink[i].width * (align === "left" ? 0 : align === "right" ? 1 : .5),
    y: y + i * lineHeight, width: ink[i].width, left: ink[i].left, ascent: ink[i].ascent, descent: ink[i].descent,
  }));
  return { lines, placements, lineHeight, height, widthFits: (!text || (widthFits && shape.region.width > 0)) && statusFits,
    fits: (!text || (widthFits && shape.region.width > 0 && height <= heightLimit)) && statusFits };
}

export function visualBounds(item: Item, layout: ReturnType<typeof labelLayout>): Rect {
  const box = visualOf(item).bounds;
  const x = Math.min(box.x, ...layout.placements.map((line) => line.x - line.left));
  const y = Math.min(box.y, ...layout.placements.map((line) => line.y - line.ascent));
  const right = Math.max(box.x + box.width, ...layout.placements.map((line) => line.x - line.left + line.width));
  const bottom = Math.max(box.y + box.height, ...layout.placements.map((line) => line.y + line.descent));
  return { x, y, width: right - x, height: bottom - y };
}

export function hitVisual(shape: ReturnType<typeof visualOf>, size: Size, p: Position, tolerance: number): boolean {
  const { width: w, height: h } = size, c = w/2, m = h/2;
  if (p.x < -tolerance || p.y < -tolerance || p.x > w+tolerance || p.y > h+tolerance) return false;
  if (shape.outline.kind === "ellipse") return ((p.x-c)/(c+tolerance))**2 + ((p.y-m)/(m+tolerance))**2 <= 1;
  if (shape.primitiveKey === "diamond") return Math.abs(p.x-c)/(c+tolerance) + Math.abs(p.y-m)/(m+tolerance) <= 1;
  if (shape.primitiveKey === "parallelogram") {
    const t = Math.max(0, Math.min(1,p.y/h)), d = Math.min(16,w/6);
    return p.x >= d*(1-t)-tolerance && p.x <= w-d*t+tolerance;
  }
  if (shape.primitiveKey === "cylinder") {
    const a=Math.min(12,h/6), y=Math.max(a,Math.min(h-a,p.y));
    return ((p.x-c)/(c+tolerance))**2+((p.y-y)/(a+tolerance))**2<=1;
  }
  if (shape.outline.kind === "rect") {
    const r=shape.outline.radius, x=Math.max(r,Math.min(w-r,p.x)), y=Math.max(r,Math.min(h-r,p.y));
    return Math.hypot(p.x-x,p.y-y)<=r+tolerance;
  }
  // The document wave uses the enclosing editor hit area; drawing and anchors use the exact path.
  return true;
}
