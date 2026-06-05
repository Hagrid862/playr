import { expect, test } from "@playwright/test";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";

test.describe("Smoke tests", () => {
  test("landing page shows Playr title when logged out", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Playr/);
  });

  test("logged-in user visiting landing redirects to app", async ({ page }) => {
    await createVerifiedUser(page, { prefix: "smoke_user" });
    await page.goto("/");
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });
  });

  test("placeholder app routes render expected copy", async ({ page }) => {
    await createVerifiedUser(page, { prefix: "smoke_routes" });

    await page.goto("/app");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();

    await page.goto("/app/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();

    await page.goto("/app/new");
    await expect(page.getByRole("heading", { name: "New" })).toBeVisible();
  });
});
