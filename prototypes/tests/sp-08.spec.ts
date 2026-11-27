import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { benchmark } from "../sp-08/scene";
import type { BenchmarkSample } from "../sp-08/view";

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return {
    n: sorted.length,
    median: sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2,
    p95: sorted[Math.ceil(sorted.length * .95) - 1],
    max: sorted.at(-1),
  };
}

test("SP-08 records reference-scene interaction, commit, storage, export and memory baselines", async ({ page, context }, info) => {
  test.setTimeout(180_000);
  page.on("pageerror", (error) => console.error("SP-08 page error", error.message));
  const url = "/?sp=sp-08&db=nodary-sp08-" + randomUUID();
  const readyText = "100 nodes, 150 edges, 2 boundaries ready";
  await page.goto(url);
  await expect(page.getByRole("status")).toHaveText(readyText);
  await expect(page.locator(".react-flow__node")).toHaveCount(102);
  await expect(page.locator(".react-flow__edge")).toHaveCount(150);
  const coldOpen: number[] = [];
  for (let run = 0; run < 20; run++) {
    const fresh = await context.newPage();
    await fresh.goto(url);
    await expect(fresh.getByRole("status")).toHaveText(readyText);
    await fresh.waitForFunction(() => window.nodaryBenchmark);
    coldOpen.push(await fresh.evaluate(() => window.nodaryBenchmark!.openMs));
    await fresh.close();
  }
  await page.bringToFront();
  const node = page.locator(`.react-flow__node[data-id="${benchmark.nodes[0].id}"]`);
  const group = page.locator(`.react-flow__node[data-id="${benchmark.groups[0].id}"] .bench-group-grip`);
  const drag = async (start: { x: number; y: number }, duration: number, checkMovement = false) => {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.evaluate(() => window.nodaryBenchmark!.start());
    const started = performance.now();
    if (checkMovement) {
      const atRest = (await node.boundingBox())!.x;
      await page.mouse.move(start.x + 24, start.y + 12, { steps: 4 });
      await expect.poll(async () => (await node.boundingBox())!.x).toBeGreaterThan(atRest + 5);
    }
    while (performance.now() - started < duration) {
      const elapsed = performance.now() - started;
      await page.mouse.move(start.x + Math.sin(elapsed / 120) * 27, start.y + Math.sin(elapsed / 95) * 16);
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
    const intervals = await page.evaluate(() => window.nodaryBenchmark!.end());
    await page.mouse.up();
    expect(intervals.length).toBeGreaterThan(20);
    return intervals;
  };
  const center = async (locator: typeof node) => {
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  await page.evaluate(() => window.nodaryBenchmark!.viewport(1));
  const nodeDrag: number[][] = [];
  for (let run = 0; run < 10; run++) nodeDrag.push(await drag(await center(node), 3000, run === 0));
  const groupDrag = await drag(await center(group), 3000, true);
  const pan = await drag({ x: 1240, y: 110 }, 3000);
  await page.evaluate(() => window.nodaryBenchmark!.viewport(1));
  const resize = await page.evaluate(async () => {
    const bench = window.nodaryBenchmark!;
    bench.start();
    await bench.resizePreview(3000);
    return bench.end();
  });
  expect(resize.length).toBeGreaterThan(20);
  const scaleSamples = [];
  for (const zoom of [.25, 2]) {
    await page.evaluate((scale) => window.nodaryBenchmark!.viewport(scale), zoom);
    scaleSamples.push({ zoom, frames: await drag(await center(node), 700, true) });
  }

  const cdp = await context.newCDPSession(page);
  const warmup = 3;
  const samples: BenchmarkSample[] = [];
  const heap = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    return (await cdp.send("Runtime.getHeapUsage")).usedSize;
  };
  await page.evaluate(() => window.nodaryBenchmark!.prepareHistory());
  for (let run = 0; run < warmup; run++) await page.evaluate(() => window.nodaryBenchmark!.measure());
  const heapBefore = await heap();
  for (let run = 0; run < 20; run++) {
    const sample = await page.evaluate(() => window.nodaryBenchmark!.measure());
    expect(sample.bytes).toBeGreaterThan(0);
    expect(sample.raster[0] * sample.raster[1]).toBeLessThanOrEqual(16_777_216);
    samples.push(sample);
  }
  const heapAfter = await heap();
  await cdp.detach();
  const metrics = ["commit", "save", "json", "svg", "png"] as const;
  const summary = {
    coldOpen: stats(coldOpen), nodeDrag: stats(nodeDrag.flat()), groupDrag: stats(groupDrag), pan: stats(pan), resize: stats(resize),
    zoomDiagnostics: scaleSamples.map(({ zoom, frames }) => ({ zoom, ...stats(frames) })),
    timings: Object.fromEntries(metrics.map((metric) => [metric, stats(samples.map(({ durations }) => durations[metric]))])),
    heapBefore, heapAfter, heapDelta: heapAfter - heapBefore,
    png: { bytes: samples.at(-1)!.bytes, raster: samples.at(-1)!.raster },
  };
  console.info("SP-08", info.project.name, page.context().browser()!.version(), JSON.stringify(summary));
  await writeFile(info.outputPath("benchmark.json"), JSON.stringify({
    browser: info.project.name, version: page.context().browser()!.version(), summary,
    raw: { coldOpen, nodeDrag, groupDrag, pan, resize, scaleSamples, samples },
  }, null, 2) + "\n");
});
