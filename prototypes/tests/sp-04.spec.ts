import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { expect, firefox, test } from "@playwright/test";

test("SP-04 downloads native SVG and matching 2x PNG with correct bounds and inert text", async ({ page }, info) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4174") requests.push(request.url());
  });
  await page.goto("/?sp=sp-04");
  const visual = page.getByRole("img", { name: "Portable scene" });
  await expect(visual).toBeVisible();
  await visual.screenshot({ path: info.outputPath("preview.png") });
  const getFile = async (extension: "SVG" | "PNG") => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download " + extension }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("sp-04." + extension.toLowerCase());
    const path = info.outputPath(file.suggestedFilename());
    await file.saveAs(path);
    return { path, data: await readFile(path) };
  };
  const exported = await getFile("SVG");
  const raster = await getFile("PNG");
  const result = await page.evaluate(async ({ markup, encoded }) => {
    const xml = new DOMParser().parseFromString(markup, "image/svg+xml");
    const exportedTags = [...new Set([...xml.querySelectorAll("*")].map((element) => element.localName))].sort();
    const bitmap = await createImageBitmap(await (await fetch("data:image/png;base64," + encoded)).blob());
    const canvas = Object.assign(document.createElement("canvas"), { width: bitmap.width, height: bitmap.height });
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const pixel = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    return {
      tags: exportedTags, lines: [...xml.querySelectorAll("tspan")].map((span) => span.textContent),
      viewBox: xml.documentElement.getAttribute("viewBox"),
      dimensions: [bitmap.width, bitmap.height],
      edges: [pixel(0, 0), pixel(bitmap.width - 1, bitmap.height - 1)],
      service: pixel(170, 265), arrow: pixel(756, 264), database: pixel(986, 300),
      unsafe: [...xml.querySelectorAll("*")].flatMap((node) => [...node.attributes])
        .filter((attr) => /^(on|href|src|style)/i.test(attr.name)).length,
    };
  }, { markup: exported.data.toString(), encoded: raster.data.toString("base64") });
  expect(result.tags).toEqual(["circle", "desc", "g", "path", "polygon", "polyline", "rect", "svg", "text", "title", "tspan"]);
  expect(result.lines).toEqual(["Service & worker", "Café — <script>"]);
  expect(result.viewBox).toBe("-72 -57 532 277");
  expect(result.dimensions).toEqual([1064, 554]);
  expect(result.edges).toEqual([[255, 255, 255, 255], [255, 255, 255, 255]]);
  expect(result.service).toEqual([219, 234, 254, 255]);
  expect(result.arrow).toEqual([51, 78, 104, 255]);
  expect(result.database).toEqual([232, 245, 233, 255]);
  expect(result.unsafe).toBe(0);
  let unexpectedDownload = false;
  page.on("download", () => { unexpectedDownload = true; });
  await page.getByRole("button", { name: "Try XML-incompatible label" }).click();
  await expect(page.getByRole("status")).toContainText("U+FFFE");
  expect(unexpectedDownload).toBe(false);
  expect(requests).toEqual([]);

  if (info.project.name === "chrome") {
    const viewer = await firefox.launch({ channel: undefined });
    try {
      const independent = await viewer.newPage({ viewport: { width: 1000, height: 650 } });
      await independent.goto(pathToFileURL(exported.path).href);
      const svg = independent.locator("svg");
      await expect(svg).toBeVisible();
      const glyphs = await independent.locator("tspan").evaluateAll((lines) =>
        lines.map((line) => {
          const bounds = (line as SVGGraphicsElement).getBBox();
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
        }));
      for (const line of glyphs) {
        expect(line.x + line.width).toBeLessThan(158);
        expect(line.y).toBeGreaterThan(61);
        expect(line.y + line.height).toBeLessThan(144);
      }
      await expect(independent.locator("text").filter({ hasText: "Proposed" })).toBeVisible();
      await svg.screenshot({ path: info.outputPath("independent-firefox.png") });
      console.info("SP-04 independent viewer Firefox " + viewer.version());
    } finally {
      await viewer.close();
    }
  }
});
