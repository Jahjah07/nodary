import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });
type Point = { x: number; y: number };
type Handle = "top" | "right" | "bottom" | "left";
const canvas = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const paths = (page: Page) => page.locator(".connection-line");
const status = (page: Page) => page.locator(".canvas-notice");
const node = (page: Page, component: string) => page.locator(`.projection [data-component="${component}"]`);
async function center(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function pointer(page: Page, { x, y }: Point) { await page.mouse.move(x, y); }
async function readId(locator: Locator) {
  return (await locator.locator("..").locator("..").getAttribute("data-id")) ??
    (await locator.locator("..").getAttribute("data-id"))!;
}
const port = (page: Page, id: string, handle: Handle) => page.locator(`[data-node-id="${id}"][data-port="${handle}"]`);
const reconnect = (page: Page, side: string) => page.locator(`[data-reconnect="${side}"]`);

async function open(page: Page, title: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram" }).click();
  const dialog = page.getByRole("dialog", { name: "New diagram" });
  await dialog.getByRole("textbox", { name: "Diagram name" }).fill(title);
  await dialog.getByRole("button", { name: "Create diagram" }).click();
  await expect(canvas(page)).toBeVisible();
}

async function insert(page: Page, name: string, type: string, x: number, y: number) {
  const tile = page.getByRole("button", { name: `Insert ${name}`, exact: true });
  await tile.scrollIntoViewIfNeeded();
  const start = await center(tile);
  const box = (await canvas(page).boundingBox())!;
  await pointer(page, start);
  await page.mouse.down();
  await page.mouse.move(box.x + x, box.y + y, { steps: 10 });
  await page.mouse.move(box.x + x, box.y + y);
  await page.mouse.up();
  return node(page, type);
}

async function startLink(page: Page, from: Locator, handle: Handle) {
  const id = await readId(from);
  await pointer(page, await center(from));
  const handlePoint = await center(port(page, id, handle));
  await page.mouse.move(handlePoint.x, handlePoint.y, { steps: 8 });
  await page.mouse.down();
  return id;
}

async function toPort(page: Page, to: Locator, handle: Handle, valid = true) {
  const id = await readId(to);
  const end = await center(port(page, id, handle));
  await pointer(page, end);
  await expect(page.locator(".connection-preview polyline")).toHaveAttribute("data-valid", String(valid));
  await expect(port(page, id, handle)).toHaveAttribute("data-valid", String(valid));
  return id;
}

async function link(page: Page, from: Locator, fromSide: Handle, to: Locator, toSide: Handle) {
  const source = await startLink(page, from, fromSide);
  const target = await toPort(page, to, toSide);
  await page.mouse.up();
  const edge = paths(page).and(page.locator(
    `[data-source="${source}"][data-source-handle="${fromSide}"][data-target="${target}"][data-target-handle="${toSide}"]`,
  ));
  await expect(edge).toHaveCount(1);
  return edge;
}

async function move(page: Page, from: Point, dx: number, dy: number) {
  await pointer(page, from);
  await page.mouse.down();
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up();
}
const points = async (edge: Locator) => (await edge.getAttribute("points"))!.split(" ").map((pair) => pair.split(",").map(Number));

test("CI-18/19 creates branching flow, preserves attachment during transforms, and rejects invalid or cancelled links", async ({ page }, info) => {
  await open(page, "Approval flow");
  const start = await insert(page, "Start / End", "flow.terminator", 155, 180);
  const decision = await insert(page, "Decision", "flow.decision", 440, 180);
  const yes = await insert(page, "Process", "flow.process", 730, 180);
  const no = await insert(page, "Document", "flow.document", 500, 410);
  const annotation = await insert(page, "Note", "general.note", 715, 425);
  const frame = await insert(page, "Boundary", "general.boundary", 450, 555);
  const text = await insert(page, "Text", "general.text", 160, 385);
  for (const incompatible of [annotation, frame, text]) {
    await inspector(page).getByLabel("Find an object").selectOption(await readId(incompatible));
    await expect(inspector(page).getByRole("button", { name: "Connect to…" })).toHaveCount(0);
  }
  const incoming = await link(page, start, "right", decision, "left");
  const branch = await link(page, decision, "right", yes, "left");
  const next = await link(page, decision, "bottom", no, "top");
  await expect(paths(page)).toHaveCount(3);
  await inspector(page).getByLabel("Connector route").selectOption("straight");
  await expect(next).toHaveAttribute("data-route", "straight");
  expect(await points(next)).toHaveLength(2);
  expect((await points(branch)).length).toBeGreaterThanOrEqual(2);
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("straight-orthogonal.png") });
  await canvas(page).press("Escape");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("branching-flow.png") });

  const oldPoints = await points(branch);
  const initialOtherPaths = [await points(incoming), await points(next)];
  const body = await center(yes);
  await move(page, body, -30, 75);
  const moved = await points(branch);
  expect(moved[0]).toEqual(oldPoints[0]);
  expect(moved.at(-1)![0]).toBeCloseTo(oldPoints.at(-1)![0] - 30);
  expect(moved.at(-1)![1]).toBeCloseTo(oldPoints.at(-1)![1] + 75);
  await move(page, await center(page.locator("[data-resize='w']")), -25, 0);
  const resized = await points(branch);
  expect(resized.at(-1)![0]).toBeCloseTo(moved.at(-1)![0] - 25);
  expect(resized.at(-1)![1]).toBeCloseTo(moved.at(-1)![1]);
  expect([await points(incoming), await points(next)]).toEqual(initialOtherPaths);
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("after-transform.png") });

  await startLink(page, decision, "right");
  await toPort(page, yes, "left", false);
  await page.mouse.up();
  await expect(status(page)).toContainText("already exists");
  await startLink(page, decision, "left");
  await toPort(page, decision, "top", false);
  await page.mouse.up();
  await expect(status(page)).toContainText("cannot loop to itself");
  await expect(paths(page)).toHaveCount(3);
  const area = (await canvas(page).boundingBox())!;
  for (const destination of [await center(annotation), await center(text), await center(frame), { x: area.x + 140, y: area.y + 530 }]) {
    await startLink(page, start, "top");
    await pointer(page, destination);
    await expect(page.locator(".connection-preview polyline")).toHaveAttribute("data-valid", "false");
    await page.mouse.up();
    await expect(status(page)).toContainText("Drop on a component connection point");
    await expect(paths(page)).toHaveCount(3);
  }
  await startLink(page, yes, "bottom");
  await toPort(page, no, "right");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(paths(page)).toHaveCount(3);
  await canvas(page).evaluate((element) => {
    const surface = element as HTMLElement;
    surface.addEventListener("pointerdown", (event) => { surface.dataset.testPointer = String(event.pointerId); }, { once: true });
  });
  await startLink(page, yes, "bottom");
  await toPort(page, no, "right");
  await canvas(page).dispatchEvent("pointercancel", { pointerId: Number(await canvas(page).getAttribute("data-test-pointer")) });
  await page.mouse.up();
  await expect(paths(page)).toHaveCount(3);
  await expect(page.locator(".connection-preview")).toHaveCount(0);

  await link(page, yes, "left", decision, "right");
  await link(page, decision, "top", yes, "top");
  const cycle = await link(page, no, "left", start, "bottom");
  await expect(paths(page)).toHaveCount(6);
  const archivedId = await cycle.getAttribute("data-edge-id");
  const remainingEdges = await paths(page).evaluateAll((edges, id) => edges.map((edge) => edge.getAttribute("data-edge-id")).filter((edgeId) => edgeId !== id), archivedId);
  const shapeIds = await page.locator(".react-flow__node").evaluateAll((items) => items.map((item) => item.getAttribute("data-id")));
  await canvas(page).press("Delete");
  await expect(paths(page)).toHaveCount(5);
  expect(await paths(page).evaluateAll((edges) => edges.map((edge) => edge.getAttribute("data-edge-id")))).toEqual(remainingEdges);
  expect(await page.locator(".react-flow__node").evaluateAll((items) => items.map((item) => item.getAttribute("data-id")))).toEqual(shapeIds);
});

