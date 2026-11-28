import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { expect, firefox, test, type Page, type TestInfo } from "@playwright/test";
import type { PortableDiagram } from "../../src/core/contracts";
import { makeComponent } from "../../src/core/component-edits";
import { componentRegistry } from "../../src/core/registry";
import architecture from "../fixtures/templates/DGS-06_Template_IT_Architecture_v1.json";
import flowchart from "../fixtures/templates/DGS-06_Template_Basic_Flowchart_v1.json";
import sample from "../fixtures/schema/DGS-05_Example_Architecture_v1.json";
import benchmark from "../fixtures/benchmark/DGS-10_Reference_Benchmark_100N_150E_v1.json";

test.use({ viewport: { width: 1500, height: 1000 } });
const pick = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const main = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const library = (page: Page) => page.getByRole("link", { name: "Back to diagram library" });
const nodes = (page: Page) => page.locator(".projection .diagram-node");
const edges = (page: Page) => page.locator(".connection-line");
const groups = (page: Page) => page.locator(".projection .diagram-frame");
const exportDialog = (page: Page) => page.getByRole("dialog", { name: "Export diagram" });

async function create(page: Page, start: "Blank diagram" | "Basic process flowchart" | "IT architecture") {
  await pick(page, "New diagram").click();
  await page.getByRole("radio", { name: start, exact: true }).check();
  await pick(page, "Create diagram").click();
  await expect(main(page)).toBeVisible();
}

async function collect(page: Page, info: TestInfo, artifact: string) {
  const incoming = page.waitForEvent("download");
  await exportDialog(page).getByRole("button", { name: "Download", exact: true }).click();
  const download = await incoming;
  expect(await download.failure()).toBeNull();
  const path = info.outputPath(artifact);
  await download.saveAs(path);
  return { bytes: await readFile(path), filename: download.suggestedFilename(), path };
}

async function send(page: Page, info: TestInfo, format: "svg" | "png" | "json", artifact: string, filename = artifact) {
  await pick(page, "Export").click();
  const modal = exportDialog(page);
  await modal.getByLabel("Format").selectOption(format);
  await modal.getByLabel("Filename").fill(filename);
  const result = await collect(page, info, artifact);
  await expect(modal.getByRole("status")).toContainText("Download started");
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  return result;
}

