import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1520, height: 1050 } });
const canvas = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const field = (page: Page, name: string) => name === "Label" || name === "Boundary title"
  ? inspector(page).getByRole("textbox", { name, exact: true })
  : ["Find an object", "Connector route", "Arrow direction", "Stroke style", "Text alignment", "Status"].includes(name)
    ? inspector(page).getByRole("combobox", { name, exact: true }) : inspector(page).getByLabel(name, { exact: true });
const graphic = (page: Page, type: string) => page.locator(`.projection [data-component="${type}"]`);
const picker = (page: Page) => field(page, "Find an object");
const renderedLabel = (node: Locator) => node.locator(".diagram-label, .frame-title");
const nodeId = (node: Locator) => node.locator("..").getAttribute("data-id");
async function open(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram" }).click();
  const dialog = page.getByRole("dialog", { name: "New diagram" });
  await dialog.getByRole("textbox", { name: "Diagram name" }).fill(name);
  await dialog.getByRole("button", { name: "Create diagram" }).click();
  await expect(canvas(page)).toBeVisible();
}
async function enter(locator: Locator, value: string) {
  await locator.fill(value);
  await locator.press("Enter");
}
async function label(page: Page, text: string, name = "Label") {
  const control = field(page, name);
  await control.fill(text);
  await control.press("Control+Enter");
  await expect(control).toHaveValue(text);
  await expect(inspector(page).getByRole("alert")).toHaveCount(0);
}
async function insert(page: Page, name: string, type: string, x: number, y: number) {
  await page.getByRole("button", { name: `Insert ${name}`, exact: true }).click();
  const node = graphic(page, type);
  await expect(node).toHaveAttribute("data-selected", "true");
  await enter(field(page, "X"), String(x));
  await enter(field(page, "Y"), String(y));
  await expect(field(page, "Y")).toHaveValue(String(y));
  return node;
}
async function select(page: Page, node: Locator) {
  await picker(page).selectOption((await nodeId(node))!);
}
async function link(page: Page, from: Locator, to: Locator, sourcePoint = "right", targetPoint = "left") {
  await select(page, from);
  await inspector(page).getByRole("button", { name: "Connect to…" }).click();
  const dialog = page.getByRole("dialog", { name: "Connect to…" });
  await dialog.getByLabel(/Source point/).selectOption(sourcePoint);
  await dialog.getByLabel("Target component").selectOption((await nodeId(to))!);
  await dialog.getByLabel("Target point").selectOption(targetPoint);
  await dialog.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  return page.locator(".connection-line[data-selected='true']");
}
async function clickShape(page: Page, node: Locator, clicks = 1) {
  const box = (await node.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { clickCount: clicks });
}

