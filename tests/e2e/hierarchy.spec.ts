import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";

test.use({ viewport: { width: 1600, height: 1060 } });
const canvas = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const picker = (page: Page) => inspector(page).getByRole("combobox", { name: "Find an object" });
const parentPicker = (page: Page) => inspector(page).getByRole("combobox", { name: "Parent boundary" });
const button = (page: Page, name: string) => inspector(page).getByRole("button", { name, exact: true });
const frames = (page: Page) => page.locator(".projection .diagram-frame");
const lines = (page: Page) => page.locator(".connection-line");
const field = (page: Page, name: string) => inspector(page).getByRole("textbox", { name, exact: true });
const idOf = (locator: Locator) => locator.locator("..").getAttribute("data-id");
const item = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"] > :is(.diagram-node,.diagram-frame)`);
const edge = (page: Page, source: string, target: string) => lines(page).and(page.locator(`[data-source="${source}"][data-target="${target}"]`));
async function capture(page: Page, info: TestInfo, name: string) {
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath(`${name}.png`) });
}
async function open(page: Page, name: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "New diagram" }).click();
  await page.getByRole("textbox", { name: "Diagram name" }).fill(name);
  await page.getByLabel("Category").selectOption("architecture");
  await page.getByRole("button", { name: "Create diagram" }).click();
  await expect(canvas(page)).toBeVisible();
}
async function setField(page: Page, name: string, value: string | number) {
  const locator = field(page, name);
  await locator.fill(String(value));
  await locator.press(name === "Boundary title" || name === "Label" ? "Control+Enter" : "Enter");
  await expect(locator).toHaveValue(String(value));
  await expect(inspector(page).getByRole("alert")).toHaveCount(0);
}
async function insert(page: Page, name: string, x: number, y: number) {
  await page.getByRole("button", { name: `Insert ${name}`, exact: true }).click();
  const selected = page.locator(".projection :is(.diagram-node,.diagram-frame)[data-selected='true']");
  await expect(selected).toHaveCount(1);
  const id = (await idOf(selected))!;
  await setField(page, "X", x);
  await setField(page, "Y", y);
  return id;
}
async function boundary(page: Page, title: string, x: number, y: number, width: number, height: number) {
  const id = await insert(page, "Boundary", x, y);
  await setField(page, "Boundary title", title);
  await setField(page, "Width", width);
  await setField(page, "Height", height);
  return id;
}
async function center(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function shiftClick(page: Page, locator: Locator) {
  const point = await center(locator);
  await page.keyboard.down("Shift");
  await page.mouse.click(point.x, point.y);
  await page.keyboard.up("Shift");
}
async function group(page: Page, a: string, b: string, title: string) {
  await picker(page).selectOption(a);
  await shiftClick(page, item(page, b));
  await button(page, "Group selection").click();
  const selected = frames(page).and(page.locator("[data-selected='true']"));
  await expect(selected).toHaveCount(1);
  await setField(page, "Boundary title", title);
  return (await idOf(selected))!;
}
async function reparent(page: Page, id: string, parentId: string) {
  await picker(page).selectOption(id);
  await parentPicker(page).selectOption(parentId);
  await expect(item(page, id)).toHaveAttribute("data-parent-id", parentId);
}
async function move(page: Page, point: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 6 });
  await page.mouse.up();
}
async function connection(page: Page, from: string, to: string, source = "right", target = "left") {
  await picker(page).selectOption(from);
  const open = button(page, "Connect to…");
  await expect(open).toBeVisible();
  await expect(open).toBeEnabled();
  await open.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Connect to…" });
  await dialog.getByLabel(/Source point/).selectOption(source);
  await dialog.getByLabel("Target component").selectOption(to);
  await dialog.getByLabel("Target point").selectOption(target);
  await dialog.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(edge(page, from, to)).toHaveCount(1);
}

