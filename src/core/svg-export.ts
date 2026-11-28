import license from "./assets/lucide-license.json";
import type { Position, Size } from "./contracts";
import type { Rect } from "./graph";
import { dashPattern, unionBounds } from "./routes";
import type { Scene } from "./scene";
import { fail, ok, type Result } from "./validation";
import { diagramFont, iconVectors, visualOf } from "./visual";

const encoder = new TextEncoder();
const maximumDimension = 2_100_000;
const maximumBytes = 20 * 1024 * 1024;
const maximumElements = 100_000;
type Tag = "svg" | "title" | "desc" | "g" | "rect" | "path" | "ellipse" | "line" | "circle" | "polyline" | "polygon" | "text" | "tspan";
type Attr = "xmlns" | "width" | "height" | "viewBox" | "x" | "y" | "x1" | "y1" | "x2" | "y2" | "cx" | "cy" | "r" | "rx" | "ry" |
  "d" | "points" | "transform" | "fill" | "fill-opacity" | "stroke" | "stroke-width" | "stroke-linejoin" | "stroke-linecap" |
  "stroke-dasharray" | "font-family" | "font-size" | "dominant-baseline" | "xml:space";
type Attributes = Partial<Record<Attr, string | number>>;
type MeasuredNode = Scene["nodes"][number] | Scene["groups"][number];
const vectorTags: ReadonlySet<string> = new Set(["rect", "line", "path", "ellipse", "circle"]);
const vectorAttributes: ReadonlySet<string> = new Set(["x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "d", "fill"]);

const visibleNode = ({ item, label }: MeasuredNode) =>
  item.type !== "general.text" || label.placements.some(({ text }) => text.trim().length);

function nodeInk(node: MeasuredNode): Rect {
  if (node.item.type !== "general.text") return node.bounds;
  return unionBounds(node.label.placements.filter(({ text }) => text.trim()).map((line) => ({
    x: node.rect.x + line.x - line.left, y: node.rect.y + line.y - line.ascent,
    width: line.width, height: line.ascent + line.descent,
  })))!;
}

// DGS-08 §8. Viewport-independent world bounds, including scene stroke, markers and labels.
export function visualExportBounds(scene: Scene): Result<Rect> {
  if (scene.diagnostics.length) return fail({ code: "ROUTE_UNAVAILABLE", path: [], message: "An export route could not be generated." });
  const components = [...scene.groups, ...scene.nodes.filter(visibleNode)];
  if (components.some(({ label }) => !label.fits)) return fail({ code: "CONTENT_DOES_NOT_FIT", path: [],
    message: "Measured text does not fit the diagram. Adjust the affected components before exporting." });
  const bounds = unionBounds([...components.map(nodeInk), ...scene.edges.map(({ bounds }) => bounds)]);
  if (!bounds) return fail({ code: "NO_VISIBLE_CONTENT", path: [], message: "The diagram has no visible content. You can export editable JSON." });
  const x = Math.floor(bounds.x - 32), y = Math.floor(bounds.y - 32);
  const width = Math.ceil(bounds.x + bounds.width + 32) - x;
  const height = Math.ceil(bounds.y + bounds.height + 32) - y;
  if (![x, y, width, height].every(Number.isSafeInteger) || width < 1 || height < 1 || width > maximumDimension || height > maximumDimension) {
    return fail({ code: "LIMIT_EXCEEDED", path: [], message: "The scene exceeds the SVG dimension limit. Export editable JSON instead." });
  }
  return ok({ x, y, width, height });
}

const points = (positions: readonly Position[]) => positions.map(({ x, y }) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error("Nonfinite points");
  return `${x},${y}`;
}).join(" ");
const translate = (x: number, y: number) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw Error("Nonfinite translation");
  return `translate(${x} ${y})`;
};

function xml(value: string | number) {
  if (typeof value === "number" && !Number.isFinite(value)) throw Error("Nonfinite attribute");
  const text = String(value);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(text)) throw new SyntaxError("Invalid XML text");
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