function sizeOfPng(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function semantics(value: PortableDiagram) {
  const { document, viewport } = value;
  const ids = new Map([...document.nodes, ...document.groups, ...document.edges].map(({ id }, i) => [id, i]));
  const placed = <T extends typeof document.nodes[number] | typeof document.groups[number]>(item: T) => ({
    ...item, id: ids.get(item.id), parentId: item.parentId === null ? null : ids.get(item.parentId),
  });
  return { viewport, title: document.title, category: document.category, settings: document.settings,
    nodes: document.nodes.map(placed), groups: document.groups.map(placed), edges: document.edges.map((edge) => ({
      ...edge, id: ids.get(edge.id), source: { ...edge.source, nodeId: ids.get(edge.source.nodeId) },
      target: { ...edge.target, nodeId: ids.get(edge.target.nodeId) },
    })) };
}

function identifiers({ document }: PortableDiagram) {
  return [document.id, ...document.nodes.map(({ id }) => id),
    ...document.groups.map(({ id }) => id), ...document.edges.map(({ id }) => id)];
}

async function importBytes(page: Page, bytes: Buffer) {
  await pick(page, "Import JSON").click();
  const dialog = page.getByRole("dialog", { name: "Import JSON" });
  await dialog.getByLabel("JSON file").setInputFiles({ name: "diagram.json", mimeType: "application/json", buffer: bytes });
  await dialog.getByRole("button", { name: "Import diagram", exact: true }).click();
  await expect(main(page)).toBeVisible();
}

test("UX-02 / CL-22 validates both immutable starter fixtures using the production browser metrics", async ({ page }, info) => {
  await page.goto("/");
  await pick(page, "New diagram").click();
  const dialog = page.getByRole("dialog", { name: "New diagram" });
  await expect(dialog.getByRole("radio", { name: "Blank diagram" })).toBeChecked();
  await expect(dialog.getByRole("radio", { name: "Basic process flowchart" })).toBeVisible();
  await expect(dialog.getByRole("radio", { name: "IT architecture" })).toBeVisible();
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("template-selection.png") });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("No diagrams yet")).toBeVisible();
  const rejected: string[] = [];
  for (const [name, fixture] of [["Basic process flowchart", flowchart], ["IT architecture", architecture]] as const) {
    await pick(page, "New diagram").click();
    await dialog.getByRole("radio", { name }).check();
    await expect(dialog.getByRole("textbox", { name: "Diagram name" })).toHaveValue(name);
    await pick(page, "Create diagram").click();
    const outcome = dialog.getByRole("alert").or(page.getByRole("heading", { name, exact: true }));
    await expect(outcome).toBeVisible();
    const alert = await dialog.getByRole("alert").textContent({ timeout: 100 }).catch(() => null);
    if (alert) {
      console.log(`${info.project.name} ${name}: ${alert}`);
      if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath(`template-rejected-${fixture.document.category}.png`) });
      rejected.push(`${name}: ${alert}`);
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      continue;
    }
    await expect(nodes(page)).toHaveCount(fixture.document.nodes.length);
    await expect(edges(page)).toHaveCount(fixture.document.edges.length);
    await expect(groups(page)).toHaveCount(fixture.document.groups.length);
    const initial = JSON.parse((await send(page, info, "json", `initial-${fixture.document.category}.json`)).bytes.toString()) as PortableDiagram;
    const expected = structuredClone(fixture) as PortableDiagram;
    expect(semantics(initial)).toEqual(semantics({ document: { ...expected.document, title: name }, viewport: initial.viewport }));
    expect(identifiers(initial).some((id) => identifiers(expected).includes(id))).toBe(false);
    await pick(page, "Insert Process").click();
    await page.getByRole("button", { name: `Duplicate diagram ${name}` }).click();
    await page.getByRole("dialog", { name: "Duplicate diagram" }).getByRole("button", { name: "Duplicate diagram", exact: true }).click();
    await expect(page.getByText("Independent copy created in the diagram library.")).toBeVisible();
    await library(page).click();
    await expect(page.getByRole("link", { name: `${name} (copy)`, exact: true })).toBeVisible();
    await pick(page, "New diagram").click();
    await dialog.getByRole("radio", { name }).check();
    await dialog.getByRole("textbox", { name: "Diagram name" }).fill(`Fresh ${name}`);
    await pick(page, "Create diagram").click();
    await expect(page.getByRole("heading", { name: `Fresh ${name}`, exact: true })).toBeVisible();
    await expect(nodes(page)).toHaveCount(fixture.document.nodes.length);
    await expect(edges(page)).toHaveCount(fixture.document.edges.length);
    const fresh = JSON.parse((await send(page, info, "json", `fresh-${fixture.document.category}.json`)).bytes.toString()) as PortableDiagram;
    expect(semantics(fresh)).toEqual(semantics({ document: { ...initial.document, title: `Fresh ${name}` }, viewport: fresh.viewport }));
    expect(identifiers(fresh).some((id) => identifiers(initial).includes(id))).toBe(false);
    await library(page).click();
  }
  await create(page, "Blank diagram");
  const empty = await send(page, info, "json", "empty-roundtrip.json");
  await library(page).click();
  await importBytes(page, empty.bytes);
  const reopened = JSON.parse((await send(page, info, "json", "empty-reimport.json")).bytes.toString()) as PortableDiagram;
  const opened = JSON.parse(empty.bytes.toString()) as PortableDiagram;
  expect(semantics(reopened)).toEqual(semantics(opened));
  expect(reopened.document.id).not.toBe(opened.document.id);
  await expect(nodes(page)).toHaveCount(0);
  expect(rejected, "Original template fixtures must pass measured production validation").toEqual([]);
});

