import { expect, test, type Locator, type Page } from "@playwright/test";

test.use({ viewport: { width: 1500, height: 990 } });
const canvas = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const undo = (page: Page) => page.getByRole("button", { name: "Undo", exact: true });
const redo = (page: Page) => page.getByRole("button", { name: "Redo", exact: true });
const inspector = (page: Page) => page.getByRole("complementary", { name: "Properties" });
const field = (page: Page, name: string) => inspector(page).getByRole("textbox", { name, exact: true });
const picker = (page: Page) => inspector(page).getByRole("combobox", { name: "Find an object" });
const drawn = (page: Page) => page.locator(".diagram-node");
const notice = (page: Page) => page.locator(".canvas-notice");

async function create(page: Page, name: string) {
  const newDiagram = page.getByRole("button", { name: "New diagram" });
  await expect(newDiagram).toBeEnabled();
  await newDiagram.press("Enter");
  await page.getByRole("textbox", { name: "Diagram name" }).fill(name);
  await page.getByLabel("Category").selectOption("flowchart");
  await page.getByRole("button", { name: "Create diagram" }).press("Enter");
  await expect(canvas(page)).toBeVisible();
}
async function setField(page: Page, name: string, value: string) {
  await field(page, name).fill(value);
  await field(page, name).press("Enter");
  await expect(field(page, name)).toHaveValue(value);
}
async function center(locator: Locator) {
  const b = (await locator.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function startDrag(page: Page, point: { x: number; y: number }, dx: number, dy: number) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 5 });
}

