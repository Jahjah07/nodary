import { expect, test } from "@playwright/test";

test("SP-01: library and direct editor reload resolve the local sample", async ({ page, baseURL, browser }, testInfo) => {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) problems.push(message.text());
  });
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== baseURL) problems.push(request.url());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) problems.push(`${response.status()} ${response.url()}`);
  });
  testInfo.annotations.push({ type: "browser-version", description: browser.version() });
  console.info(`${testInfo.project.name}: ${browser.version()}`);

  expect((await page.goto("/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Nodary diagram library" })).toBeVisible();
  await page.getByRole("link", { name: "Open sample diagram" }).click();
  await expect(page).toHaveURL(/\/editor\/\?id=00000000-0000-4000-8000-000000000001$/);
  const sample = page.getByRole("region", { name: "Read-only sample diagram" });
  await expect(sample.getByText("Sample service", { exact: true })).toBeVisible();

  expect((await page.goto("/editor/?id=fixture"))?.status()).toBe(200);
  await expect(page.getByRole("region", { name: "Read-only sample diagram" })).toBeVisible();
  await expect(sample.getByText("Sample service", { exact: true })).toBeVisible();
  expect((await page.reload())?.status()).toBe(200);
  await expect(page).toHaveURL(/\/editor\/\?id=fixture$/);
  await expect(sample.getByText("Sample service", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Back to diagram library" }).click();
  await expect(page.getByRole("heading", { name: "Nodary diagram library" })).toBeVisible();
  expect(problems).toEqual([]);
});

test("SP-01: an unknown or missing ID opens a recoverable empty shell", async ({ page, request }) => {
  for (const path of ["/editor/?id=unknown", "/editor/"]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole("status")).toHaveText("Diagram not found.");
    await expect(page.getByRole("link", { name: "Back to diagram library" })).toBeVisible();
  }
  expect((await request.get("/editor/fixture/")).status()).toBe(404);
});

test.describe("SP-01: static HTML", () => {
  test.use({ javaScriptEnabled: false });

  test("the editor shell is served before client initialization", async ({ page }) => {
    expect((await page.goto("/editor/?id=fixture"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Diagram editor" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Opening diagram…");
    await expect(page.getByText("Sample service")).toHaveCount(0);
  });
});