test("PE-23/24/26 native import validates original fixtures, rejects unsafe input and cancels before creating a row", async ({ page }, info) => {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Import JSON" });
  const file = dialog.getByLabel("JSON file");
  const submit = dialog.getByRole("button", { name: "Import diagram", exact: true });
  const select = (buffer: Buffer) => file.setInputFiles({ name: "diagram.json", mimeType: "application/json", buffer });
  await pick(page, "Import JSON").click();
  await select(Buffer.from('{"document":{},"\\u0064ocument":{}}'));
  await expect(dialog.getByRole("alert")).toContainText("DUPLICATE_KEY");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("import-validation.png") });
  await expect(submit).toBeDisabled();
  await select(Buffer.from('{"nested":[{"__proto__":{}}]}'));
  await expect(dialog.getByRole("alert")).toContainText("UNSAFE_KEY");
  await select(Buffer.from([0xc0, 0xaf]));
  await expect(dialog.getByRole("alert")).toContainText("INVALID_UTF8");
  await select(Buffer.from(JSON.stringify(flowchart)));
  await expect(submit).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("No diagrams yet")).toBeVisible();
  for (const fixture of [flowchart, architecture, sample, benchmark]) {
    await pick(page, "Import JSON").click();
    await select(Buffer.from(JSON.stringify(fixture)));
    await expect(submit, fixture.document.title).toBeEnabled();
    await submit.click();
    await expect(main(page)).toBeVisible();
    await expect(nodes(page)).toHaveCount(fixture.document.nodes.length);
    await expect(edges(page)).toHaveCount(fixture.document.edges.length);
    const id = new URL(page.url()).searchParams.get("id");
    expect(id).not.toBe(fixture.document.id);
    await expect(page.locator(`.react-flow__node[data-id="${fixture.document.nodes[0].id}"]`)).toHaveCount(0);
    const saved = await send(page, info, "json", `roundtrip-${fixture.document.id}.json`);
    const exported = JSON.parse(saved.bytes.toString("utf8")) as PortableDiagram;
    expect(exported.document.id).toBe(id);
    const expected = structuredClone(fixture) as PortableDiagram;
    // The editor fits a null viewport on first open. Export captures that current view.
    if (!expected.viewport) expected.viewport = exported.viewport;
    expect(semantics(exported)).toEqual(semantics(expected));
    await library(page).click();
    await importBytes(page, saved.bytes);
    const again = JSON.parse((await send(page, info, "json", `reimport-${fixture.document.id}.json`)).bytes.toString()) as PortableDiagram;
    expect(semantics(again)).toEqual(semantics(exported));
    expect(again.document.id).not.toBe(exported.document.id);
    await library(page).click();
  }
});

