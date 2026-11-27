// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { makeComponent } from "../../src/core/component-edits";
import { componentRegistry } from "../../src/core/registry";
import { ComponentGraphic, ComponentPreview } from "../../src/workspace/component-graphic";

afterEach(cleanup);

test("the SVG adapter preserves defaults, local vectors and the scale of each palette glyph", () => {
  for (const component of componentRegistry.components) {
    const item = makeComponent(component.type, "", { x: 0, y: 0 });
    const { container, unmount } = render(<>
      <ComponentGraphic item={item} selected /><ComponentPreview type={item.type} />
    </>);
    const [scene, tile] = container.querySelectorAll("svg");
    expect(scene.getAttribute("viewBox")).toBe(`0 0 ${item.size.width} ${item.size.height}`);
    expect(scene.getAttribute("data-selected")).toBe("true");
    expect(scene.querySelector("text")?.textContent).toBe("title" in item ? item.title : item.label);
    expect(tile.getAttribute("aria-hidden")).toBe("true");
    expect(tile.children.length).toBeGreaterThan(0);
    if (component.iconKey) {
      const vector = scene.querySelector(`[data-icon="${component.iconKey}"]`);
      expect(vector?.getAttribute("stroke")).toBe(item.style.text.color);
      expect(vector?.getAttribute("stroke-width")).toBe("1.75");
    }
    unmount();
  }
});

test("the graphic exposes overflow and keeps imported markup literal", () => {
  const item = makeComponent("arch.security", "", { x: 0, y: 0 });
  if ("title" in item) throw Error("expected node");
  const label = "<img src=x onerror=alert(1)>";
  const { container } = render(<ComponentGraphic item={{ ...item, label: label.repeat(10), status: "pending" }} />);
  expect(container.querySelectorAll("img, script, foreignObject")).toHaveLength(0);
  expect(container.querySelector(".diagram-label")?.textContent).toBe(label.repeat(10));
  expect(container.textContent).toContain("Pending");
  expect(container.textContent).toContain("Label exceeds shape");
});

// jsdom has no Canvas 2D implementation; these cases exercise the explicit fallback.
vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