test("CI-14/15/16 direct and inspector drafts preserve Unicode, IME, native undo and measured geometry", async ({ page }, info) => {
  await open(page, "Typography and content fitting");
  const process = await insert(page, "Process", "flow.process", 125, 125);
  const width = field(page, "Width");
  const height = field(page, "Height");
  await expect(height).toHaveValue("64");
  const input = field(page, "Label");
  await input.focus();
  await input.press("End");
  await page.keyboard.type("X");
  await input.press("Control+z");
  await expect(input).toHaveValue("Process");
  await expect(renderedLabel(process)).toHaveText("Process");
  await input.fill("bad\uFFFF label");
  await input.press("Control+Enter");
  await expect(inspector(page).getByRole("alert")).toContainText("U+FFFF");
  await expect(input).toHaveValue("bad\uFFFF label");
  await expect(renderedLabel(process)).toHaveText("Process");
  await field(page, "Font size").focus();
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("bad\uFFFF label");
  await input.press("Escape");
  await expect(input).toHaveValue("Process");

  await input.fill("Composed");
  await input.dispatchEvent("compositionstart");
  await input.press("Control+Enter");
  await expect(renderedLabel(process)).toHaveText("Process");
  await input.dispatchEvent("compositionend");
  await input.press("Tab");
  await expect(inspector(page).getByRole("button", { name: "Apply" })).toBeFocused();
  await field(page, "Font size").focus();
  await expect(renderedLabel(process)).toHaveText("Composed");
  await clickShape(page, process, 2);
  const direct = page.getByRole("dialog", { name: "Edit label" });
  const directInput = direct.getByRole("textbox", { name: "Label" });
  await expect(directInput).toBeFocused();
  await directInput.fill("Discard me");
  await directInput.press("Escape");
  await expect(direct).toHaveCount(0);
  await expect(renderedLabel(process)).toHaveText("Composed");
  await expect(canvas(page)).toBeFocused();
  await canvas(page).press("Enter");
  const original = "Design review\nレビュー 👩🏽‍💻 · مراجعة\n\nInternationalReviewReadiness\n<literal>";
  await directInput.fill(original);
  await directInput.press("Control+Enter");
  await expect(direct).toHaveCount(0);
  await expect(input).toHaveValue(original);
  expect(await renderedLabel(process).locator("tspan").count()).toBeGreaterThan(4);
  expect(await renderedLabel(process).textContent()).toBe(original.replaceAll("\n", ""));
  await expect(process.locator("literal")).toHaveCount(0);
  await expect(process).toHaveAttribute("data-label-fits", "true");
  await enter(field(page, "Font size"), "8");
  await expect(renderedLabel(process)).toHaveAttribute("font-size", "8");
  await enter(field(page, "Font size"), "72");
  await expect(renderedLabel(process)).toHaveAttribute("font-size", "72");
  await expect(process).toHaveAttribute("data-label-fits", "true");
  const grown = Number(await height.inputValue());
  expect(grown).toBeGreaterThan(64);
  await enter(height, "64");
  await expect(inspector(page).getByRole("alert")).toContainText("more space");
  await height.press("Escape");
  await expect(height).toHaveValue(String(grown));
  await enter(field(page, "Font size"), "73");
  await expect(inspector(page).getByRole("alert")).toBeVisible();
  await field(page, "Font size").press("Escape");
  await enter(field(page, "Font size"), "24");
  await enter(width, "250");
  await enter(height, "300");
  await expect(process).toHaveAttribute("data-label-fits", "true");
  await field(page, "Text alignment").selectOption("left");
  await enter(field(page, "Fill colour"), "#E0ECFF");
  await expect(process.locator("rect").first()).toHaveAttribute("fill", "#E0ECFF");
  await enter(field(page, "Fill colour"), "#QQ00FF");
  await expect(inspector(page).getByRole("alert")).toContainText("#RRGGBB");
  await field(page, "Fill colour").press("Escape");
  await expect(process.locator("rect").first()).toHaveAttribute("fill", "#E0ECFF");
  const labelBox = await renderedLabel(process).boundingBox();
  const shapeBox = await process.boundingBox();
  expect(labelBox!.x).toBeGreaterThanOrEqual(shapeBox!.x);
  expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(shapeBox!.y + shapeBox!.height);
  console.log(`${info.project.name}: fitted 24-unit label, ${await renderedLabel(process).locator("tspan").count()} lines, ${labelBox!.width.toFixed(2)} × ${labelBox!.height.toFixed(2)} CSS px at 100%`);
  await expect(height).toHaveValue("300");
  const handle = await page.locator("[data-resize='s']").boundingBox();
  const x = handle!.x + handle!.width / 2, y = handle!.y + handle!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 240, { steps: 6 });
  await expect(page.locator(".canvas-notice")).toContainText("more space");
  await expect(process).toHaveAttribute("data-label-fits", "true");
  await page.mouse.up();
  await expect(height).toHaveValue("300");
  if (info.project.name === "chrome") {
    await page.screenshot({ path: info.outputPath("node-properties.png") });
    await page.getByRole("button", { name: "Fit diagram" }).click();
    await page.screenshot({ path: info.outputPath("multiline-fit.png") });
  }
});

test("CL-10 and CI-17 styles a connected flowchart and edits mixed values and edge properties", async ({ page }, info) => {
  await open(page, "Release approval flow");
  const start = await insert(page, "Start / End", "flow.terminator", 95, 230);
  await label(page, "Submit release");
  const review = await insert(page, "Decision", "flow.decision", 390, 210);
  await label(page, "Checks pass?");
  const ship = await insert(page, "Process", "flow.process", 705, 225);
  await label(page, "Publish release");
  const fix = await insert(page, "Document", "flow.document", 400, 495);
  await label(page, "Review findings");
  await enter(field(page, "Fill colour"), "#FFE8D1");
  await select(page, ship);
  await enter(field(page, "Fill colour"), "#D6F5EC");
  await clickShape(page, ship);
  await page.keyboard.down("Shift");
  await clickShape(page, fix);
  await page.keyboard.up("Shift");
  await expect(inspector(page).getByRole("heading", { name: "Multiple objects" })).toBeVisible();
  await expect(field(page, "Fill colour")).toHaveAttribute("placeholder", "Mixed");
  await expect(field(page, "Label")).toHaveCount(0);
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("mixed-values.png") });
  await enter(field(page, "Stroke colour"), "#334155");
  await expect(ship.locator("rect")).toHaveAttribute("stroke", "#334155");
  await expect(fix.locator("path")).toHaveAttribute("stroke", "#334155");
  await expect(ship.locator("rect")).toHaveAttribute("fill", "#D6F5EC");
  await expect(fix.locator("path")).toHaveAttribute("fill", "#FFE8D1");
  await expect(start.locator("rect")).not.toHaveAttribute("stroke", "#334155");

  await link(page, start, review);
  const yes = await link(page, review, ship);
  await label(page, "Approved");
  await enter(field(page, "Stroke colour"), "#166534");
  await enter(field(page, "Stroke width"), "3");
  await field(page, "Arrow direction").selectOption("both");
  await field(page, "Stroke style").selectOption("dashed");
  const edgeId = await yes.getAttribute("data-edge-id");
  const edge = page.locator(`.connection-line[data-edge-id="${edgeId}"]`);
  const tuple = [await edge.getAttribute("data-source"), await edge.getAttribute("data-target")];
  await field(page, "Connector route").selectOption("straight");
  await expect(edge).toHaveAttribute("data-route", "straight");
  await expect(edge).toHaveAttribute("stroke-dasharray", "12 9");
  await expect(edge).toHaveAttribute("stroke", "#166534");
  await expect(page.locator(`[data-edge-arrow="${edgeId}"]`)).toHaveCount(2);
  await field(page, "Connector route").selectOption("orthogonal");
  await expect(edge).toHaveAttribute("data-route", "orthogonal");
  expect([await edge.getAttribute("data-source"), await edge.getAttribute("data-target")]).toEqual(tuple);
  await expect(page.locator(".diagram-edge-label").filter({ hasText: "Approved" })).toBeVisible();
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("edge-properties.png") });
  await link(page, review, fix, "bottom", "top");
  await label(page, "Needs review");
  await enter(field(page, "Stroke colour"), "#9A3412");
  await canvas(page).press("Escape");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("styled-flowchart.png") });
});