test("UX-14 / PE-29–38 downloads both templates as editable JSON, standalone SVG and real PNG", async ({ page }, info) => {
  test.setTimeout(90_000);
  await page.goto("/");
  for (const [name, stem] of [["Basic process flowchart", "flowchart"], ["IT architecture", "architecture"]] as const) {
    await create(page, name);
    const item = nodes(page).first();
    const id = (await item.locator("..").getAttribute("data-id"))!;
    const picker = page.getByRole("combobox", { name: "Find an object" });
    await picker.selectOption(id);
    const label = page.getByRole("textbox", { name: "Label", exact: true });
    const value = stem === "flowchart" ? "Début & <entrée>" : "利用者 & <service>";
    await label.fill(value);
    await label.press("Control+Enter");
    await expect(label).toHaveValue(value);
    const x = page.getByRole("textbox", { name: "X", exact: true });
    await x.fill("-170");
    await x.press("Enter");
    await expect(x).toHaveValue("-170");
    await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
    await pick(page, "Fit diagram").click();
    if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath(`completed-${stem}.png`) });

    const json = await send(page, info, "json", `export-${stem}.json`);
    const source = JSON.parse(json.bytes.toString("utf8")) as PortableDiagram;
    expect(Object.keys(source)).toEqual(["document", "viewport"]);
    expect(source.document.nodes.find((node) => node.id === id)?.label).toBe(value);
    const svg = await send(page, info, "svg", `export-${stem}.svg`, stem === "flowchart" ? "CON.svg.svg" : `export-${stem}.svg`);
    expect(svg.filename).toBe(stem === "flowchart" ? "_CON.svg" : "export-architecture.svg");
    const markup = svg.bytes.toString("utf8");
    expect(markup).toContain("&amp;");
    expect(markup).toContain("&lt;");
    expect(markup).not.toMatch(/<image|<script|foreignObject|href=|class=|onload=/);
    const bounds = await page.evaluate((source) => {
      const doc = new DOMParser().parseFromString(source, "image/svg+xml");
      return { xmlns: doc.documentElement.namespaceURI, parsed: !doc.querySelector("parsererror"),
        view: doc.documentElement.getAttribute("viewBox")?.split(" ").map(Number),
        edges: doc.querySelectorAll("polyline").length, arrows: doc.querySelectorAll("polygon").length,
        text: [...doc.querySelectorAll("tspan")].map((node) => node.textContent).join(" ") };
    }, markup);
    expect(bounds).toMatchObject({ xmlns: "http://www.w3.org/2000/svg", parsed: true, edges: source.document.edges.length });
    expect(bounds.view![0]).toBeLessThanOrEqual(-202);
    expect(bounds.text).toContain(value.split(" ")[0]);
    expect(bounds.arrows).toBeGreaterThan(0);

    await pick(page, "Zoom out").click();
    const canvas = (await main(page).boundingBox())!;
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
    await page.mouse.wheel(61, 43);
    const translated = await send(page, info, "svg", `shifted-${stem}.svg`);
    expect(translated.bytes.equals(svg.bytes)).toBe(true);

    await pick(page, "Export").click();
    const modal = exportDialog(page);
    await expect(modal.getByLabel("Format")).toHaveValue("png");
    await expect(modal.getByLabel("Scale")).toHaveValue("2");
    if (info.project.name === "chrome" && stem === "architecture") await page.screenshot({ path: info.outputPath("export-dialog.png") });
    const png = await collect(page, info, `export-${stem}.png`);
    expect(sizeOfPng(png.bytes)).toEqual(bounds.view!.slice(2).map((n) => n * 2));
    const paint = await page.evaluate(async (bytes) => {
      const image = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: "image/png" }));
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      image.close();
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0, nearBorder = 0;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const offset = 4 * (y * canvas.width + x);
          if (rgba[offset] < 250 || rgba[offset + 1] < 250 || rgba[offset + 2] < 250) {
            ink++;
            if (x < 45 || y < 45 || x >= canvas.width - 45 || y >= canvas.height - 45) nearBorder++;
          }
        }
      }
      return { corner: Array.from(rgba.slice(0, 4)), ink, nearBorder };
    }, [...png.bytes]);
    expect(paint.corner).toEqual([255, 255, 255, 255]);
    expect(paint.ink).toBeGreaterThan(1000);
    expect(paint.nearBorder).toBe(0);
    await modal.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();

    if (info.project.name === "chrome" && stem === "architecture") {
      const independent = await firefox.launch({ channel: undefined, headless: true });
      try {
        const viewer = await independent.newPage({ viewport: { width: 1300, height: 950 } });
        const remote: string[] = [];
        viewer.on("request", (request) => { if (request.url().startsWith("http")) remote.push(request.url()); });
        await viewer.goto(pathToFileURL(svg.path).href);
        const rendered = await viewer.locator("svg").evaluate((root) => {
          const view = (root as SVGSVGElement).viewBox.baseVal;
          return Array.from(root.querySelectorAll("text")).every((text) => {
            const box = text.getBBox(), matrix = text.getCTM()!;
            const [a, b] = [new DOMPoint(box.x, box.y), new DOMPoint(box.x + box.width, box.y + box.height)]
              .map((point) => point.matrixTransform(matrix));
            return a.x >= 0 && a.y >= 0 && b.x <= view.width && b.y <= view.height;
          });
        });
        expect(rendered).toBe(true);
        const shapesFit = await viewer.locator("svg").evaluate((root) =>
          [...root.querySelectorAll(":scope > g > text")].filter((text) => text.parentElement?.firstElementChild?.tagName === "rect")
            .every((text) => {
              const box = (text as SVGTextElement).getBBox();
              const shape = (text.parentElement!.firstElementChild as SVGRectElement).getBBox();
              return box.x >= shape.x && box.y >= shape.y &&
                box.x + box.width <= shape.x + shape.width && box.y + box.height <= shape.y + shape.height;
            }));
        expect(shapesFit).toBe(true);
        await expect(viewer.locator("svg")).toContainText("Public application");
        expect(remote).toEqual([]);
        await viewer.screenshot({ path: info.outputPath("firefox-standalone.png") });
        await viewer.goto(pathToFileURL(png.path).href);
        expect(await viewer.locator("img").evaluate((image) => [(image as HTMLImageElement).naturalWidth, (image as HTMLImageElement).naturalHeight]))
          .toEqual(sizeOfPng(png.bytes));
        console.log(`Independent standalone Firefox ${independent.version()}`);
      } finally { await independent.close(); }
    }

    await library(page).click();
    await importBytes(page, json.bytes);
    const copy = JSON.parse((await send(page, info, "json", `imported-${stem}.json`)).bytes.toString("utf8")) as PortableDiagram;
    expect(semantics(copy)).toEqual(semantics(source));
    const originalIds = new Set(identifiers(source));
    expect(identifiers(copy).some((id) => originalIds.has(id))).toBe(false);
    await pick(page, "Insert Process").click();
    await expect(nodes(page)).toHaveCount(source.document.nodes.length + 1);
    await page.getByRole("button", { name: `Delete diagram ${name}` }).click();
    await page.getByRole("dialog", { name: "Delete diagram" }).getByRole("button", { name: "Delete diagram", exact: true }).click();
    await page.getByRole("link", { name, exact: true }).click();
    await expect(nodes(page)).toHaveCount(source.document.nodes.length);
    await expect(edges(page)).toHaveCount(source.document.edges.length);
    await library(page).click();
  }
});

