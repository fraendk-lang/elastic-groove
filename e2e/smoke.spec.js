// @ts-check
const { test, expect } = require("@playwright/test");

test.describe("Elastic Groove smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("eg-onboarded", "1");
    });
  });

  test("app shell loads with brand and demos entry", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/ELASTIC GROOVE|EG/)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: "DEMOS" })).toBeVisible();
  });

  test("demo picker opens from toolbar", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "DEMOS" }).click();
    await expect(page.getByText("DEMO SONGS")).toBeVisible();
  });
});
