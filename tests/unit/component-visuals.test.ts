import { describe, expect, test } from "vitest";
import { makeComponent } from "../../src/core/component-edits";
import { componentRegistry } from "../../src/core/registry";
import { hitVisual, iconVectors, labelLayout, normals, visualOf } from "../../src/core/visual";

const size = { width: 180, height: 80 };
const position = { x: 0, y: 0 };
const outlines = {
  rect: { kind: "rect", radius: 0 },
  rounded_rect: { kind: "rect", radius: 8 },
  capsule: { kind: "rect", radius: 40 },
  arch_card: { kind: "rect", radius: 6 },
  ellipse: { kind: "ellipse" },
  note: { kind: "rect", radius: 4 },
  boundary: { kind: "rect", radius: 8 },
  subprocess: { kind: "rect", radius: 0 },
  text: { kind: "none" },
  diamond: { kind: "path", d: "M 90 0 L 180 40 L 90 80 L 0 40 Z" },
  parallelogram: { kind: "path", d: "M 16 0 L 180 0 L 164 80 L 0 80 Z" },
  document: { kind: "path", d: "M 0 0 H 180 V 72 Q 135 72 90 80 C 59.400000000000006 80 30.6 72 0 72 Z" },
  cylinder: { kind: "path", d: "M 0 12 A 90 12 0 0 1 180 12 V 68 A 90 12 0 0 1 0 68 Z" },
};

const wideOutlines = {
  ...outlines,
  capsule: { kind: "rect", radius: 50 },
  diamond: { kind: "path", d: "M 2048 0 L 4096 50 L 2048 100 L 0 50 Z" },
  parallelogram: { kind: "path", d: "M 16 0 L 4096 0 L 4080 100 L 0 100 Z" },
  document: { kind: "path", d: "M 0 0 H 4096 V 92 Q 3072 92 2048 100 C 1351.68 100 696.32 92 0 92 Z" },
  cylinder: { kind: "path", d: "M 0 12 A 2048 12 0 0 1 4096 12 V 88 A 2048 12 0 0 1 0 88 Z" },
};

describe("DGS-06 visual inventory", () => {
  test.each(componentRegistry.components)("$type matches the registry and shared outline", (definition) => {
    const item = makeComponent(definition.type, "", position);
    expect(item).toMatchObject({ type: definition.type, size: definition.defaultSize, style: definition.defaultStyle,
      position, parentId: null });
    expect("title" in item ? item.title : item.label).toBe(definition.entity === "group" ? definition.defaultTitle : definition.defaultLabel);
    const nominal = visualOf({ ...item, size });
    expect(nominal.outline).toEqual(outlines[definition.primitiveKey as keyof typeof outlines]);
    if (!definition.aspectRatio) {
      const wide = visualOf({ ...item, size: { width: 4096, height: 100 } });
      expect(wide.outline).toEqual(wideOutlines[definition.primitiveKey as keyof typeof wideOutlines]);
    }
    expect(nominal.icon?.key ?? null).toBe(definition.iconKey);
    const stroke = item.style.strokeWidth / 2;
    expect(nominal.bounds).toEqual({ x: -stroke || 0, y: -stroke || 0, width: 180 + 2 * stroke, height: 80 + 2 * stroke });
    for (const extreme of [{ width: 4096, height: 100 }, { width: 160, height: 4096 }]) {
      const component = { ...item, size: definition.aspectRatio ? { width: 160, height: 160 } : extreme };
      const first = visualOf(component);
      expect(visualOf(component)).toEqual(first);
      expect(Object.values(first.bounds).every(Number.isFinite)).toBe(true);
      expect(first.outline.kind === "path" && first.outline.d.includes("NaN")).toBe(false);
      const { width, height } = component.size;
      const inset = definition.primitiveKey === "parallelogram" ? Math.min(16, width / 6) / 2 : 0;
      const expected = { top: { x: width / 2, y: 0 }, right: { x: width - inset, y: height / 2 },
        bottom: { x: width / 2, y: height }, left: { x: inset, y: height / 2 } };
      expect(first.anchors.map(({ id }) => id)).toEqual(definition.allowedHandles);
      for (const anchor of first.anchors) {
        expect(anchor.position).toEqual(expected[anchor.id]);
        expect(anchor.direction).toEqual(normals[anchor.id]);
        expect(hitVisual(first, component.size, anchor.position, .001)).toBe(true);
      }
    }
  });

  test("CL-06/26 exhaustively counts anchors and permits only local trusted geometry", () => {
    expect(componentRegistry.components.flatMap(({ allowedHandles }) => allowedHandles)).toHaveLength(104);
    expect(Object.keys(iconVectors).sort()).toEqual(componentRegistry.components.flatMap(({ iconKey }) => iconKey ? [iconKey] : []).sort());
    for (const geometry of Object.values(iconVectors)) {
      expect(geometry.length).toBeGreaterThan(0);
      for (const [tag, attrs] of geometry) {
        expect(["circle", "ellipse", "line", "path", "polygon", "polyline", "rect"]).toContain(tag);
        for (const [key, value] of Object.entries(attrs)) {
          if (key === "fill") {
            expect(value).toBe("currentColor");
            continue;
          }
          expect(["cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "d", "points"]).toContain(key);
          expect(value).toMatch(/^[0-9a-z.,\s+-]+$/i);
        }
      }
    }
  });

  test("decorations, bounds and provisional label layout preserve visible content", () => {
    const store = makeComponent("flow.data_store", "", position);
    expect(visualOf({ ...store, size }).decoration).toBe("M 0 12 A 90 12 0 0 0 180 12");
    const subprocess = makeComponent("flow.subprocess", "", position);
    expect(visualOf({ ...subprocess, size }).decoration).toBe("M 16 0 V 80 M 164 0 V 80");
    const node = makeComponent("arch.server", "", position);
    if ("title" in node) throw Error("expected node");
    const styled = { ...node, status: "in_progress" as const, style: { ...node.style, strokeStyle: "dashed" as const, strokeWidth: 2 } };
    const shape = visualOf(styled);
    expect(shape.dash).toEqual([8, 6]);
    expect(shape.status?.label).toBe("In progress");
    expect(shape.region).toEqual({ x: 45, y: 9, width: 122, height: 40 });
    const annotation = { ...makeComponent("general.text", "", position), label: "A\tB\n\n👩‍💻" };
    expect(labelLayout(annotation, () => 0).lines).toEqual(["A    B", "", "👩‍💻"]);
    expect(labelLayout(annotation, () => 500).fits).toBe(false);
  });
});
