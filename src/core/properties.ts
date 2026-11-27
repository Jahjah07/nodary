import { parseStructure, type Boundary, type DiagramDocument, type Edge, type Node } from "./contracts";
import { expandParents, indexHierarchy, moveTransformRoots, resizeObject, type ContainmentMetrics } from "./geometry";
import type { Immutable } from "./immutable";
import { componentFor } from "./registry";
import { fail, limits, ok } from "./validation";
import { approximate, labelLayout, visualBounds, wrapLines, type Measure } from "./visual";

export type PropertyItem = Immutable<Node | Boundary | Edge>;
const commonStyles = ["stroke", "strokeWidth", "strokeStyle", "text.color", "text.fontSize", "text.align"] as const;
export type PropertyField = typeof commonStyles[number] | "fill" | "fillOpacity" | "label" |
  "status" | "route" | "arrows" | "x" | "y" | "width" | "height";
export type PropertyEdit = { ids: readonly string[]; field: PropertyField; value: string | number };

export function propertyFields(item: PropertyItem, single: boolean): PropertyField[] {
  if ("source" in item) return [...commonStyles, "route", "arrows", ...(single ? ["label" as const] : [])];
  const component = componentFor(item.type);
  return [...component.editableStyleFields, ...(component.supportsStatus ? ["status" as const] : []),
    ...(single ? ["label", "x", "y"] as const : []),
    ...(single && component.resizable ? ["width", "height"] as const : [])];
}

export function propertyValue(item: PropertyItem, field: PropertyField): string | number {
  switch (field) {
    case "label": return "title" in item ? item.title : item.label;
    case "text.color": return item.style.text.color;
    case "text.fontSize": return item.style.text.fontSize;
    case "text.align": return item.style.text.align;
    case "x": case "y": return "position" in item ? item.position[field] : "";
    case "width": case "height": return "size" in item ? item.size[field] : "";
    case "status": return "status" in item ? item.status : "";
    case "route": case "arrows": return "source" in item ? item[field] : "";
    case "fill": return "fill" in item.style ? item.style.fill : "";
    case "fillOpacity": return "fillOpacity" in item.style ? item.style.fillOpacity : "";
    default: return item.style[field];
  }
}

export function containmentMetrics(measure?: Measure): ContainmentMetrics {
  return {
    visualBounds: (item) => visualBounds(item, labelLayout(item, measure)),
    titleHeight: (item) => labelLayout(item, measure).height,
  };
}

const reject = (message: string, code: "INVALID_FIELD" | "INVALID_CAPABILITY" | "CONTENT_DOES_NOT_FIT" = "INVALID_FIELD") =>
  fail({ code, path: ["document"], message });

function grow(item: Node | Boundary, measure: Measure, world: Node["position"]) {
  const { aspectRatio } = componentFor(item.type);
  const maxWidth = Math.min(limits.size, limits.coordinates - world.x);
  const maxHeight = Math.min(limits.size, limits.coordinates - world.y);
  const more = (size: number, max: number) => Math.min(max, Math.ceil(size * 1.35 + 4));
  let layout = labelLayout(item, measure);
  for (let attempt = 0; !layout.fits && attempt < 64; attempt++) {
    const { width, height } = item.size;
    if (aspectRatio === 1) {
      const side = more(width, Math.min(maxWidth, maxHeight));
      item.size = { width: side, height: side };
    } else if (!layout.widthFits || height === maxHeight) item.size = { width: more(width, maxWidth), height };
    else item.size = { width, height: more(height, maxHeight) };
    if (width === item.size.width && height === item.size.height) break;
    layout = labelLayout(item, measure);
  }
  return layout.fits;
}

// DGS-06/07 property edits stage a complete candidate before publishing a graph.
export function applyPropertyEdit(draft: DiagramDocument, edit: PropertyEdit, measure: Measure = approximate) {
  const { field, value } = edit;
  const ids = [...new Set(edit.ids)];
  const items = [...draft.nodes, ...draft.groups, ...draft.edges].filter(({ id }) => ids.includes(id));
  if (!items.length || items.length !== ids.length || items.some((item) => !propertyFields(item, ids.length === 1).includes(field))) {
    return reject("This property is unavailable for the current selection.", "INVALID_CAPABILITY");
  }
  if (items.every((item) => propertyValue(item, field) === value)) return ok(undefined);
  const metrics = containmentMetrics(measure);
  if (field === "x" || field === "y" || field === "width" || field === "height") {
    const item = items[0] as Node | Boundary;
    const sizeField = field === "width" || field === "height";
    const max = sizeField ? limits.size : limits.coordinates;
    if (typeof value !== "number" || !Number.isFinite(value) || value > max || value < (sizeField ? 1 : -max)) {
      return reject("Enter a finite number within the supported world limits.");
    }
    if (field === "x" || field === "y") {
      const delta = { x: 0, y: 0, [field]: value - item.position[field] };
      const moved = moveTransformRoots(draft, ids, delta, metrics);
      if (!moved.ok) return moved;
      draft.nodes = moved.value.nodes; draft.groups = moved.value.groups;
      return ok(undefined);
    }
    const definition = componentFor(item.type);
    const size = definition.aspectRatio === 1 ? { width: value, height: value } : { ...item.size, [field]: value };
    if (size.width < definition.minSize.width || size.height < definition.minSize.height) {
      return reject(`Minimum size is ${definition.minSize.width} × ${definition.minSize.height}.`);
    }
    if (!labelLayout({ ...item, size }, measure).fits) return reject("The component needs more space for its label or status.", "CONTENT_DOES_NOT_FIT");
    const index = indexHierarchy(draft);
    if (!index.ok) return index;
    const resized = resizeObject(draft, item.id, { ...index.value.get(item.id)!.world, ...size }, metrics);
    if (!resized.ok) return resized;
    draft.nodes = resized.value.nodes; draft.groups = resized.value.groups;
    return ok(undefined);
  }

  for (const item of items) {
    let target: object = item.style;
    let key: string = field;
    if (field === "label") { target = item; key = "title" in item ? "title" : "label"; }
    else if (field === "status" || field === "route" || field === "arrows") target = item;
    else if (field.startsWith("text.")) { target = item.style.text; key = field.slice(5); }
    const set = target as Record<string, string | number>;
    set[key] = value;
  }
  const valid = parseStructure({ document: draft, viewport: null });
  if (!valid.ok) {
    const issue = valid.issues[0];
    return issue.code === "INVALID_FIELD" ? reject("Enter a supported value within the field’s range.") : valid;
  }
  const frames = new Set<string>();
  const changesFit = ["label", "strokeWidth", "text.fontSize", "status"].includes(field);
  if (!changesFit) return ok(undefined);
  const index = indexHierarchy(draft);
  if (!index.ok) return index;
  for (const item of items) {
    if ("source" in item) {
      if (!wrapLines(item.label, 232, item.style.text.fontSize, measure).widthFits) {
        return reject("A label character cannot fit at this font size.", "CONTENT_DOES_NOT_FIT");
      }
      continue;
    }
    if (!grow(item, measure, index.value.get(item.id)!.world)) {
      return reject("Content cannot fit within the supported component size.", "CONTENT_DOES_NOT_FIT");
    }
    if ("title" in item) frames.add(item.id);
    if (item.parentId) frames.add(item.parentId);
  }
  const expanded = expandParents(draft, frames, metrics);
  return expanded.ok ? ok(undefined) : expanded;
}
