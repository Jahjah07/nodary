import { expect, test, type Page, type TestInfo } from "@playwright/test";
import type { StoredDocument } from "../../src/application/document-repository";
import type { PortableDiagram } from "../../src/core/contracts";

test.use({ viewport: { width: 1500, height: 990 } });
const status = (page: Page) => page.locator("[data-save-state]");
const canvas = (page: Page) => page.getByRole("region", { name: "Diagram canvas" });
const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
const library = (page: Page) => page.getByRole("link", { name: "Back to diagram library" });
const recovery = (page: Page) => page.getByRole("region", { name: "Storage recovery" });
const libraryAlert = (page: Page) => page.getByRole("main").getByRole("alert");
const process = (page: Page) => page.locator('.projection [data-component="flow.process"]');
const dbName = "diagramming-system";

async function create(page: Page, title: string) {
  await page.goto("/");
  await button(page, "New diagram").click();
  await page.getByRole("textbox", { name: "Diagram name" }).fill(title);
  await button(page, "Create diagram").click();
  await expect(status(page)).toHaveText("Saved locally");
  return new URL(page.url()).searchParams.get("id")!;
}
async function picture(page: Page, info: TestInfo, file: string) {
  if (info.project.name === "chrome") await page.screenshot({ path: info.outputPath(`${file}.png`) });
}
async function read(page: Page) {
  return page.evaluate((name) => new Promise<{
    rows: StoredDocument[]; views: { documentId: string; viewport: PortableDiagram["viewport"] }[];
    preferences: unknown[]; version: number;
  }>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["documents", "viewports", "preferences"]);
      const rows = tx.objectStore("documents").getAll();
      const views = tx.objectStore("viewports").getAll();
      const preferences = tx.objectStore("preferences").getAll();
      tx.oncomplete = () => { db.close(); resolve({ rows: rows.result, views: views.result, preferences: preferences.result, version: db.version }); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), dbName);
}
const stored = async (page: Page, id: string) => (await read(page)).rows.find((row) => row.id === id)!;

async function injectFaults(page: Page) {
  await page.addInitScript(() => {
    const native = IDBObjectStore.prototype.put;
    const add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (value: unknown, key?: IDBValidKey) {
      if (this.name === "viewports" && document.documentElement.dataset.storageFault === "view-add") {
        throw new DOMException("Injected second-write abort", "AbortError");
      }
      return key === undefined ? add.call(this, value) : add.call(this, value, key);
    };
    IDBObjectStore.prototype.put = function (value: unknown, key?: IDBValidKey) {
      const flags = document.documentElement.dataset;
      const mode = this.name === "documents" ? flags.storageFault : undefined;
      if (mode === "quota") throw new DOMException("Injected test quota", "QuotaExceededError");
      const request = key === undefined ? native.call(this, value) : native.call(this, value, key);
      if (mode === "abort") request.addEventListener("success", () => this.transaction.abort(), { once: true });
      if (mode === "hold") request.addEventListener("success", () => {
        flags.writeStarted = "true";
        const end = Date.now() + 10000;
        const keepAlive = () => {
          if (flags.storageFault === "hold" && Date.now() < end) {
            this.get("__synthetic_keepalive__").onsuccess = keepAlive;
          }
        };
        keepAlive();
      }, { once: true });
      return request;
    };
  });
}
async function fault(page: Page, mode: "hold" | "abort" | "quota" | "view-add" | "") {
  await page.evaluate((mode) => { document.documentElement.dataset.storageFault = mode; }, mode);
}
async function download(page: Page, action: () => Promise<void>) {
  const event = page.waitForEvent("download");
  await action();
  const file = await event;
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  expect(await file.failure()).toBeNull();
  return { filename: file.suggestedFilename(), content: JSON.parse(Buffer.concat(chunks).toString("utf8")) as PortableDiagram };
}