test("CI-11 / UX-11 coalesces repeated nudges, preserves redo on view changes, and cancels a gesture before undo", async ({ page }, info) => {
  await page.goto("/");
  await create(page, "Transaction controls");
  await expect(undo(page)).toBeDisabled();
  await expect(redo(page)).toBeDisabled();
  await page.getByRole("button", { name: "Fit diagram", exact: true }).click();
  await expect(page.getByLabel("Zoom level")).toHaveText("100%");
  await page.getByRole("button", { name: "Insert Process", exact: true }).press("Enter");
  await expect(canvas(page)).toBeFocused();
  await expect(undo(page)).toBeEnabled();
  const node = drawn(page);
  await setField(page, "X", "173");
  await setField(page, "Y", "193");
  const original = await center(node);
  await canvas(page).focus();
  for (let i = 0; i < 3; i++) await page.keyboard.down("ArrowRight");
  await expect(field(page, "X")).toHaveValue("173");
  await page.keyboard.up("ArrowRight");
  await expect(field(page, "X")).toHaveValue("176");
  await canvas(page).press("Control+z");
  await expect(field(page, "X")).toHaveValue("173");
  expect(await center(node)).toEqual(original);
  await expect(redo(page)).toBeEnabled();
  const zoom = page.getByLabel("Zoom level");
  const priorZoom = await zoom.innerText();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  const nextZoom = await zoom.innerText();
  expect(nextZoom).not.toBe(priorZoom);
  await page.getByRole("button", { name: "Grid", exact: true }).click();
  await canvas(page).press("Control+a");
  await expect(redo(page)).toBeEnabled();
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath("history-controls.png") });
  const windows = await page.evaluate(() => navigator.platform.startsWith("Win"));
  await canvas(page).press("Control+y");
  if (windows) {
    await expect(field(page, "X")).toHaveValue("176");
    await canvas(page).press("Control+z");
  }
  await expect(field(page, "X")).toHaveValue("173");
  await expect(redo(page)).toBeEnabled();
  await canvas(page).press("Control+Shift+z");
  await expect(field(page, "X")).toHaveValue("176");
  await expect(zoom).toHaveText(nextZoom);
  await expect(page.getByRole("button", { name: "Grid", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(redo(page)).toBeDisabled();
  await canvas(page).press("Meta+z");
  await expect(field(page, "X")).toHaveValue("173");
  await canvas(page).press("Meta+Shift+z");
  await expect(field(page, "X")).toHaveValue("176");

  await page.getByRole("button", { name: "Snap", exact: true }).click();
  await canvas(page).focus();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowRight");
  await expect(field(page, "X")).toHaveValue("216");
  await page.keyboard.up("ArrowRight");
  await canvas(page).press("Control+z");
  await expect(field(page, "X")).toHaveValue("176");
  await canvas(page).focus();
  await page.keyboard.down("ArrowUp");
  await page.keyboard.down("Escape");
  await page.keyboard.up("Escape");
  await page.keyboard.up("ArrowUp");
  await expect(field(page, "Y")).toHaveValue("193");
  await expect(redo(page)).toBeEnabled();
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("ArrowDown");
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("ArrowDown");
  await expect(field(page, "X")).toHaveValue("196");
  await expect(field(page, "Y")).toHaveValue("213");
  await expect(redo(page)).toBeDisabled();
  await undo(page).click();
  await expect(field(page, "X")).toHaveValue("196");
  await expect(field(page, "Y")).toHaveValue("193");
  await canvas(page).focus();
  await page.keyboard.down("ArrowUp");
  await inspector(page).getByRole("button", { name: "Clear selection" }).click();
  await page.keyboard.up("ArrowUp");
  await expect(node).toHaveAttribute("data-selected", "false");
  await picker(page).press("End");
  await expect(field(page, "Y")).toHaveValue("173");
  await expect(redo(page)).toBeDisabled();

  const beforeDrag = await center(node);
  await startDrag(page, beforeDrag, 90, 60);
  await expect.poll(() => center(node)).not.toEqual(beforeDrag);
  await page.keyboard.press("Control+z");
  await page.mouse.up();
  await expect.poll(() => center(node)).toEqual(beforeDrag);
  await expect(field(page, "Y")).toHaveValue("173");
  await expect(redo(page)).toBeDisabled();
  await startDrag(page, beforeDrag, 90, 60);
  await page.mouse.up();
  const afterDrag = await center(node);
  expect(afterDrag).not.toEqual(beforeDrag);
  await canvas(page).press("Control+z");
  await expect.poll(() => center(node)).toEqual(beforeDrag);
  await redo(page).click();
  await expect.poll(() => center(node)).toEqual(afterDrag);

  const native = field(page, "Label");
  const label = await native.inputValue();
  await native.press("Control+a");
  await page.keyboard.insertText("Draft only");
  await native.press("Backspace");
  await native.press("Control+z");
  await expect(native).toHaveValue("Draft only");
  await native.press("Control+z");
  await expect(native).toHaveValue(label);
  await expect.poll(() => center(node)).toEqual(afterDrag);
  await expect(drawn(page)).toHaveCount(1);
});

test("AC-FR-14-01 uses the same world grid and free movement at two zoom levels", async ({ page }) => {
  await page.goto("/");
  await create(page, "World-grid movement");
  await page.getByRole("button", { name: "Insert Process", exact: true }).click();
  const snap = page.getByRole("button", { name: "Snap", exact: true });
  const viewport = page.locator(".react-flow__viewport");
  for (let i = 0; i < 2; i++) {
    const zoom = await viewport.evaluate((element) => new DOMMatrix(getComputedStyle(element).transform).a);
    for (const snapping of [false, true]) {
      await expect(snap).toHaveAttribute("aria-pressed", String(snapping));
      await setField(page, "X", "173");
      await setField(page, "Y", "193");
      await startDrag(page, await center(drawn(page)), 37, 31);
      await page.mouse.up();
      const raw = [173 + 37 / zoom, 193 + 31 / zoom];
      for (const [index, name] of ["X", "Y"].entries()) {
        const expected = snapping ? 20 * Math.floor(raw[index] / 20 + .5) : raw[index];
        const actual = Number(await field(page, name).inputValue());
        expect(actual).toBeCloseTo(expected, 4);
      }
      await snap.click();
    }
    if (i === 0) {
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      await expect(viewport).not.toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    }
  }
});

test("CI-29 / CI-33 rejects cancelled, stale and invalid gestures without a history entry", async ({ page }) => {
  await page.goto("/");
  await create(page, "Gesture integrity");
  await page.getByRole("button", { name: "Insert Process", exact: true }).click();
  const node = drawn(page);
  const original = await center(node);
  await canvas(page).evaluate((element) => {
    const surface = element as HTMLElement;
    surface.addEventListener("pointerdown", (event) => {
      surface.dataset.testPointer = String(event.pointerId);
    });
  });
  const handle = page.locator("[data-resize='e']");
  const originalWidth = (await node.boundingBox())!.width;
  await startDrag(page, await center(handle), 60, 0);
  await expect.poll(async () => (await node.boundingBox())!.width).toBeGreaterThan(originalWidth);
  await canvas(page).evaluate((element) => element.releasePointerCapture(Number((element as HTMLElement).dataset.testPointer)));
  await page.mouse.move(original.x + 65, original.y);
  await page.mouse.up();
  await expect.poll(async () => (await node.boundingBox())!.width).toBe(originalWidth);
  const port = page.locator("[data-port='right']");
  await startDrag(page, await center(port), 85, 30);
  await expect(page.locator(".connection-preview")).toBeVisible();
  await canvas(page).evaluate((element) => element.dispatchEvent(new PointerEvent("pointercancel", {
    pointerId: Number((element as HTMLElement).dataset.testPointer), bubbles: true,
  })));
  await page.mouse.up();
  await expect(page.locator(".connection-preview")).toHaveCount(0);
  await expect(page.locator(".connection-line")).toHaveCount(0);
  const bounds = (await canvas(page).boundingBox())!;
  await startDrag(page, { x: bounds.x + 30, y: bounds.y + 35 }, 160, 110);
  await expect(page.locator(".canvas-marquee")).toBeVisible();
  await page.getByRole("button", { name: "Grid", exact: true }).focus();
  await page.mouse.up();
  await expect(page.locator(".canvas-marquee")).toHaveCount(0);
  await expect(node).toHaveAttribute("data-selected", "true");
  await startDrag(page, original, 75, 30);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect.poll(() => center(node)).toEqual(original);
  await startDrag(page, original, 76, 32);
  await page.evaluate(() => (document.querySelector('button[title="Show grid"]') as HTMLButtonElement).click());
  await expect.poll(() => center(node)).toEqual(original);
  await page.mouse.move(original.x + 84, original.y + 40);
  await expect(notice(page)).toContainText("document changed after this edit began");
  await page.mouse.up();
  await expect.poll(() => center(node)).toEqual(original);
  await setField(page, "X", "1000001");
  await expect(inspector(page).getByRole("alert")).toBeVisible();
  await field(page, "X").press("Escape");
  await expect(redo(page)).toBeDisabled();
  await undo(page).click();
  await expect(node).toHaveCount(0);
  await expect(undo(page)).toBeDisabled();
  await expect(redo(page)).toBeEnabled();
  await page.getByRole("link", { name: "Back to diagram library" }).click();
  await create(page, "Independent diagram");
  await expect(undo(page)).toBeDisabled();
  await expect(redo(page)).toBeDisabled();
  await page.getByRole("link", { name: "Back to diagram library" }).click();
  await page.getByRole("link", { name: "Gesture integrity", exact: true }).click();
  await expect(canvas(page)).toBeVisible();
  await expect(drawn(page)).toHaveCount(0);
  await expect(undo(page)).toBeDisabled();
  await expect(redo(page)).toBeDisabled();
});

test("CI-32 keyboard alternatives edit a connected group with scoped focus", async ({ page }) => {
  await page.goto("/");
  await create(page, "Keyboard flow");
  const insert = page.getByRole("button", { name: "Insert Process", exact: true });
  await insert.press("Enter");
  await expect(canvas(page)).toBeFocused();
  await insert.press("Enter");
  await expect(canvas(page)).toBeFocused();
  const outline = await canvas(page).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).not.toHaveId("diagram-canvas");
  await picker(page).press("ArrowUp");
  const source = await picker(page).inputValue();
  expect(source).toMatch(/^[0-9a-f-]{36}$/i);
  const width = field(page, "Width");
  const wider = String(Number(await width.inputValue()) + 40);
  await width.press("Control+a");
  await page.keyboard.insertText(wider);
  await page.keyboard.press("Enter");
  await expect(width).toHaveValue(wider);
  const connect = inspector(page).getByRole("button", { name: "Connect to…" });
  await connect.press("Enter");
  let dialog = page.getByRole("dialog", { name: "Connect to…" });
  await dialog.getByLabel("Target component").press("End");
  await dialog.getByRole("button", { name: "Connect", exact: true }).press("Enter");
  await expect(dialog).toHaveCount(0);
  const edge = page.locator(".connection-line");
  await expect(edge).toHaveAttribute("data-source", source);
  const edgeId = await edge.getAttribute("data-edge-id");
  const previousHandle = await edge.getAttribute("data-target-handle");
  const reconnect = inspector(page).getByRole("button", { name: "Reconnect target" });
  await reconnect.press("Enter");
  dialog = page.getByRole("dialog", { name: "Reconnect target" });
  await dialog.getByLabel("Replacement point").press("Home");
  await dialog.getByRole("button", { name: "Reconnect", exact: true }).press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(reconnect).toBeFocused();
  await expect(edge).toHaveAttribute("data-edge-id", edgeId!);
  await expect(edge).not.toHaveAttribute("data-target-handle", previousHandle!);
  await canvas(page).press("Control+a");
  await expect(inspector(page).getByText("3 objects selected")).toBeVisible();
  await inspector(page).getByRole("button", { name: "Group selection" }).press("Enter");
  await expect(page.locator(".diagram-frame")).toHaveCount(1);
  await canvas(page).press("Control+d");
  await expect(page.locator(".diagram-frame")).toHaveCount(2);
  await expect(edge).toHaveCount(2);
  await canvas(page).press("Delete");
  await expect(drawn(page)).toHaveCount(4);
  await expect(page.locator(".diagram-frame")).toHaveCount(1);
  await expect(edge).toHaveCount(1);
  await undo(page).press("Enter");
  await expect(edge).toHaveCount(2);
  await page.getByRole("button", { name: "Keyboard shortcuts" }).press("Enter");
  const help = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(help).toBeVisible();
  await expect(help.getByText("Nudge selection")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Keyboard shortcuts" })).toBeFocused();
});