test("CI-20 connects by keyboard and reconnects both ends while retaining the same edge", async ({ page }, info) => {
  await open(page, "Service dependencies");
  const client = await insert(page, "User", "arch.user", 140, 170);
  const app = await insert(page, "Application", "arch.application", 420, 171);
  const db = await insert(page, "Database", "arch.database", 700, 175);
  const server = await insert(page, "Server", "arch.server", 405, 390);
  const sourceId = await readId(client);
  const appId = await readId(app);
  const dbId = await readId(db);
  const serverId = await readId(server);
  const picker = inspector(page).getByLabel("Find an object");
  await picker.selectOption(sourceId);
  const connect = inspector(page).getByRole("button", { name: "Connect to…" });
  await connect.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Connect to…" });
  await expect(dialog.getByLabel("Source point on User")).toBeFocused();
  await expect(dialog.getByLabel("Target component").locator(`option[value="${sourceId}"]`)).toBeDisabled();
  await dialog.getByLabel("Target component").selectOption(appId);
  await expect(dialog.getByLabel("Target point")).toHaveValue("left");
  await dialog.getByRole("button", { name: "Connect", exact: true }).press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(picker).toBeFocused();
  await expect(paths(page)).toHaveCount(1);
  const id = (await paths(page).getAttribute("data-edge-id"))!;
  const connected = paths(page).and(page.locator(`[data-edge-id="${id}"]`));
  const targetPort = reconnect(page, "target");
  const sourcePort = reconnect(page, "source");
  await expect(connected).toHaveAttribute("data-selected", "true");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("selected-endpoints.png") });
  await pointer(page, await center(targetPort));
  await page.mouse.down();
  await toPort(page, db, "left");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("reconnect-preview.png") });
  await page.mouse.up();
  await expect(connected).toHaveAttribute("data-target", dbId);
  await expect(connected).toHaveAttribute("data-source", sourceId);
  await expect(connected).toHaveAttribute("stroke", "#64748B");
  await expect(connected).toHaveAttribute("stroke-width", "2");
  await pointer(page, await center(targetPort));
  await page.mouse.down();
  await toPort(page, client, "top", false);
  await page.mouse.up();
  await expect(connected).toHaveAttribute("data-target", dbId);
  await expect(status(page)).toContainText("cannot loop to itself");
  await inspector(page).getByRole("button", { name: "Reconnect source" }).press("Enter");
  const replace = page.getByRole("dialog", { name: "Reconnect source" });
  await replace.getByLabel("Replacement component").selectOption(serverId);
  await replace.getByLabel("Replacement point").selectOption("top");
  await replace.getByRole("button", { name: "Reconnect", exact: true }).press("Enter");
  await expect(replace).toHaveCount(0);
  await expect(connected).toHaveAttribute("data-source", serverId);
  await expect(connected).toHaveAttribute("data-source-handle", "top");
  await expect(connected).toHaveAttribute("data-target", dbId);
  await expect(sourcePort).toBeVisible();
  await pointer(page, await center(sourcePort));
  await page.mouse.down();
  await toPort(page, app, "right");
  await page.mouse.up();
  await expect(connected).toHaveAttribute("data-source", appId);
  await expect(connected).toHaveAttribute("data-target", dbId);
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("reconnected.png") });
  await link(page, client, "right", app, "left");
  await link(page, app, "bottom", server, "top");
  await expect(paths(page)).toHaveCount(3);
  await page.getByRole("button", { name: "Fit diagram" }).click();
  const area = (await canvas(page).boundingBox())!;
  for (const line of await paths(page).all()) {
    const box = (await line.boundingBox())!;
    expect(box.x).toBeGreaterThan(area.x);
    expect(box.y).toBeGreaterThan(area.y);
    expect(box.x + box.width).toBeLessThan(area.x + area.width);
    expect(box.y + box.height).toBeLessThan(area.y + area.height);
  }
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("architecture-connected.png") });
});