test("CL-18/19 / PE-31 all production registry types share SVG and PNG paint", async ({ page }, info) => {
  test.setTimeout(60_000);
  const fixture = structuredClone(architecture) as PortableDiagram;
  fixture.document.title = "Registry export coverage";
  const types = new Set([...fixture.document.nodes, ...fixture.document.groups].map(({ type }) => type));
  for (const [i, component] of componentRegistry.components.entries()) {
    if (types.has(component.type)) continue;
    const item = makeComponent(component.type, `7b9bad71-a058-4a17-8139-${String(i + 1).padStart(12, "0")}`,
      { x: -1800 + (i % 7) * 215, y: Math.floor(i / 7) * 155 });
    if (item.type === "general.boundary") fixture.document.groups.push(item);
    else {
      if (item.type === "general.rectangle") { item.size = { ...component.minSize }; item.label = ""; item.style.strokeWidth = 8; }
      if (item.type === "general.text") item.label = "Zero-stroke annotation";
      fixture.document.nodes.push(item);
    }
  }
  for (const [i, status] of (["not_specified", "pending", "in_progress", "completed"] as const).entries()) fixture.document.nodes[i].status = status;
  for (const [i, arrows] of (["none", "forward", "both"] as const).entries()) {
    Object.assign(fixture.document.edges[i], { arrows, route: i === 0 ? "straight" : "orthogonal", label: `Mode ${arrows}` });
  }
  fixture.document.edges[0].style.strokeStyle = "dashed";
  await page.goto("/");
  await importBytes(page, Buffer.from(JSON.stringify(fixture)));
  await page.reload();
  await expect(main(page)).toBeVisible();
  expect(await page.locator(".projection [data-component]").evaluateAll((items) => new Set(items.map((item) => item.getAttribute("data-component"))).size)).toBe(29);
  const routes = await edges(page).evaluateAll((items) => items.map((item) =>
    [item.getAttribute("points"), item.getAttribute("stroke-dasharray")]));
  const marks = await page.locator("[data-edge-arrow]").count();
  const svg = await send(page, info, "svg", "catalog.svg");
  await pick(page, "Export").click();
  await exportDialog(page).getByLabel("Scale").selectOption("1");
  const png = await collect(page, info, "catalog.png");
  const pixels = await page.evaluate(async ({ svg, png, routes, marks }) => {
    const documentSvg = new DOMParser().parseFromString(svg, "image/svg+xml");
    const lines = [...documentSvg.querySelectorAll("polyline")].map((item) =>
      [item.getAttribute("points"), item.getAttribute("stroke-dasharray")]);
    if (JSON.stringify(lines) !== JSON.stringify(routes) || documentSvg.querySelectorAll("polygon").length !== marks) return -1;
    const pngImage = await createImageBitmap(new Blob([new Uint8Array(png)], { type: "image/png" }));
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const svgImage = new Image();
      svgImage.src = url;
      await svgImage.decode();
      const canvas = document.createElement("canvas");
      canvas.width = svgImage.naturalWidth;
      canvas.height = svgImage.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(svgImage, 0, 0);
      const before = context.getImageData(0, 0, canvas.width, canvas.height).data;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(pngImage, 0, 0);
      const after = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let mismatch = 0;
      for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) mismatch++;
      return mismatch;
    } finally { URL.revokeObjectURL(url); pngImage.close(); }
  }, { svg: svg.bytes.toString(), png: [...png.bytes], routes, marks });
  expect(pixels).toBe(0);
});