test("PE-07/09/10/18/20 real writes acknowledge captured generations and flush navigation", async ({ page }, info) => {
  test.setTimeout(60_000);
  await injectFaults(page);
  const id = await create(page, "Committed revisions");
  expect((await read(page)).version).toBe(10);
  expect((await stored(page, id)).revision).toBe(1);
  await fault(page, "hold");
  await button(page, "Insert Process").click();
  await expect(status(page)).toHaveText("Unsaved changes");
  await picture(page, info, "unsaved");
  await expect(status(page)).toHaveText("Saving");
  await expect(page.locator("html")).toHaveAttribute("data-write-started", "true");
  await button(page, "Insert Decision").click();
  await expect(status(page)).toHaveText("Saving");
  await expect(page.locator('.projection [data-component="flow.decision"]')).toHaveCount(1);
  await fault(page, "");
  await expect(status(page)).toHaveText("Saved locally");
  expect((await stored(page, id)).content.nodes).toHaveLength(2);
  expect((await stored(page, id)).revision).toBe(3);
  await picture(page, info, "saved");
  const beforeView = await stored(page, id);
  await button(page, "Zoom in").click();
  await expect.poll(async () => (await read(page)).views[0]?.viewport?.zoom).toBe(1.2);
  expect(await stored(page, id)).toEqual(beforeView);
  await expect(button(page, "Undo")).toBeEnabled();
  await button(page, "Undo").click();
  await expect(status(page)).toHaveText("Saved locally");
  expect((await stored(page, id)).revision).toBe(4);
  expect((await stored(page, id)).content.nodes).toHaveLength(1);
  await button(page, "Redo").click();
  await expect(status(page)).toHaveText("Saved locally");
  expect((await stored(page, id)).revision).toBe(5);
  expect((await stored(page, id)).content.nodes).toHaveLength(2);
  await button(page, "Undo").click();
  await library(page).click();
  await expect(page.getByRole("link", { name: "Committed revisions", exact: true })).toBeVisible();
  expect((await stored(page, id)).revision).toBe(6);
  await page.getByRole("link", { name: "Committed revisions", exact: true }).click();
  await expect(process(page)).toHaveCount(1);
  await expect(button(page, "Undo")).toBeDisabled();
  await expect(button(page, "Redo")).toBeDisabled();
  await expect(page.getByLabel("Zoom level")).toHaveText("120%");
  await page.reload();
  await expect(status(page)).toHaveText("Saved locally");
  await expect(process(page)).toHaveCount(1);
  expect((await stored(page, id)).revision).toBe(6);
  const diagram = (await stored(page, id)).content;
  const point = (await process(page).boundingBox())!;
  await page.mouse.move(point.x + point.width / 2, point.y + point.height / 2);
  await page.mouse.down();
  await page.mouse.move(point.x + point.width / 2 + 45, point.y + point.height / 2 + 31, { steps: 6 });
  expect((await process(page).boundingBox())!.x).toBeGreaterThan(point.x);
  expect((await stored(page, id)).content).toEqual(diagram);
  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("PE-03/04/05/11/12/27 abort, quota, latest backup, independent copy and confirmed delete", async ({ page }, info) => {
  test.setTimeout(60_000);
  await injectFaults(page);
  const id = await create(page, "Recovery map");
  await button(page, "Insert Process").click();
  await expect(status(page)).toHaveText("Saved locally");
  const initial = await stored(page, id);
  await fault(page, "abort");
  await button(page, "Insert Decision").click();
  await expect(status(page)).toHaveText("Save failed");
  await expect(recovery(page)).toContainText("transaction was aborted");
  expect(await stored(page, id)).toEqual(initial);
  await fault(page, "quota");
  await button(page, "Retry save").click();
  await expect(recovery(page)).toContainText("quota was exceeded");
  await button(page, "Insert Document").click();
  await expect(page.locator(".projection .diagram-node")).toHaveCount(3);
  await library(page).click();
  await expect(button(page, "Retry and leave")).toBeVisible();
  await picture(page, info, "recovery");
  const backup = await download(page, () => recovery(page).getByRole("button", { name: "Download editable backup" }).click());
  expect(backup.filename).toBe("Recovery map.json");
  expect(Object.keys(backup.content)).toEqual(["document", "viewport"]);
  expect(backup.content.document.id).toBe(id);
  expect(backup.content.document.nodes.map(({ type }) => type)).toEqual(["flow.process", "flow.decision", "flow.document"]);
  expect(await stored(page, id)).toEqual(initial);
  await expect(page.getByText("Download started.", { exact: true })).toBeVisible();
  await button(page, "Stay in editor").click();
  await fault(page, "view-add");
  await button(page, "Duplicate diagram Recovery map").click();
  const copyDialog = page.getByRole("dialog", { name: "Duplicate diagram" });
  await copyDialog.getByRole("button", { name: "Duplicate diagram", exact: true }).click();
  await expect(copyDialog.getByRole("alert")).toContainText("transaction was aborted");
  expect((await read(page)).rows).toEqual([initial]);
  await expect(page.locator(".projection .diagram-node")).toHaveCount(3);
  await fault(page, "quota");
  await copyDialog.getByRole("button", { name: "Duplicate diagram", exact: true }).click();
  await expect(copyDialog).toHaveCount(0);
  const copy = (await read(page)).rows.find((row) => row.id !== id)!;
  expect(copy.title).toBe("Recovery map (copy)");
  expect(copy.revision).toBe(1);
  for (const [index, node] of copy.content.nodes.entries()) {
    expect(backup.content.document.nodes.some((source) => source.id === node.id)).toBe(false);
    expect(node).toEqual({ ...backup.content.document.nodes[index], id: node.id });
  }
  expect(await stored(page, id)).toEqual(initial);

  await fault(page, "");
  await button(page, "Retry save").click();
  await expect(status(page)).toHaveText("Saved locally");
  expect((await stored(page, id)).content).toEqual(backup.content.document);
  await button(page, "Rename diagram Recovery map").click();
  const rename = page.getByRole("dialog", { name: "Rename diagram" });
  const title = rename.getByRole("textbox", { name: "Diagram name" });
  await title.fill("   ");
  await rename.getByRole("button", { name: "Rename diagram" }).click();
  await expect(rename.getByRole("alert")).toBeVisible();
  await title.fill("X".repeat(121));
  await rename.getByRole("button", { name: "Rename diagram" }).click();
  await expect(rename.getByRole("alert")).toBeVisible();
  expect((await stored(page, id)).revision).toBe(initial.revision + 1);
  await title.fill("Recovery map");
  await rename.getByRole("button", { name: "Rename diagram" }).click();
  await expect(rename).toHaveCount(0);
  expect((await stored(page, id)).revision).toBe(initial.revision + 1);
  await button(page, "Rename diagram Recovery map").click();
  await title.fill("Recovered design");
  await rename.getByRole("button", { name: "Rename diagram" }).click();
  await expect(status(page)).toHaveText("Saved locally");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recovered design", exact: true })).toBeVisible();
  await button(page, "Zoom in").click();
  await expect.poll(async () => (await read(page)).views.some((entry) => entry.documentId === id)).toBe(true);
  await library(page).click();
  await expect(page.getByRole("link", { name: "Recovered design", exact: true })).toBeVisible();
  await picture(page, info, "library");
  await button(page, "Delete diagram Recovered design").click();
  const deletion = page.getByRole("dialog", { name: "Delete diagram" });
  await deletion.getByRole("button", { name: "Cancel" }).click();
  expect((await stored(page, id)).title).toBe("Recovered design");
  await button(page, "Delete diagram Recovered design").click();
  await deletion.getByRole("button", { name: "Delete diagram" }).click();
  await expect(page.getByRole("link", { name: "Recovered design", exact: true })).toHaveCount(0);
  const remaining = await read(page);
  expect(remaining.rows.map(({ id }) => id)).toEqual([copy.id]);
  expect(remaining.views.map(({ documentId }) => documentId)).not.toContain(id);
  await page.reload();
  await expect(page.getByRole("link", { name: "Recovery map (copy)", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Recovered design", exact: true })).toHaveCount(0);
});

test("PE-13/14/15/16/17 live tabs retain their revisions, detect conflicts and cannot resurrect a deletion", async ({ page, context }) => {
  test.setTimeout(60_000);
  await context.addInitScript(() => { Object.defineProperty(globalThis, "BroadcastChannel", { value: undefined, configurable: true }); });
  const id = await create(page, "Shared design");
  const href = page.url();
  const peer = await context.newPage();
  await peer.goto(href);
  await expect(status(peer)).toHaveText("Saved locally");
  await Promise.all([button(page, "Insert Process").click(), button(peer, "Insert Decision").click()]);
  await expect.poll(async () => [await status(page).innerText(), await status(peer).innerText()].sort())
    .toEqual(["Changes conflict", "Saved locally"]);
  const loser = await status(page).innerText() === "Changes conflict" ? page : peer;
  const winner = loser === page ? peer : page;
  const first = await stored(winner, id);
  expect(first.revision).toBe(2);
  expect(first.content.nodes).toHaveLength(1);
  await loser.once("dialog", (dialog) => void dialog.dismiss());
  await button(loser, "Reload latest").click();
  await expect(status(loser)).toHaveText("Changes conflict");
  await button(loser, "Save as independent copy").click();
  await expect(loser.getByRole("heading", { name: "Shared design (copy)", exact: true })).toBeVisible();
  expect(await stored(winner, id)).toEqual(first);
  const copy = (await read(winner)).rows.find((row) => row.id !== id)!;
  expect(copy.revision).toBe(1);
  expect(copy.content.nodes).toHaveLength(1);
  expect(copy.content.nodes[0].type).not.toBe(first.content.nodes[0].type);

  await loser.goto(href);
  await expect(status(loser)).toHaveText("Saved locally");
  const listing = await context.newPage();
  await listing.goto(new URL("/", href).href);
  await button(listing, "Delete diagram Shared design").click();
  const deletion = listing.getByRole("dialog", { name: "Delete diagram" });
  await button(winner, "Insert Document").click();
  await expect(status(winner)).toHaveText("Saved locally");
  await deletion.getByRole("button", { name: "Delete diagram" }).click();
  await expect(deletion.getByRole("alert")).toContainText("changed or was deleted");
  expect((await stored(winner, id)).revision).toBe(3);
  await deletion.getByRole("button", { name: "Cancel" }).click();
  await loser.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(status(loser)).toHaveText("Changes conflict");
  await button(loser, "Insert Database").click();
  await expect(loser.locator('.projection [data-component="arch.database"]')).toHaveCount(1);
  loser.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Discard your unsaved changes");
    await dialog.accept();
  });
  await button(loser, "Reload latest").click();
  await expect(status(loser)).toHaveText("Saved locally");
  await expect(loser.locator(".projection .diagram-node")).toHaveCount(2);
  await button(listing, "Delete diagram Shared design").click();
  await deletion.getByRole("button", { name: "Delete diagram" }).click();
  await expect(listing.getByRole("link", { name: "Shared design", exact: true })).toHaveCount(0);
  await button(loser, "Insert Data store").click();
  await button(loser, "Zoom out").click();
  await expect(status(loser)).toHaveText("Changes conflict");
  await expect(loser.getByText("The viewport could not be saved. Diagram content is unaffected.")).toBeVisible();
  const remaining = await read(listing);
  expect(remaining.rows.map(({ id }) => id)).toEqual([copy.id]);
  expect(remaining.views.map(({ documentId }) => documentId)).not.toContain(id);
});

test("PE-22 unavailable storage reports the failure separately from an empty library", async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => { throw new DOMException("Synthetic denial", "SecurityError"); };
  });
  await page.goto("/");
  await expect(libraryAlert(page)).toContainText("Browser storage is unavailable");
  await expect(page.getByText("No diagrams yet")).toHaveCount(0);
  await expect(button(page, "New diagram")).toBeDisabled();
  await button(page, "Retry storage").click();
  await expect(libraryAlert(page)).toContainText("Browser storage is unavailable");
});

