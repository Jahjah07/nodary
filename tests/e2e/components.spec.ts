import { expect, test, type Page } from "@playwright/test";
import { componentRegistry, componentFor, type Component } from "../../src/core/registry";

test.use({ viewport: { width: 1520, height: 1100 } });
const surface = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const tile = (page: Page, type: Component["type"]) => page.getByRole("button", { name: `Insert ${componentFor(type).displayName}`, exact: true });
const component = (page: Page, type: Component["type"]) => page.locator(`.projection [data-component="${type}"]`);
const properties = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const controls = (page: Page) => page.getByRole("group", { name: "Viewport controls" });
const position = (page: Page) => properties(page).getByText("World position", { exact: true }).locator("..").locator("dd");
const size = (page: Page) => properties(page).getByText("Size", { exact: true }).locator("..").locator("dd");
async function open(page: Page, name = "Component verification", alreadyAtLibrary = false) {
  if (!alreadyAtLibrary) await page.goto("/");
  await page.getByRole("button", { name: "New diagram" }).click();
  const dialog = page.getByRole("dialog", { name: "New diagram" });
  await dialog.getByRole("textbox", { name: "Diagram name" }).fill(name);
  await dialog.getByRole("button", { name: "Create diagram" }).click();
  await expect(surface(page)).toBeVisible();
}

async function drag(page: Page, type: Component["type"], x: number, y: number) {
  const source = tile(page, type);
  await expect(source).toBeEnabled();
  await source.scrollIntoViewIfNeeded();
  const start = (await source.boundingBox())!;
  const clientX = Math.floor(start.x + start.width / 2), clientY = Math.floor(start.y + start.height / 2);
  await page.mouse.move(clientX, clientY);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
  await page.mouse.move(x, y);
  await page.mouse.up();
  return { x: (clientX - start.x) / start.width, y: (clientY - start.y) / start.height };
}

async function world(page: Page, clientX: number, clientY: number) {
  const canvas = (await surface(page).boundingBox())!;
  const view = await page.locator(".react-flow__viewport").evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { x: matrix.e, y: matrix.f, zoom: matrix.a };
  });
  return { x: (clientX - canvas.x - view.x) / view.zoom, y: (clientY - canvas.y - view.y) / view.zoom };
}
const center = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
async function move(page: Page, from: { x: number; y: number }, dx: number, dy: number, cancel = false) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 5 });
  if (cancel) await page.keyboard.press("Escape");
  await page.mouse.up();
}

test("CL-01/02/04/26 full registry renders and keyboard inserts offline", async ({ page, baseURL, browser }, info) => {
  test.setTimeout(90_000);
  const outside: string[] = [];
  const errors: string[] = [];
  const loaded = new Set<string>();
  page.on("requestfinished", (request) => loaded.add(request.url()));
  page.on("request", (request) => { if (new URL(request.url()).origin !== baseURL) outside.push(request.url()); });
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page, "Component library");
  const palette = page.getByRole("complementary", { name: "Component library" });
  for (const [category, count] of [["Flowchart", 8], ["Architecture", 14], ["General", 7]] as const) {
    await expect(palette.getByRole("region", { name: category }).getByRole("button")).toHaveCount(count);
  }
  // Installed browser channels request the tab icon. The bundled headless shell skips it.
  if (info.project.name !== "chromium") {
    const favicon = await page.locator('link[rel="icon"]').evaluate((link) => (link as HTMLLinkElement).href);
    await expect.poll(() => loaded.has(favicon)).toBe(true);
  }
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.context().setOffline(true);
  for (const [index, definition] of componentRegistry.components.entries()) {
    if (index === 16) await page.mouse.move(770, 650).then(() => page.mouse.wheel(-300, 0));
    const button = tile(page, definition.type);
    await expect(button).toBeEnabled();
    await button.focus();
    await page.keyboard.press("Enter");
    const output = component(page, definition.type);
    await expect(output).toBeVisible();
    await expect(output).toHaveAttribute("data-selected", "true");
    await expect(output).toHaveAttribute("data-label-fits", "true");
    await expect(surface(page)).toBeFocused();
    await expect(size(page)).toHaveText(`${definition.defaultSize.width} × ${definition.defaultSize.height}`);
    const label = definition.entity === "node" ? output.locator(".diagram-label") :
      page.locator(`[data-frame-id="${await output.locator("..").getAttribute("data-id")}"] .frame-title`);
    await expect(label).toHaveText(definition.entity === "node" ? definition.defaultLabel : definition.defaultTitle);
    if (definition.iconKey) {
      const vector = output.locator(`[data-icon="${definition.iconKey}"]`);
      await expect(vector).toHaveCount(1);
      expect(await vector.locator("*").count()).toBeGreaterThan(0);
    }
    await expect(output.locator("..").locator(".projection-port")).toHaveCount(definition.allowedHandles.length);
  }
  await expect(page.locator(".editor-status")).toContainText("28 nodes · 0 edges · 1 boundaries");
  expect(requests).toEqual([]);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
  console.log(`${info.project.name} ${browser.version()}: 29 keyboard insertions offline, 104 ports, 14 icons`);
  if (info.project.name === "chrome") {
    await page.setViewportSize({ width: 1520, height: 1560 });
    const panel = palette.locator(".panel-scroll");
    await panel.evaluate((el) => { el.scrollTop = 0; });
    const inventory = await panel.evaluate((el) => ({ visible: el.clientHeight, total: el.scrollHeight }));
    expect(inventory.visible).toBeGreaterThanOrEqual(inventory.total);
    await page.screenshot({ path: info.outputPath("palette.png") });
  }
});