test("PE-34/36 reports explicit 1× fallback and produces the same PNG at different device pixel ratios", async ({ page, browser, baseURL }, info) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await create(page, "Blank diagram");
  await pick(page, "Export").click();
  const modal = exportDialog(page);
  await expect(modal.getByRole("alert")).toContainText("no visible content");
  await expect(modal.getByRole("button", { name: "Download" })).toBeDisabled();
  await modal.getByLabel("Format").selectOption("json");
  const empty = await collect(page, info, "empty.json");
  expect((JSON.parse(empty.bytes.toString()) as PortableDiagram).document.nodes).toEqual([]);
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await pick(page, "Insert Process").click();
  await pick(page, "Insert Decision").click();
  const x = page.getByRole("textbox", { name: "X", exact: true });
  await x.fill("4800");
  await x.press("Enter");
  await expect(x).toHaveValue("4800");
  await pick(page, "Export").click();
  await expect(modal.getByRole("button", { name: "Use 1×" })).toBeVisible();
  await expect(modal.getByRole("button", { name: "Download" })).toBeDisabled();
  await modal.getByRole("button", { name: "Use 1×" }).click();
  const small = await collect(page, info, "wide-1x.png");
  const dims = sizeOfPng(small.bytes);
  expect(dims[0]).toBeGreaterThan(4096);
  expect(dims[0]).toBeLessThanOrEqual(8192);
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  const portable = await send(page, info, "json", "wide.json");
  const present = await page.evaluate(() => devicePixelRatio);
  const highDpi = await browser.newContext({ baseURL, deviceScaleFactor: present === 1 ? 2 : 1, viewport: { width: 1500, height: 1000 } });
  try {
    const different = await highDpi.newPage();
    await different.goto("/");
    await importBytes(different, portable.bytes);
    expect(await different.evaluate(() => devicePixelRatio)).not.toBe(present);
    await pick(different, "Export").click();
    await exportDialog(different).getByRole("button", { name: "Use 1×" }).click();
    const other = await collect(different, info, "wide-other-dpi.png");
    expect(sizeOfPng(other.bytes)).toEqual(dims);
    expect(other.bytes.equals(small.bytes)).toBe(true);
  } finally { await highDpi.close(); }

  await x.fill("9500");
  await x.press("Enter");
  await pick(page, "Export").click();
  await expect(modal.getByText("Choose SVG or editable JSON to export this diagram.")).toBeVisible();
  await expect(modal.getByRole("button", { name: "Use 1×" })).toHaveCount(0);
  await expect(modal.getByRole("button", { name: "Download" })).toBeDisabled();
  await modal.getByLabel("Format").selectOption("svg");
  await expect(modal.getByRole("button", { name: "Download" })).toBeEnabled();
});