test("PE-39 blocks unsafe storage versions and keeps the active graph available for download", async ({ page, context }) => {
  test.setTimeout(60_000);
  const id = await create(page, "Version-safe diagram");
  await button(page, "Insert Process").click();
  await expect(status(page)).toHaveText("Saved locally");
  const before = await stored(page, id);
  const other = await context.newPage();
  await other.goto(new URL("/editor/?id=missing", page.url()).href);
  await other.evaluate((name) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 20);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { request.result.close(); resolve(); };
  }), dbName);
  await expect(status(page)).toHaveText("Save failed");
  await expect(recovery(page)).toContainText("cannot use the current storage version");
  await button(page, "Insert Decision").click();
  const backup = await download(page, () => recovery(page).getByRole("button", { name: "Download editable backup" }).click());
  expect(backup.content.document.nodes).toHaveLength(2);
  await other.goto(new URL("/", page.url()).href);
  await expect(libraryAlert(other)).toContainText("cannot use the current storage version");
  expect((await read(other)).version).toBe(20);
  expect(await stored(other, id)).toEqual(before);
});

test("PE-39 blocked upgrade reports an open tab and retries after that connection closes", async ({ page, context, baseURL }) => {
  test.setTimeout(45_000);
  const holder = await context.newPage();
  await holder.route("**/phase09-storage-fixture", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html>" }));
  await holder.goto(`${baseURL}/phase09-storage-fixture`);
  await holder.evaluate((name) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      const documents = db.createObjectStore("documents", { keyPath: "id" });
      documents.createIndex("updatedAt", "updatedAt");
      documents.createIndex("category", "category");
      db.createObjectStore("viewports", { keyPath: "documentId" });
      db.createObjectStore("preferences", { keyPath: "key" });
    };
    request.onsuccess = () => {
      const db = request.result;
      window.addEventListener("release-storage-fixture", () => db.close(), { once: true });
      resolve();
    };
  }), dbName);
  await page.goto("/");
  await expect(libraryAlert(page)).toContainText("Storage is blocked by another tab");
  await expect(page.getByText("No diagrams yet")).toHaveCount(0);
  await holder.evaluate(() => window.dispatchEvent(new Event("release-storage-fixture")));
  await button(page, "Retry storage").click();
  await expect(page.getByText("No diagrams yet")).toBeVisible();
  expect((await read(page)).version).toBe(10);
});