// DGS-08 §9. Serialize only the typed visual scene and bundled allowlisted assets.
export function serializeSvg(scene: Scene, title: string, pixels?: Size): Result<{ text: string; bounds: Rect }> {
  const area = visualExportBounds(scene);
  if (!area.ok) return area;
  const bounds = area.value;
  const fragments: string[] = [];
  let size = 0, count = 0;
  function append(text: string) {
    size += encoder.encode(text).length;
    if (size > maximumBytes) throw new RangeError("SVG exceeds 20 MiB.");
    fragments.push(text);
  }
  function element(tag: Tag, attrs: Attributes = {}, children?: () => void) {
    if (++count > maximumElements) throw new RangeError("SVG exceeds 100,000 elements.");
    const properties = Object.entries(attrs).map(([key, value]) => ` ${key}="${xml(value)}"`).join("");
    if (!children) { append(`<${tag}${properties}/>`); return; }
    append(`<${tag}${properties}>`);
    children();
    append(`</${tag}>`);
  }
  const literal = (tag: Tag, value: string) => element(tag, {}, () => append(xml(value)));
  type TextStyle = MeasuredNode["item"]["style"]["text"];
  function label(style: TextStyle, placements: readonly { text: string; x: number; y: number }[]) {
    if (!placements.length) return;
    element("text", { fill: style.color, "font-family": diagramFont, "font-size": style.fontSize, "xml:space": "preserve" }, () => {
      for (const { text, x, y } of placements) element("tspan", { x, y }, () => append(xml(text)));
    });
  }
  let includesIcon = false;
  function component({ item, rect, label: layout }: MeasuredNode, frame: boolean) {
    const { style } = item;
    const { width, height } = item.size;
    const { outline, decoration, icon, status, dash } = visualOf(item);
    const paint: Attributes = { fill: style.fill, "fill-opacity": "fillOpacity" in style ? style.fillOpacity : 1,
      stroke: style.stroke, "stroke-width": style.strokeWidth, "stroke-linejoin": "round", "stroke-linecap": "round",
      ...(dash && { "stroke-dasharray": dash.join(" ") }) };
    element("g", { transform: translate(rect.x, rect.y) }, () => {
      if (outline.kind === "rect") element("rect", { ...paint, width, height, rx: outline.radius });
      if (outline.kind === "ellipse") element("ellipse", { ...paint, cx: width / 2, cy: height / 2, rx: width / 2, ry: height / 2 });
      if (outline.kind === "path") element("path", { ...paint, d: outline.d });
      if (decoration) element("path", { ...paint, fill: "none", d: decoration });
      if (icon) {
        includesIcon = true;
        const vectors = iconVectors[icon.key];
        if (!vectors?.length) throw Error("Missing icon");
        element("g", { transform: translate(icon.box.x, icon.box.y), fill: "none", stroke: style.text.color,
          "stroke-width": 1.75, "stroke-linecap": "round", "stroke-linejoin": "round" }, () => {
          for (const [tag, attributes] of vectors) {
            if (typeof tag !== "string" || !vectorTags.has(tag) || typeof attributes !== "object" ||
              Object.entries(attributes).some(([key]) => !vectorAttributes.has(key))) throw Error("Invalid bundled icon");
            element(tag as Tag, attributes);
          }
        });
      }
      if (!frame) label(style.text, layout.placements);
      if (status) element("g", { transform: translate(status.box.x, status.box.y) }, () => {
        element("rect", { width: status.box.width, height: status.box.height, rx: 4, fill: "#FFFFFF" });
        element("circle", { cx: 11.5, cy: status.box.height / 2, r: 3.5, fill: status.marker });
        element("text", { x: 20, y: status.box.height / 2, "dominant-baseline": "central", "font-family": diagramFont,
          "font-size": 11, fill: status.text }, () => append(xml(status.label)));
      });
    });
  }
  try {
    const dimensions = pixels ?? bounds;
    if (![dimensions.width, dimensions.height].every((value) => Number.isSafeInteger(value) && value > 0)) throw Error("Invalid dimensions");
    append('<?xml version="1.0" encoding="UTF-8"?>\n');
    element("svg", { xmlns: "http://www.w3.org/2000/svg", width: dimensions.width, height: dimensions.height,
      viewBox: `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}` }, () => {
      literal("title", title);
      element("rect", { ...bounds, fill: "#FFFFFF" });
      for (const group of scene.groups) component(group, true);
      for (const edge of scene.edges) {
        const { style } = edge.item;
        const dash = dashPattern(style);
        element("polyline", { points: points(edge.line), fill: "none", stroke: style.stroke, "stroke-width": style.strokeWidth,
          "stroke-linejoin": "round", "stroke-linecap": "round", ...(dash && { "stroke-dasharray": dash.join(" ") }) });
        for (const arrow of edge.arrows) element("polygon", { points: points(arrow), fill: style.stroke });
      }
      for (const node of scene.nodes.filter(visibleNode)) component(node, false);
      for (const edge of scene.edges) if (edge.label) {
        const { box, placements } = edge.label;
        element("g", { transform: translate(box.x, box.y) }, () => {
          element("rect", { width: box.width, height: box.height, fill: "#FFFFFF" });
          label(edge.item.style.text, placements);
        });
      }
      for (const group of scene.groups) if (group.label.placements.length) {
        element("g", { transform: translate(group.rect.x, group.rect.y) }, () => label(group.item.style.text, group.label.placements));
      }
      if (includesIcon) literal("desc", license);
    });
    return ok({ text: fragments.join(""), bounds });
  } catch (cause) {
    if (cause instanceof RangeError) return fail({ code: "LIMIT_EXCEEDED", path: [], message: `${cause.message} Export editable JSON instead.` });
    if (cause instanceof SyntaxError) return fail({ code: "INVALID_TEXT", path: [], message: "The diagram contains text that SVG cannot encode." });
    return fail({ code: "EXPORT_FAILED", path: [], message: "The SVG geometry or bundled assets could not be generated." });
  }
}