test("cross-boundary sample edges use parent-transformed anchors and include label ink in fit", async ({ page }) => {
  await page.goto("/editor/?id=00000000-0000-4000-8000-000000000001");
  const service = page.locator(".diagram-node").filter({ hasText: "Sample service" });
  await expect(service).toBeVisible();
  const path = paths(page).and(page.locator('[data-source="00000000-0000-4000-8000-00000000000b"][data-target="00000000-0000-4000-8000-00000000000c"]'));
  const edgeId = (await path.getAttribute("data-edge-id"))!;
  const [tip] = await points(page.locator(`[data-edge-arrow="${edgeId}"]`));
  const serviceBox = (await service.boundingBox())!;
  const area = (await canvas(page).boundingBox())!;
  const view = await page.locator(".react-flow__viewport").evaluate((element) => {
    const transform = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return { x: transform.e, y: transform.f, zoom: transform.a };
  });
  const nodeStroke = Number(await service.locator("rect").first().getAttribute("stroke-width"));
  expect(nodeStroke).toBe(1);
  expect(area.x + view.x + (tip[0] + nodeStroke / 2) * view.zoom).toBeCloseTo(serviceBox.x, 1);
  expect(area.y + view.y + tip[1] * view.zoom).toBeCloseTo(serviceBox.y + serviceBox.height / 2, 1);
  const label = page.locator(".diagram-edge-label").filter({ hasText: "HTTPS" });
  await expect(label).toBeVisible();
  const labelBox = (await label.boundingBox())!;
  expect(labelBox.x).toBeGreaterThan(area.x);
  expect(labelBox.y).toBeGreaterThan(area.y);
  expect(labelBox.x + labelBox.width).toBeLessThan(area.x + area.width);
  expect(labelBox.y + labelBox.height).toBeLessThan(area.y + area.height);
});