test("PE-21 damaged records are preserved and the healthy diagram opens with safe view and preference defaults", async ({ page }) => {
  const id = await create(page, "Usable diagram");
  const good = await stored(page, id);
  const invalidId = "dd9e6ad3-7d54-4d0c-8901-b91d283f00aa";
  const broken = { ...good, id: invalidId, schemaVersion: 2 };
  await page.evaluate(({ name, id, broken }) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["documents", "viewports", "preferences"], "readwrite");
      tx.objectStore("documents").add(broken);
      tx.objectStore("viewports").put({ documentId: id, viewport: { x: 15, y: 20, zoom: 50 } });
      tx.objectStore("preferences").put({ key: "panels", value: { components: null, properties: false } });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }), { name: dbName, id, broken });
  await page.reload();
  await expect(canvas(page)).toBeVisible();
  await expect(page.getByLabel("Zoom level")).toHaveText("100%");
  await expect(page.getByRole("complementary", { name: "Component library" })).toBeVisible();
  await expect(page.getByText(/saved viewport is invalid/)).toBeVisible();
  await expect(page.getByText(/saved panel preferences are invalid/)).toBeVisible();
  await expect(button(page, "Undo")).toBeDisabled();
  await library(page).click();
  await expect(libraryAlert(page)).toContainText("stored diagram is unavailable");
  await expect(page.getByRole("link", { name: "Usable diagram", exact: true })).toBeVisible();
  expect(await stored(page, invalidId)).toEqual(broken);
});

