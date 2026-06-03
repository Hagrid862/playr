import { test, expect } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
test.describe("Library Management Workflow", () => {
  test("should create and view a private library", async ({ page }) => {
    await createVerifiedUser(page, { prefix: "lib_user" });

    const dashboardPage = new DashboardPage(page);
    await dashboardPage.gotoLibraryOverview();

    const libraryNotCreated = page.getByText(
      "You don't have a private library yet.",
    );
    const libraryCreated = page.getByText("Your Private Library");
    await expect(libraryNotCreated.or(libraryCreated)).toBeVisible({
      timeout: 15000,
    });
    if (!(await libraryCreated.isVisible())) {
      await dashboardPage.createLibrary();
    }

    await expect(page.getByText("Your Private Library")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Library ID:")).toBeVisible();

    await page.goto("/app");
    await dashboardPage.gotoLibraryOverview();
    await expect(page.getByText("Your Private Library")).toBeVisible();
  });
});
