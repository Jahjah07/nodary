import { createDispatcher } from "./commands";
import { applyEdgeEdit, type EdgeEdit } from "./edge-edits";
import { applyHierarchyEdit, type HierarchyEdit } from "./hierarchy-edits";
import { applyPropertyEdit, containmentMetrics, type PropertyEdit } from "./properties";
import type { Boundary, Node, Position } from "./contracts";
import { indexHierarchy, moveTransformRoots, resizeObject, snapWorld, validateContainment } from "./geometry";
import type { Rect } from "./graph";
import { componentFor, type Component } from "./registry";
import { fail, ok } from "./validation";
import { labelLayout, type Measure } from "./visual";

export type ComponentType = Component["type"];
export type SettingsKey = "gridVisible" | "snapToGrid";
export type ComponentEdit =
  | { kind: "insert"; type: ComponentType; id: string; position: Position }
  | { kind: "move" | "nudge"; ids: readonly string[]; reference: string; delta: Position }
  | { kind: "resize"; id: string; rect: Rect };

export function makeComponent(type: ComponentType, id: string, position: Position): Node | Boundary {
  const component = componentFor(type);
  const base = { id, parentId: null, size: { ...component.defaultSize }, position: { ...position } };
  return component.entity === "node" ?
    { ...base, type: component.type, label: component.defaultLabel, style: structuredClone(component.defaultStyle), status: "not_specified" } :
    { ...base, type: component.type, title: component.defaultTitle, style: structuredClone(component.defaultStyle) };
}

export function insertionPosition(type: ComponentType, world: Position, hotspot: Position, snap: boolean) {
  const { width, height } = componentFor(type).defaultSize;
  const point = { x: world.x - width * hotspot.x, y: world.y - height * hotspot.y };
  return snap ? snapWorld(point) : point;
}

export const resizeHandles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
export type ResizeHandle = typeof resizeHandles[number];
export function resizeRect(rect: Rect, handle: ResizeHandle, delta: Position, square: boolean, snap: boolean): Rect {
  const left = handle.includes("w"), right = handle.includes("e"), top = handle.includes("n"), bottom = handle.includes("s");
  const fixedX = left ? rect.x + rect.width : rect.x;
  const fixedY = top ? rect.y + rect.height : rect.y;
  const moving = { x: (left ? rect.x : rect.x + rect.width) + delta.x, y: (top ? rect.y : rect.y + rect.height) + delta.y };
  const point = snap ? snapWorld(moving) : moving;
  let width = left ? fixedX - point.x : right ? point.x - fixedX : rect.width;
  let height = top ? fixedY - point.y : bottom ? point.y - fixedY : rect.height;
  if (square) {
    const size = Math.abs(delta.x) >= Math.abs(delta.y) ? width : height;
    width = height = size;
  }
  return { x: left ? fixedX - width : rect.x, y: top ? fixedY - height : rect.y, width, height };
}

// DGS-06/07. The same validation runs for preview and commit.
export function componentDispatcher(measure?: Measure) {
  const metrics = containmentMetrics(measure);
  const reject = (message: string) => fail({ code: "INVALID_GEOMETRY", path: ["document"], message });
  return createDispatcher<{ toggle: SettingsKey; component: ComponentEdit; edge: EdgeEdit; property: PropertyEdit; hierarchy: HierarchyEdit }>({
    toggle(draft, key) { draft.settings[key] = !draft.settings[key]; return ok(undefined); },
    edge: applyEdgeEdit,
    property: (draft, edit) => applyPropertyEdit(draft, edit, measure),
    hierarchy: (draft, edit) => applyHierarchyEdit(draft, edit, metrics),
    component(draft, edit) {
      if (edit.kind === "insert") {
        const item = makeComponent(edit.type, edit.id, edit.position);
        if (!labelLayout(item, measure).fits) return reject("The default label does not fit this component.");
        if (item.type === "general.boundary") draft.groups.push(item);
        else draft.nodes.push(item);
        const valid = validateContainment(draft, metrics);
        return valid.ok ? ok(undefined) : valid;
      }
      const index = indexHierarchy(draft);
      if (!index.ok) return index;
      const entry = index.value.get(edit.kind === "resize" ? edit.id : edit.reference);
      if (!entry) return reject("The transform target no longer exists.");
      let result;
      if (edit.kind !== "resize") {
        let reference = entry;
        for (let parent = entry.item.parentId; parent; parent = index.value.get(parent)!.item.parentId) {
          if (edit.ids.includes(parent)) reference = index.value.get(parent)!;
        }
        const delta = { ...edit.delta };
        if (edit.kind === "move" && draft.settings.snapToGrid && (delta.x || delta.y)) {
          const point = snapWorld({ x: reference.world.x + delta.x, y: reference.world.y + delta.y });
          delta.x = point.x - reference.world.x;
          delta.y = point.y - reference.world.y;
        }
        if (!delta.x && !delta.y) return ok(undefined);
        result = moveTransformRoots(draft, edit.ids, delta, metrics);
      } else {
        const { minSize, aspectRatio, resizable } = componentFor(entry.item.type);
        const { width, height } = edit.rect;
        if (width === entry.item.size.width && height === entry.item.size.height &&
          edit.rect.x === entry.world.x && edit.rect.y === entry.world.y) return ok(undefined);
        if (!resizable || width < minSize.width || height < minSize.height ||
          (aspectRatio !== null && Math.abs(width / height - aspectRatio) > 1e-6)) {
          return reject("Requested size is outside this component's resize limits.");
        }
        const candidate = { ...entry.item, size: { width, height } };
        if (!labelLayout(candidate, measure).fits) return reject("The component needs more space for its label.");
        result = resizeObject(draft, edit.id, edit.rect, metrics);
      }
      if (!result.ok) return result;
      draft.nodes = result.value.nodes;
      draft.groups = result.value.groups;
      return ok(undefined);
    },
  }, () => new Date().toISOString());
}
