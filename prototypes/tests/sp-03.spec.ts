import { expect, test } from "@playwright/test";

test("SP-03 measures four anchors, draws routes, fits label bounds and reconnects through actual pointer events", async ({ page }) => {
  await page.goto("/?sp=sp-03");
  const node = (id: string) => page.locator(`.react-flow__node[data-id=${id}]`);
  const port = (id: string, side: string) => node(id).locator(`[data-handleid=${side}]`);
  const path = page.locator("path.react-flow__edge-path[id=connector]");
  const links = () => page.getByTestId("links").textContent().then((value) => JSON.parse(value!));
  const action = (label: string) => page.getByRole("button", { name: label }).click();
  await expect(path).toHaveAttribute("d", "M-30 -70 L180 100");
  const alpha = (await node("alpha").boundingBox())!;
  for (const [side, x, y] of [["north", .5, 0], ["east", 1, .5], ["south", .5, 1], ["west", 0, .5]] as const) {
    const box = (await port("alpha", side).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - (alpha.x + alpha.width * x))).toBeLessThanOrEqual(1);
    expect(Math.abs(box.y + box.height / 2 - (alpha.y + alpha.height * y))).toBeLessThanOrEqual(1);
  }
  await action("Resize alpha");
  await expect(path).toHaveAttribute("d", "M30 -55 L180 100");
  await action("Use orthogonal geometry");
  await expect(path).toHaveAttribute("d", "M30 -55 L50 -55 L105 -55 L105 100 L160 100 L180 100");
  await page.locator(".react-flow__edge[data-id=connector]").locator(".react-flow__edge-interaction")
    .evaluate((element) => element.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  const updater = page.locator(".react-flow__edge[data-id=connector] .react-flow__edgeupdater-target");
  await expect(updater).toBeAttached();
  const endpoint = async () => {
    const box = (await updater.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
  };
  const before = await links();
  await drag(await endpoint(), { x: 890, y: 450 });
  await expect(page.getByRole("status")).toHaveText("Reconnect cancelled");
  expect(await links()).toEqual(before);
  const gamma = (await port("gamma", "north").boundingBox())!;
  await drag(await endpoint(), { x: gamma.x + gamma.width / 2, y: gamma.y + gamma.height / 2 });
  await expect(page.getByRole("status")).toHaveText("Connection committed");
  expect((await links())[0]).toEqual({ ...before[0], target: "gamma", targetHandle: "north" });
  await expect(path).toHaveAttribute("d", /L270 240$/);

  await action("Fit full scene");
  const canvas = (await page.locator(".react-flow").boundingBox())!;
  for (const visible of [page.getByTestId("route-label"), node("alpha"), node("beta"), node("gamma"), path]) {
    const box = (await visible.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(canvas.x + 45);
    expect(box.y).toBeGreaterThanOrEqual(canvas.y + 45);
    expect(box.x + box.width).toBeLessThanOrEqual(canvas.x + canvas.width - 45);
    expect(box.y + box.height).toBeLessThanOrEqual(canvas.y + canvas.height - 45);
  }
  console.info("SP-03 browser " + page.context().browser()!.version());
});