test("CI-05 drag uses world coordinates at two zooms, independent snap, and rejects outside drop", async ({ page }) => {
  await open(page);
  const box = (await surface(page).boundingBox())!;
  await tile(page, "flow.process").click();
  await expect(position(page)).toHaveText(`${box.width / 2 - 80}, ${box.height / 2 - 32}`);
  const rectangleHotspot = await drag(page, "general.rectangle", box.x + 210, box.y + 235);
  await expect.poll(async () => Number((await position(page).textContent())!.split(", ")[0])).toBeCloseTo(210 - 160 * rectangleHotspot.x, 6);
  await expect.poll(async () => Number((await position(page).textContent())!.split(", ")[1])).toBeCloseTo(235 - 64 * rectangleHotspot.y, 6);
  await controls(page).getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await page.getByRole("button", { name: "Snap", exact: true }).click();
  await expect(page.locator(".canvas-grid")).toHaveCount(0);
  const x = Math.floor(box.x + box.width * .63), y = Math.floor(box.y + box.height * .63);
  const expected = await world(page, x, y);
  const snap = (value: number) => 20 * Math.floor(value / 20 + .5);
  const serverHotspot = await drag(page, "arch.server", x, y);
  await expect(position(page)).toHaveText(`${snap(expected.x - 180 * serverHotspot.x)}, ${snap(expected.y - 80 * serverHotspot.y)}`);
  await expect(component(page, "arch.server")).toHaveAttribute("data-selected", "true");
  await drag(page, "arch.database", box.x + box.width + 80, box.y + 220);
  await expect(component(page, "arch.database")).toHaveCount(0);
  await expect(component(page, "arch.server")).toHaveAttribute("data-selected", "true");
  await expect(page.locator(".drop-preview")).toHaveCount(0);
});

