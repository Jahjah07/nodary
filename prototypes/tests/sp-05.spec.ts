import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const action = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
const status = (page: Page) => page.getByRole("status");
const title = (page: Page, value: string) => page.getByRole("textbox", { name: "Title" }).fill(value);

async function inspect(page: Page, expected: string | null, revision?: number) {
  await action(page, "Read storage");
  const output = page.getByTestId("storage");
  if (expected === null) await expect(output).toHaveText("null");
  else {
    await expect(output).toContainText(`"title":"${expected}"`);
    expect(JSON.parse((await output.textContent())!).revision).toBe(revision);
  }
}

test("SP-05 two real same-origin tabs race CAS and stale deletion cannot resurrect data", async ({ page, context }) => {
  const url = "/?sp=sp-05&db=nodary-sp05-" + randomUUID();
  await page.goto(url);
  await expect(status(page)).toHaveText("No stored document");
  await action(page, "Seed document");
  await expect(status(page)).toHaveText("Created");
  const other = await context.newPage();
  await Promise.all([other.goto(url), page.reload()]);
  for (const tab of [page, other]) {
    await expect(status(tab)).toHaveText("Loaded");
    await expect(tab.getByTestId("revision")).toHaveText("0");
  }
  await Promise.all([title(page, "Tab A"), title(other, "Tab B")]);
  await Promise.all([action(page, "Save"), action(other, "Save")]);
  for (const tab of [page, other]) await expect(status(tab)).toHaveText(/Transaction committed|Revision conflict/);
  const outcomes = await Promise.all([status(page).textContent(), status(other).textContent()]);
  expect(outcomes.filter((message) => message === "Transaction committed")).toHaveLength(1);
  expect(outcomes.filter((message) => message?.includes("Revision conflict"))).toHaveLength(1);
  const [winner, loser, storedTitle, backupTitle] = outcomes[0] === "Transaction committed"
    ? [page, other, "Tab A", "Tab B"] as const : [other, page, "Tab B", "Tab A"] as const;
  await inspect(winner, storedTitle, 1);
  await expect(loser.getByTestId("backup")).toContainText(backupTitle);
  await expect(loser.getByTestId("dirty")).toHaveText("dirty");
  await action(loser, "Delete stored record");
  await expect(status(loser)).toHaveText("Deleted");
  await title(winner, "Stale edit");
  await action(winner, "Save");
  await expect(status(winner)).toContainText("Document was deleted");
  await inspect(winner, null);
  await expect(winner.getByTestId("backup")).toContainText("Stale edit");
});

test("SP-05 real abort rolls back, injected quota preserves edits, and later edits stay dirty until saved", async ({ page }) => {
  await page.goto("/?sp=sp-05&db=nodary-sp05-" + randomUUID());
  await expect(status(page)).toHaveText("No stored document");
  await action(page, "Seed document");
  await expect(status(page)).toHaveText("Created");
  await title(page, "Pending");
  await action(page, "Abort after write request");
  await expect(status(page)).toContainText("AbortError");
  await inspect(page, "Seed", 0);
  await expect(page.getByTestId("backup")).toContainText("Pending");
  await action(page, "Inject quota failure");
  await expect(status(page)).toContainText("QuotaExceededError");
  await inspect(page, "Seed", 0);
  await expect(page.getByTestId("dirty")).toHaveText("dirty");
  await action(page, "Edit during save");
  await expect(status(page)).toHaveText("Transaction committed");
  await inspect(page, "Pending", 1);
  await expect(page.getByTestId("backup")).toContainText("Pending + newer edit");
  await expect(page.getByTestId("dirty")).toHaveText("dirty");
  await action(page, "Save");
  await expect(page.getByTestId("revision")).toHaveText("2");
  await inspect(page, "Pending + newer edit", 2);
  await expect(page.getByTestId("dirty")).toHaveText("clean");
});
