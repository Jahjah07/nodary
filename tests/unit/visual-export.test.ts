// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { makeComponent } from "../../src/core/component-edits";
import type { DiagramDocument, Node } from "../../src/core/contracts";
import { componentRegistry } from "../../src/core/registry";
import { buildScene } from "../../src/core/scene";
import { serializeSvg, visualExportBounds } from "../../src/core/svg-export";
import { pngDimensions } from "../../src/infrastructure/png-export";
import { exportFilename } from "../../src/workspace/backup";
import { blankDiagram } from "../../src/workspace/sample";
import flowchart from "../fixtures/templates/DGS-06_Template_Basic_Flowchart_v1.json";

const id = (n: number) => `c7aa1cd5-ef11-4954-ab3e-${String(n).padStart(12, "0")}`;
const empty = () => blankDiagram(id(0), "Fixture", "general", new Date(0).toISOString()).document;
const tags = new Set("svg title desc g rect path ellipse line circle polyline polygon text tspan".split(" "));
const attrs = new Set("xmlns width height viewBox x y x1 y1 x2 y2 cx cy r rx ry d points transform fill fill-opacity stroke stroke-width stroke-linejoin stroke-linecap stroke-dasharray font-family font-size dominant-baseline xml:space".split(" "));

test("CL-18–21 / PE-29–33 serializes all 29 registry definitions and trusted status and icon paint", () => {
  const diagram = empty();
  for (const [i, definition] of componentRegistry.components.entries()) {
    const item = makeComponent(definition.type, id(i + 1), { x: (i % 8) * 200 - 900, y: Math.floor(i / 8) * 150 - 400 });
    if (item.type === "general.boundary") diagram.groups.push(item);
    else diagram.nodes.push(item);
  }
  const statuses = diagram.nodes.filter(({ type }) => type.startsWith("arch.")).slice(0, 4);
  for (const [i, status] of (["not_specified", "pending", "in_progress", "completed"] as const).entries()) statuses[i].status = status;
  diagram.nodes.find(({ type }) => type === "general.text")!.label = "A & <script>漢字</script> 💡";
  diagram.nodes.find(({ type }) => type === "general.text")!.size = { width: 440, height: 125 };
  const scene = buildScene(diagram);
  const result = serializeSvg(scene, "A < & \" >");
  if (!result.ok) throw Error(JSON.stringify(result.issues));
  const { text, bounds } = result.value;
  const dom = new DOMParser().parseFromString(text, "image/svg+xml");
  expect(dom.querySelector("parsererror")).toBeNull();
  expect(dom.documentElement.namespaceURI).toBe("http://www.w3.org/2000/svg");
  expect(dom.querySelector("title")?.textContent).toBe("A < & \" >");
  expect(dom.querySelector("desc")?.textContent).toBe(readFileSync("public/LUCIDE-LICENSE.txt", "utf8").replaceAll("\r\n", "\n"));
  expect(dom.querySelector("svg > rect")?.getAttribute("fill")).toBe("#FFFFFF");
  expect(dom.documentElement.getAttribute("viewBox")).toBe(`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  expect(bounds.x).toBe(Math.floor(scene.bounds!.x - 32));
  expect(bounds.y).toBe(Math.floor(scene.bounds!.y - 32));
  expect(dom.querySelectorAll("svg > g")).toHaveLength(30);
  expect(dom.querySelector("svg > g:first-of-type > rect")).not.toBeNull();
  expect(dom.querySelectorAll("svg > g > g[stroke-width='1.75']")).toHaveLength(14);
  expect(dom.querySelectorAll("text[dominant-baseline]")).toHaveLength(3);
  expect(dom.documentElement.textContent).toContain("A & <script>漢字</script> 💡");
  for (const element of dom.querySelectorAll("*")) {
    expect(tags.has(element.localName)).toBe(true);
    for (const attribute of element.attributes) expect(attrs.has(attribute.name)).toBe(true);
  }
  expect(text).not.toContain("<script>");
  expect(text).not.toMatch(/href=|style=|onload=|<foreignObject|<image/);
  const invalid = serializeSvg(scene, "Invalid\uffff");
  expect(invalid).toMatchObject({ ok: false, issues: [{ code: "INVALID_TEXT" }] });
});

test("PE-29/32 rejects blank and invisible art while preserving an empty boundary and all edge paint modes", () => {
  const diagram = empty();
  expect(visualExportBounds(buildScene(diagram))).toMatchObject({ ok: false, issues: [{ code: "NO_VISIBLE_CONTENT" }] });
  const invisible = makeComponent("general.text", id(1), { x: -5000, y: 80 }) as Node;
  invisible.label = " \n ";
  diagram.nodes.push(invisible);
  expect(visualExportBounds(buildScene(diagram))).toMatchObject({ ok: false, issues: [{ code: "NO_VISIBLE_CONTENT" }] });
  const frame = makeComponent("general.boundary", id(2), { x: -100, y: -40 });
  if (frame.type !== "general.boundary") throw Error("Expected boundary");
  frame.title = "";
  diagram.groups.push(frame);
  const bounds = visualExportBounds(buildScene(diagram));
  expect(bounds).toMatchObject({ ok: true, value: { x: -133, y: -73 } });
  const onlyText = empty();
  onlyText.nodes.push({ ...invisible, label: "Small", size: { width: 2000, height: 700 } });
  const annotation = visualExportBounds(buildScene(onlyText));
  if (!annotation.ok) throw Error(JSON.stringify(annotation.issues));
  expect(annotation.value.width).toBeLessThan(150);

  const copied = structuredClone(flowchart.document) as DiagramDocument;
  for (const [i, mode] of ["none", "forward", "both"].entries()) {
    copied.edges[i].arrows = mode as DiagramDocument["edges"][number]["arrows"];
    copied.edges[i].route = i === 0 ? "straight" : "orthogonal";
  }
  copied.edges[0].style.strokeStyle = "dashed";
  copied.edges[1].label = "Yes & no";
  const scene = buildScene(copied);
  const svg = serializeSvg(scene, copied.title);
  if (!svg.ok) throw Error(JSON.stringify(svg.issues));
  const doc = new DOMParser().parseFromString(svg.value.text, "image/svg+xml");
  expect(doc.querySelectorAll("polyline")).toHaveLength(6);
  expect(doc.querySelectorAll("polygon")).toHaveLength(scene.edges.reduce((sum, edge) => sum + edge.arrows.length, 0));
  expect(doc.querySelector("polyline[stroke-dasharray]")).not.toBeNull();
  expect(doc.documentElement.textContent).toContain("Yes & no");
});

test("PE-33/34 bounds element count, dimensions, PNG area and explicit scale", () => {
  const diagram = empty();
  diagram.nodes.push(makeComponent("flow.process", id(1), { x: 0, y: 0 }) as Node);
  const scene = buildScene(diagram);
  expect(visualExportBounds({ ...scene, nodes: [{ ...scene.nodes[0], bounds: { x: 0, y: 0, width: 2_100_000, height: 5 } }] }))
    .toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED" }] });
  expect(serializeSvg({ ...scene, nodes: Array.from({ length: 26_000 }, () => scene.nodes[0]) }, "Many elements"))
    .toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED", message: expect.stringContaining("100,000") }] });
  const node = scene.nodes[0];
  const placement = { ...node.label.placements[0], text: "a".repeat(1000) };
  const large = { ...node, label: { ...node.label, placements: Array.from({ length: 22_000 }, () => placement) } };
  expect(serializeSvg({ ...scene, nodes: [large] }, "Large SVG"))
    .toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED", message: expect.stringContaining("20 MiB") }] });
  expect(pngDimensions({ width: 2048, height: 2048 }, 2)).toEqual({ ok: true, value: { width: 4096, height: 4096 } });
  expect(pngDimensions({ width: 2049, height: 2048 }, 2)).toMatchObject({ ok: false, issues: [{ code: "LIMIT_EXCEEDED" }] });
  expect(pngDimensions({ width: 5000, height: 1000 }, 2).ok).toBe(false);
  expect(pngDimensions({ width: 5000, height: 1000 }, 1).ok).toBe(true);
  expect(pngDimensions({ width: 8193, height: 1 }, 1).ok).toBe(false);
  expect(pngDimensions({ width: Infinity, height: 1 }, 1).ok).toBe(false);
});

test("PE-37 sanitizes filenames and enforces both portable base length limits", () => {
  expect(exportFilename("CON.svg.svg", "svg")).toBe("_CON.svg");
  expect(exportFilename("../漢字<💡>: .", "png")).toBe(".. 漢字 💡.png");
  expect(exportFilename("  LPT1 .draft.png. ", "png")).toBe("_LPT1 .draft.png");
  expect(exportFilename("/\\\u0000:", "json")).toBe("Untitled diagram.json");
  expect(exportFilename("a".repeat(101), "svg")).toBe(`${"a".repeat(100)}.svg`);
  expect(exportFilename("💡".repeat(51), "png")).toBe(`${"💡".repeat(50)}.png`);
});