test("CI-10/11/12/13 and UX-05 move, preview, cancel, nudge and resize", async ({ page }, info) => {
  await open(page, "Manipulation evidence");
  const box = (await surface(page).boundingBox())!;
  await drag(page, "flow.process", box.x + 230, box.y + 240);
  await drag(page, "flow.on_page_connector", box.x + 530, box.y + 280);
  const process = component(page, "flow.process");
  const circle = component(page, "flow.on_page_connector");
  const baseline = await process.boundingBox();
  const circleBaseline = await circle.boundingBox();
  const point = center(baseline!);
  await page.keyboard.down("Shift");
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up("Shift");
  await expect(page.locator(".editor-status")).toContainText("2 selected");
  await page.getByRole("button", { name: "Snap", exact: true }).click();
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 53, point.y + 40, { steps: 6 });
  await expect.poll(async () => (await process.boundingBox())!.x).not.toBe(baseline!.x);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect.poll(() => process.boundingBox()).toEqual(baseline);
  await expect.poll(() => circle.boundingBox()).toEqual(circleBaseline);
  await move(page, point, 53, 40);
  const shifted = (await process.boundingBox())!;
  const shiftedCircle = (await circle.boundingBox())!;
  await page.mouse.click(shifted.x + shifted.width / 2, shifted.y + shifted.height / 2);
  await expect(position(page)).toHaveText("200, 240");
  expect(shiftedCircle.x - circleBaseline!.x).toBeCloseTo(shifted.x - baseline!.x, 3);
  expect(shiftedCircle.y - circleBaseline!.y).toBeCloseTo(shifted.y - baseline!.y, 3);
  const onCircle = center(shiftedCircle);
  await page.mouse.click(onCircle.x, onCircle.y);
  await expect(page.locator("[data-resize]")).toHaveCount(4);
  await surface(page).press("ArrowRight");
  await expect.poll(async () => (await circle.boundingBox())!.x).toBe(shiftedCircle.x + 20);
  await page.getByRole("button", { name: "Snap", exact: true }).click();
  await surface(page).press("ArrowLeft");
  await expect.poll(async () => (await circle.boundingBox())!.x).toBe(shiftedCircle.x + 19);
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowUp");
  await page.keyboard.up("ArrowUp");
  await page.keyboard.up("ArrowRight");
  await expect.poll(async () => (await circle.boundingBox())!.x).toBe(shiftedCircle.x + 21);
  await expect.poll(async () => (await circle.boundingBox())!.y).toBe(shiftedCircle.y - 1);
  const initial = (await circle.boundingBox())!;
  const nw = () => page.locator("[data-resize='nw']");
  await move(page, center((await nw().boundingBox())!), -48, 10);
  await expect(size(page)).toHaveText("104 × 104");
  const larger = (await circle.boundingBox())!;
  expect(larger.x + larger.width).toBe(initial.x + initial.width);
  expect(larger.y + larger.height).toBe(initial.y + initial.height);
  await move(page, center((await nw().boundingBox())!), 116, 116);
  await expect(size(page)).toHaveText("104 × 104");
  await expect(page.getByRole("status").filter({ hasText: "resize limits" })).toBeVisible();
  await move(page, center((await nw().boundingBox())!), -30, -30, true);
  await expect(size(page)).toHaveText("104 × 104");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("selected-resized.png") });
  await page.mouse.click(shifted.x + shifted.width / 2, shifted.y + shifted.height / 2);
  await expect(page.locator("[data-resize]")).toHaveCount(8);
  const west = page.locator("[data-resize='w']");
  const north = page.locator("[data-resize='n']");
  await move(page, center((await west.boundingBox())!), -23, 0);
  await expect(size(page)).toHaveText("183 × 64");
  await move(page, center((await north.boundingBox())!), 0, -21);
  await expect(size(page)).toHaveText("183 × 85");
  const extended = (await process.boundingBox())!;
  expect(extended.x + extended.width).toBe(shifted.x + shifted.width);
  expect(extended.y + extended.height).toBe(shifted.y + shifted.height);
});

test("T-04-02 representative categorized scenes show actual shared SVG geometry", async ({ page }, info) => {
  test.setTimeout(90_000);
  const examples = [
    ["flowchart", ["flow.terminator", "flow.process", "flow.decision", "flow.input_output", "flow.document", "flow.data_store", "flow.subprocess", "flow.on_page_connector"]],
    ["architecture", ["arch.user", "arch.device", "arch.website", "arch.application", "arch.server", "arch.database", "arch.cloud", "arch.network", "arch.security"]],
    ["general", ["general.rectangle", "general.rounded_rectangle", "general.ellipse", "general.diamond", "general.text", "general.note", "general.boundary"]],
  ] as const;
  for (const [name, types] of examples) {
    const returning = name !== "flowchart";
    if (returning) {
      await page.getByRole("link", { name: "Back to diagram library" }).click();
      await expect(page.getByRole("button", { name: "New diagram" })).toBeEnabled();
    }
    await open(page, `${name[0].toUpperCase()}${name.slice(1)} components`, returning);
    const box = (await surface(page).boundingBox())!;
    for (const [i, type] of types.entries()) {
      const x = box.x + box.width * (.2 + (i % 3) * .3);
      const y = box.y + 150 + Math.floor(i / 3) * 205;
      await drag(page, type, x, y);
      await expect(component(page, type)).toBeVisible();
    }
    await surface(page).press("Escape");
    const sidebar = page.getByRole("complementary", { name: "Component library" });
    await sidebar.getByRole("heading", { name: name[0].toUpperCase() + name.slice(1), exact: true }).evaluate((el) => el.scrollIntoView());
    if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath(`${name}.png`) });
  }
});