test("PE-18/19 draft preparation protects navigation and reload restores the last committed graph", async ({ page }) => {
  await injectFaults(page);
  const id = await create(page, "Draft safety");
  const beforeUnload = () => page.evaluate(() =>
    !window.dispatchEvent(new Event("beforeunload", { cancelable: true })));
  await button(page, "Insert Process").click();
  await expect(status(page)).toHaveText("Saved locally");
  expect(await beforeUnload()).toBe(false);
  const label = page.getByRole("textbox", { name: "Label", exact: true });
  await label.fill("Rejected\uFFFF draft");
  await expect.poll(beforeUnload).toBe(true);
  await library(page).click();
  await expect(label).toBeFocused();
  await expect(label).toHaveValue("Rejected\uFFFF draft");
  expect((await stored(page, id)).content.nodes[0].label).toBe("Process");
  await label.fill("Committed before navigation");
  await library(page).click();
  await expect(page.getByRole("link", { name: "Draft safety", exact: true })).toBeVisible();
  expect((await stored(page, id)).content.nodes[0].label).toBe("Committed before navigation");
  await page.getByRole("link", { name: "Draft safety", exact: true }).click();
  await expect(process(page)).toHaveCount(1);
  await fault(page, "quota");
  await button(page, "Insert Decision").click();
  await expect(status(page)).toHaveText("Save failed");
  let unloaded = false;
  page.once("dialog", async (warning) => { unloaded = warning.type() === "beforeunload"; await warning.accept(); });
  await page.reload();
  await expect(status(page)).toHaveText("Saved locally");
  expect(unloaded).toBe(true);
  await expect(page.locator(".projection .diagram-node")).toHaveCount(1);
  await expect(button(page, "Undo")).toBeDisabled();
  expect(await beforeUnload()).toBe(false);
});