test("PE-28/35 retains the captured graph and keeps one native allocation while cancelled work settles", async ({ page }, info) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      if (document.documentElement.dataset.holdPng !== "true") return original.call(this, callback, type, quality);
      document.documentElement.dataset.encoderWaiting = "true";
      window.addEventListener("phase10-end-encode", () => callback(new Blob(["obsolete"], { type: "image/png" })), { once: true });
    };
  });
  await page.goto("/");
  await create(page, "Blank diagram");
  await pick(page, "Insert Process").click();
  const label = page.getByRole("textbox", { name: "Label", exact: true });
  await label.fill("Invalid\uffff");
  await pick(page, "Export").click();
  await expect(label).toBeFocused();
  await expect(exportDialog(page)).toHaveCount(0);
  await label.fill("Draft committed before capture");
  await pick(page, "Export").click();
  const modal = exportDialog(page);
  await page.evaluate(() => {
    [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.getAttribute("aria-label") === "Insert Decision")?.click();
  });
  await expect(nodes(page)).toHaveCount(2);
  await modal.getByLabel("Format").selectOption("json");
  const captured = await collect(page, info, "captured-before-edit.json");
  const oldGraph = (JSON.parse(captured.bytes.toString()) as PortableDiagram).document.nodes;
  expect(oldGraph).toHaveLength(1);
  expect(oldGraph[0].label).toBe("Draft committed before capture");
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  const id = new URL(page.url()).searchParams.get("id");
  const decision = page.locator('.projection [data-component="flow.decision"]');
  const decisionId = (await decision.locator("..").getAttribute("data-id"))!;
  await page.getByRole("combobox", { name: "Find an object" }).selectOption(decisionId);
  const x = page.getByRole("textbox", { name: "X", exact: true });
  await x.fill("60");
  await x.press("Enter");
  await expect(x).toHaveValue("60");
  const box = (await nodes(page).first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 + 64, { steps: 6 });
  await expect.poll(async () => (await nodes(page).first().boundingBox())!.x).toBeGreaterThan(box.x);
  await page.evaluate(() => document.querySelector<HTMLButtonElement>('button[title="Export diagram"]')!.click());
  await page.mouse.up();
  await expect(modal).toBeVisible();
  await modal.getByLabel("Format").selectOption("json");
  const noGesture = await collect(page, info, "capture-with-cancelled-gesture.json");
  const stable = (JSON.parse(noGesture.bytes.toString()) as PortableDiagram).document.nodes;
  expect(stable[0].position).toEqual(oldGraph[0].position);
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  await page.evaluate(() => { document.documentElement.dataset.holdPng = "true"; });
  let downloads = 0;
  page.on("download", () => { downloads++; });
  await pick(page, "Export").click();
  await modal.getByRole("button", { name: "Download" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-encoder-waiting", "true");
  await modal.getByRole("button", { name: "Cancel export" }).click();
  await expect(modal.getByRole("alert")).toContainText("Export cancelled");
  await modal.getByRole("button", { name: "Download" }).click();
  await expect(modal.getByRole("alert")).toContainText("previous visual export");
  await page.evaluate(() => {
    document.documentElement.dataset.holdPng = "";
    window.dispatchEvent(new Event("phase10-end-encode"));
  });
  await modal.getByRole("button", { name: "Download" }).click();
  await expect(modal.getByRole("status")).toContainText("Download started");
  expect(downloads).toBe(1);
  await modal.getByRole("button", { name: "Close", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("id")).toBe(id);
  await expect(nodes(page)).toHaveCount(2);
});

test("PE-06/25/27 import rollback retains existing documents and export needs no accessible database", async ({ page, baseURL }, info) => {
  const remote: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== baseURL) remote.push(url.origin);
  });
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value, key) {
      if (this.name === "viewports" && document.documentElement.dataset.rejectImport === "true") {
        throw new DOMException("Injected import view write failure", "AbortError");
      }
      return key === undefined ? original.call(this, value) : original.call(this, value, key);
    };
  });
  await page.goto("/");
  await create(page, "Basic process flowchart");
  await library(page).click();
  const active = page.getByRole("link", { name: "Basic process flowchart", exact: true });
  await expect(active).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.rejectImport = "true"; });
  const candidate = { ...sample, viewport: { x: 45, y: 27, zoom: .9 } };
  await pick(page, "Import JSON").click();
  const modal = page.getByRole("dialog", { name: "Import JSON" });
  const src = (value: unknown) => modal.getByLabel("JSON file").setInputFiles({
    name: "diagram.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)),
  });
  await src({ ...candidate, document: { ...candidate.document, schemaVersion: 2 } });
  await expect(modal.getByRole("alert")).toContainText("UNSUPPORTED_VERSION");
  const unsupportedAsset = { ...candidate, document: { ...candidate.document, imageUrl: "https://invalid.example/asset.svg" } };
  await src(unsupportedAsset);
  await expect(modal.getByRole("alert")).toContainText("UNSUPPORTED_DATA");
  const duplicate = structuredClone(candidate);
  duplicate.document.nodes[1].id = duplicate.document.nodes[0].id;
  await src(duplicate);
  await expect(modal.getByRole("alert")).toContainText("DUPLICATE_ID");
  const dangling = structuredClone(candidate);
  dangling.document.edges[0].source.nodeId = "46ffa334-84b7-48f8-9bfd-6ccf057d779a";
  await src(dangling);
  await expect(modal.getByRole("alert")).toContainText("INVALID_ENDPOINT");
  const cycle = structuredClone(candidate);
  cycle.document.groups[0].parentId = cycle.document.groups[0].id;
  await src(cycle);
  await expect(modal.getByRole("alert")).toContainText("GROUP_CYCLE");
  await modal.getByLabel("JSON file").setInputFiles({ name: "broken.json", mimeType: "application/json", buffer: Buffer.from("[}") });
  await expect(modal.getByRole("alert")).toContainText("INVALID_JSON");
  await expect(modal.getByRole("button", { name: "Import diagram", exact: true })).toBeDisabled();
  await src(candidate);
  await modal.getByRole("button", { name: "Import diagram", exact: true }).click();
  await expect(modal.getByRole("alert")).toContainText("transaction was aborted");
  await modal.getByRole("button", { name: "Cancel" }).click();
  await expect(page.locator(".table-scroll tbody tr")).toHaveCount(1);
  await page.evaluate(() => { document.documentElement.dataset.rejectImport = ""; });
  await pick(page, "Import JSON").click();
  await src(candidate);
  await expect(modal.getByRole("button", { name: "Import diagram", exact: true })).toBeEnabled();
  await modal.locator("form").evaluate((form) => {
    for (let i = 0; i < 2; i++) form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await expect(main(page)).toBeVisible();
  await library(page).click();
  await expect(page.locator(".table-scroll tbody tr")).toHaveCount(2);
  await active.click();
  await expect(nodes(page)).toHaveCount(6);
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const open = indexedDB.open("diagramming-system", 20);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => { open.result.close(); resolve(); };
  }));
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  await pick(page, "Insert Process").click();
  const latest = await send(page, info, "json", "no-storage.json");
  expect((JSON.parse(latest.bytes.toString()) as PortableDiagram).document.nodes).toHaveLength(7);
  expect((await send(page, info, "svg", "no-storage.svg")).bytes.toString()).toContain("<svg");
  expect(sizeOfPng((await send(page, info, "png", "no-storage.png")).bytes)[0]).toBeGreaterThan(100);
  await expect(page.getByText("Save failed", { exact: true })).toBeVisible();
  expect(remote).toEqual([]);
});