test("UX-07/09 nests editable groups, connects at all three containment levels, and keeps live attachments", async ({ page }, info) => {
  test.setTimeout(60_000);
  await open(page, "Grouped service topology");
  const web = await insert(page, "Website", 190, 226);
  const decision = await insert(page, "Decision", 444, 210);
  const storage = await insert(page, "Database", 745, 247);
  const root = await insert(page, "User", 730, 685);
  const inside = await group(page, web, decision, "Application tier");
  const outer = await boundary(page, "Production zone", 90, 90, 930, 550);
  const peer = await boundary(page, "Data tier", 690, 164, 280, 245);
  const beforeNesting = await Promise.all([web, decision, storage].map((id) => center(item(page, id))));
  await reparent(page, inside, outer);
  await reparent(page, peer, outer);
  await reparent(page, storage, peer);
  expect(await Promise.all([web, decision, storage].map((id) => center(item(page, id))))).toEqual(beforeNesting);
  const ordered = await page.locator(".react-flow__node").evaluateAll((entries) => entries.map((entry) => entry.getAttribute("data-id")));
  expect(ordered.indexOf(outer)).toBeLessThan(ordered.indexOf(inside));
  expect(ordered.indexOf(inside)).toBeLessThan(ordered.indexOf(web));
  const layers = await page.locator(`.react-flow__node[data-id="${outer}"],.react-flow__node[data-id="${inside}"],.react-flow__node[data-id="${web}"]`)
    .evaluateAll((entries) => entries.map((entry) => Number(getComputedStyle(entry).zIndex)));
  expect(layers[0]).toBeLessThan(layers[1]);
  expect(layers[1]).toBeLessThan(layers[2]);
  await capture(page, info, "nested-boundaries");
  await expect(picker(page)).toHaveValue(storage);
  await expect(parentPicker(page)).toHaveValue(peer);
  await expect(inspector(page).getByText("Parent-local position", { exact: true })).toBeVisible();
  await capture(page, info, "membership-controls");
  await picker(page).selectOption(outer);
  await expect(parentPicker(page).locator(`option[value="${inside}"]`)).toBeDisabled();
  await expect(parentPicker(page).locator(`option[value="${outer}"]`)).toBeDisabled();
  await expect(button(page, "Connect to…")).toHaveCount(0);
  const shape = (await item(page, outer).boundingBox())!;
  await page.mouse.click(shape.x + 38, shape.y + 490);
  await expect(picker(page)).toHaveValue("");

  await connection(page, web, decision);
  const decisionCenter = await center(item(page, decision));
  await page.mouse.move(decisionCenter.x, decisionCenter.y);
  const sourcePort = await center(page.locator(`[data-node-id="${decision}"][data-port="right"]`));
  await page.mouse.move(sourcePort.x, sourcePort.y, { steps: 8 });
  await page.mouse.down();
  const targetPort = await center(page.locator(`[data-node-id="${storage}"][data-port="left"]`));
  await page.mouse.move(targetPort.x, targetPort.y);
  await expect(page.locator(".connection-preview polyline")).toHaveAttribute("data-valid", "true");
  await page.mouse.up();
  await expect(edge(page, decision, storage)).toHaveCount(1);
  await connection(page, decision, root, "bottom", "top");
  await connection(page, root, web, "left", "bottom");
  await expect(lines(page)).toHaveCount(4);
  await capture(page, info, "cross-boundary-connections");

  const box = (await item(page, outer).boundingBox())!;
  await page.mouse.move(decisionCenter.x, decisionCenter.y);
  const invalidPort = await center(page.locator(`[data-node-id="${decision}"][data-port="top"]`));
  await page.mouse.move(invalidPort.x, invalidPort.y, { steps: 8 });
  await page.mouse.down();
  await page.mouse.move(box.x + 145, box.y + 15);
  await expect(page.locator(".connection-preview polyline")).toHaveAttribute("data-valid", "false");
  await page.mouse.up();
  await expect(page.locator(".canvas-notice")).toContainText("Drop on a component connection point");
  await expect(lines(page)).toHaveCount(4);

  const path = edge(page, decision, storage);
  const lineId = await path.getAttribute("data-edge-id");
  const pathBefore = await path.getAttribute("points");
  const origin = await center(item(page, web));
  await picker(page).selectOption(inside);
  await shiftClick(page, item(page, web));
  const innerBox = (await item(page, inside).boundingBox())!;
  await move(page, { x: innerBox.x + 72, y: innerBox.y + 13 }, 30, 85);
  expect(await center(item(page, web))).toEqual({ x: origin.x + 30, y: origin.y + 85 });
  await expect(path).not.toHaveAttribute("points", pathBefore!);
  await expect(path).toHaveAttribute("data-edge-id", lineId!);
  await picker(page).selectOption(peer);
  const oldStorage = await center(item(page, storage));
  const east = await center(page.locator("[data-resize='e']"));
  const peerBox = (await item(page, peer).boundingBox())!;
  await move(page, east, 48, 0);
  expect((await item(page, peer).boundingBox())!.width).toBe(peerBox.width + 48);
  expect(await center(item(page, storage))).toEqual(oldStorage);
  await expect(item(page, peer)).toHaveAttribute("data-selected", "true");
  await capture(page, info, "resized-boundary");
  const afterMove = await path.getAttribute("points");
  await reparent(page, storage, inside);
  expect(await center(item(page, storage))).toEqual(oldStorage);
  await expect(path).toHaveAttribute("points", afterMove!);
  await picker(page).selectOption(lineId!);
  await button(page, "Reconnect target").click();
  const reconnect = page.getByRole("dialog", { name: "Reconnect target" });
  await reconnect.getByLabel("Replacement component").selectOption(root);
  await reconnect.getByLabel("Replacement point").selectOption("left");
  await reconnect.getByRole("button", { name: "Reconnect", exact: true }).click();
  await expect(lines(page).and(page.locator(`[data-edge-id="${lineId}"]`))).toHaveAttribute("data-target", root);
  await expect(lines(page)).toHaveCount(4);

  await picker(page).selectOption(web);
  await inspector(page).getByRole("combobox", { name: "Status" }).selectOption("completed");
  await setField(page, "Fill colour", "#DBEAFE");
  await picker(page).selectOption(storage);
  await parentPicker(page).selectOption(peer);
  await expect(item(page, storage)).toHaveAttribute("data-parent-id", peer);
  await picker(page).selectOption(lineId!);
  await setField(page, "Label", "Private service request");
  await picker(page).selectOption(decision);
  const records = () => lines(page).evaluateAll((edges) => edges.map((edge) =>
    ["data-edge-id", "data-source", "data-target", "data-source-handle", "data-target-handle", "points"]
      .map((name) => edge.getAttribute(name))));
  const beforeDeletion = await records();
  const undo = page.getByRole("button", { name: "Undo", exact: true });
  const redo = page.getByRole("button", { name: "Redo", exact: true });
  await button(page, "Delete selection").click();
  await expect(item(page, decision)).toHaveCount(0);
  await expect(lines(page)).toHaveCount(1);
  await expect(picker(page)).toHaveValue("");
  await undo.click();
  await expect(item(page, decision)).toHaveAttribute("data-parent-id", inside);
  await expect.poll(records).toEqual(beforeDeletion);
  await expect(picker(page)).toHaveValue("");
  await redo.click();
  await expect(item(page, decision)).toHaveCount(0);
  await expect(lines(page)).toHaveCount(1);
  await undo.click();
  await expect.poll(records).toEqual(beforeDeletion);
  await expect(item(page, web).getByText("Completed")).toBeVisible();
  await expect(item(page, web).locator('[fill="#DBEAFE"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Fit diagram", exact: true }).click();
  const fit = (await canvas(page).boundingBox())!;
  const ink = page.locator(".diagram-frame,.diagram-node,.boundary-title-layer text,.diagram-edge-label,[data-edge-arrow]");
  await expect.poll(() => ink.evaluateAll((items, { x, y, width, height }) => items.every((item) => {
    const box = item.getBoundingClientRect();
    return box.left >= x && box.top >= y && box.right <= x + width && box.bottom <= y + height;
  }), fit)).toBe(true);
  await capture(page, info, "restored-architecture");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(canvas(page)).toBeVisible();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeDisabled();
  await expect(item(page, decision)).toHaveAttribute("data-parent-id", inside);
  await expect(item(page, storage)).toHaveAttribute("data-parent-id", peer);
  await expect(item(page, peer)).toHaveAttribute("data-parent-id", outer);
  await expect.poll(records).toEqual(beforeDeletion);
  await expect(item(page, web).getByText("Completed")).toBeVisible();
  await expect(item(page, web).locator('[fill="#DBEAFE"]')).toHaveCount(1);
  await capture(page, info, "reloaded-architecture");
  await page.getByRole("button", { name: "Duplicate diagram Grouped service topology", exact: true }).click();
  const copyDialog = page.getByRole("dialog", { name: "Duplicate diagram" });
  await copyDialog.getByRole("button", { name: "Duplicate diagram", exact: true }).click();
  await expect(copyDialog).toHaveCount(0);
  await page.getByRole("link", { name: "Back to diagram library" }).click();
  await expect(page.getByRole("link", { name: "Grouped service topology", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Grouped service topology (copy)", exact: true }).click();
  await expect(frames(page)).toHaveCount(3);
  await expect(lines(page)).toHaveCount(4);
  const clonedWeb = page.locator('.projection [data-component="arch.website"]');
  const clonedId = (await idOf(clonedWeb))!;
  expect(clonedId).not.toBe(web);
  await expect(clonedWeb).not.toHaveAttribute("data-parent-id", inside);
  await picker(page).selectOption(clonedId);
  await setField(page, "Fill colour", "#FEE2E2");
  await page.getByRole("link", { name: "Back to diagram library" }).click();
  await page.getByRole("link", { name: "Grouped service topology", exact: true }).click();
  await expect.poll(records).toEqual(beforeDeletion);
  await expect(item(page, web).locator('[fill="#DBEAFE"]')).toHaveCount(1);
});

test("CI-24/25/26 expands ancestors on left and top, rejects shrink, and requires explicit membership", async ({ page }, info) => {
  test.setTimeout(60_000);
  await open(page, "Expansion in nested services");
  const a = await insert(page, "Application", 332, 285);
  const b = await insert(page, "Database", 580, 341);
  const outside = await insert(page, "User", 102, 531);
  const inner = await group(page, a, b, "Service boundary");
  const outer = await boundary(page, "Outer environment", 230, 161, 680, 530);
  await reparent(page, inner, outer);
  await picker(page).selectOption(b);
  await shiftClick(page, item(page, outside));
  await button(page, "Group selection").click();
  await expect(inspector(page).getByRole("alert")).toContainText("same parent boundary");
  await expect(frames(page)).toHaveCount(2);
  const originalOutside = await center(item(page, outside));
  await move(page, originalOutside, 660, 39);
  await expect(item(page, outside)).toHaveAttribute("data-parent-id", "");
  const subject = await center(item(page, a));
  const sibling = await center(item(page, b));
  const beforeInner = (await item(page, inner).boundingBox())!;
  const beforeOuter = (await item(page, outer).boundingBox())!;
  await capture(page, info, "expansion-before");
  await move(page, subject, -230, -196);
  await expect(item(page, a)).toHaveAttribute("data-parent-id", inner);
  expect(await center(item(page, b))).toEqual(sibling);
  for (const [id, original] of [[inner, beforeInner], [outer, beforeOuter]] as const) {
    const current = (await item(page, id).boundingBox())!;
    expect(current.x).toBeLessThan(original.x);
    expect(current.y).toBeLessThan(original.y);
    expect(current.width).toBeGreaterThan(original.width);
    expect(current.height).toBeGreaterThan(original.height);
  }
  await capture(page, info, "expansion-after");
  await picker(page).selectOption(inner);
  const subjectAfter = await center(item(page, a));
  await setField(page, "Boundary title", "Service boundary\nApplication group\nCompute and data\nOwnership");
  expect(await center(item(page, a))).toEqual(subjectAfter);
  const originalWidth = await field(page, "Width").inputValue();
  await field(page, "Width").fill("160");
  await field(page, "Width").press("Enter");
  await expect(inspector(page).getByRole("alert")).toContainText("would hide content");
  await field(page, "Width").press("Escape");
  await expect(field(page, "Width")).toHaveValue(originalWidth);
  const insideOrigin = await center(item(page, a));
  await picker(page).selectOption(a);
  await button(page, "Remove from boundary").click();
  await expect(item(page, a)).toHaveAttribute("data-parent-id", outer);
  expect(await center(item(page, a))).toEqual(insideOrigin);
  await reparent(page, a, "");
  expect(await center(item(page, a))).toEqual(insideOrigin);
});

test("CI-27/28 duplicates internal links only, ungroups without motion, and deletes only explicit objects", async ({ page }, info) => {
  test.setTimeout(60_000);
  await open(page, "Duplicating a connected service");
  const a = await insert(page, "Website", 195, 247);
  const b = await insert(page, "Server", 497, 247);
  const outside = await insert(page, "Database", 814, 486);
  await connection(page, a, b);
  await connection(page, b, outside, "right", "top");
  await canvas(page).press("Control+d");
  await expect(lines(page)).toHaveCount(2);
  const original = await group(page, a, b, "Public service");
  await shiftClick(page, item(page, a));
  const pointA = await center(item(page, a));
  const pointB = await center(item(page, b));
  await button(page, "Duplicate").click();
  await expect(frames(page)).toHaveCount(2);
  await expect(lines(page)).toHaveCount(3);
  const copy = (await idOf(frames(page).and(page.locator("[data-selected='true']"))))!;
  expect(copy).not.toBe(original);
  const copyA = page.locator(`.diagram-node[data-component="arch.website"][data-parent-id="${copy}"]`);
  const copyB = page.locator(`.diagram-node[data-component="arch.server"][data-parent-id="${copy}"]`);
  const copiedA = (await idOf(copyA))!, copiedB = (await idOf(copyB))!;
  expect(new Set([a, b, copiedA, copiedB]).size).toBe(4);
  expect(await center(copyA)).toEqual({ x: pointA.x + 20, y: pointA.y + 20 });
  expect(await center(copyB)).toEqual({ x: pointB.x + 20, y: pointB.y + 20 });
  await expect(edge(page, copiedA, copiedB)).toHaveCount(1);
  await expect(edge(page, copiedB, outside)).toHaveCount(0);
  await expect(edge(page, b, outside)).toHaveCount(1);
  await picker(page).selectOption(copy);
  const copyBox = (await item(page, copy).boundingBox())!;
  await move(page, { x: copyBox.x + 67, y: copyBox.y + 13 }, 102, 236);
  await capture(page, info, "duplicated-groups");
  const before = await Promise.all([copiedA, copiedB].map((id) => center(item(page, id))));
  await button(page, "Ungroup").click();
  await expect(frames(page)).toHaveCount(1);
  for (const id of [copiedA, copiedB]) await expect(item(page, id)).toHaveAttribute("data-parent-id", "");
  expect(await Promise.all([copiedA, copiedB].map((id) => center(item(page, id))))).toEqual(before);
  await expect(edge(page, copiedA, copiedB)).toHaveCount(1);
  await capture(page, info, "ungrouped");
  await picker(page).selectOption(b);
  await canvas(page).press("Delete");
  await expect(item(page, b)).toHaveCount(0);
  await expect(item(page, a)).toHaveCount(1);
  await expect(lines(page)).toHaveCount(1);
  await expect(edge(page, copiedA, copiedB)).toHaveCount(1);
  await picker(page).selectOption(original);
  await button(page, "Delete selection").click();
  await expect(frames(page)).toHaveCount(0);
  await expect(item(page, a)).toHaveAttribute("data-parent-id", "");
  expect(await center(item(page, a))).toEqual(pointA);
});