test("CL-14/15 styles architecture statuses and a boundary without replacing custom paint", async ({ page }, info) => {
  await open(page, "Service platform");
  const frame = await insert(page, "Boundary", "general.boundary", 70, 135);
  await enter(field(page, "Width"), "820");
  await enter(field(page, "Height"), "490");
  await label(page, "Production services\nCustomer platform", "Boundary title");
  await enter(field(page, "Fill colour"), "#DDE7FF");
  await enter(field(page, "Fill opacity"), "0.54");
  await expect(frame.locator("rect")).toHaveAttribute("fill-opacity", "0.54");
  await expect(renderedLabel(frame).locator("tspan")).toHaveCount(2);
  await expect(field(page, "Status")).toHaveCount(0);
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("boundary-properties.png") });

  const web = await insert(page, "Website", "arch.website", 135, 290);
  await label(page, "Customer portal");
  const api = await insert(page, "API", "arch.api", 412, 279);
  await label(page, "Orders API");
  const data = await insert(page, "Database", "arch.database", 665, 430);
  await label(page, "Orders database");
  const user = await insert(page, "User", "arch.user", 130, 465);
  await label(page, "Customers");
  const examples = [[web, "completed", "#15803D"], [api, "in_progress", "#D97706"], [data, "pending", "#DC2626"]] as const;
  for (const [node, state, color] of examples) {
    await select(page, node);
    await enter(field(page, "Fill colour"), "#1E293B");
    await enter(field(page, "Text colour"), "#F8FAFC");
    await field(page, "Status").selectOption(state);
    await expect(node.locator(`[data-status="${state}"] circle`)).toHaveAttribute("fill", color);
    await expect(node.locator(`[data-status="${state}"] rect`)).toHaveAttribute("fill", "#FFFFFF");
    await expect(node.locator(":scope > rect")).toHaveAttribute("fill", "#1E293B");
    await expect(node).toHaveAttribute("data-label-fits", "true");
  }
  await expect(user.locator("[data-status]")).toHaveCount(0);
  await select(page, user);
  await expect(field(page, "Status")).toHaveValue("not_specified");
  await select(page, data);
  await field(page, "Status").selectOption("not_specified");
  await expect(data.locator("[data-status]")).toHaveCount(0);
  await expect(data.locator(":scope > rect")).toHaveAttribute("fill", "#1E293B");
  await field(page, "Status").selectOption("pending");
  await expect(data.locator("[data-status='pending'] text")).toHaveText("Pending");
  if (info.project.name === "chrome") {
    await canvas(page).evaluate((element) => { element.style.filter = "grayscale(1)"; });
    await expect(web.locator("[data-status] text")).toHaveText("Completed");
    await expect(api.locator("[data-status] text")).toHaveText("In progress");
    await page.screenshot({ path: info.outputPath("architecture-statuses-grayscale.png") });
    await canvas(page).evaluate((element) => { element.style.removeProperty("filter"); });
    await page.screenshot({ path: info.outputPath("architecture-statuses.png") });
  }
  await link(page, user, web, "top", "bottom");
  await label(page, "HTTPS");
  await link(page, web, api);
  await label(page, "Order requests");
  await link(page, api, data, "right", "top");
  await label(page, "Order data");
  await canvas(page).press("Escape");
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("styled-architecture.png") });
});
