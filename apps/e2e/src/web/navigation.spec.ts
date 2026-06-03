import { test, expect } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import { waitForAuthStorage } from "./fixtures/auth-storage.helper";
test.describe("Navigation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await createVerifiedUser(page, { prefix: "nav_user" });
  });

  test("should navigate through all main sidebar items", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);
    const artistsPage = new LibraryArtistsPage(page);

    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

    await dashboardPage.gotoLibraryOverview();
    await expect(page).toHaveURL(/\/app\/library\/overview/);

    await page.getByRole("link", { name: "Artists" }).click();
    await expect(page).toHaveURL(/\/app\/library\/artists/);

    await page.getByRole("link", { name: "Albums" }).click();
    await expect(page).toHaveURL(/\/app\/library\/albums/);

    await page.getByRole("link", { name: "Songs" }).click();
    await expect(page).toHaveURL(/\/app\/library\/songs/);

    await page.getByRole("link", { name: "Genres" }).click();
    await expect(page).toHaveURL(/\/app\/library\/genres/);

    await page.getByRole("link", { name: "Playlists" }).click();
    await expect(page).toHaveURL(/\/app\/playlists/);

    await artistsPage.gotoArtistsList();
    await expect(page).toHaveURL(/\/app\/library\/artists/);

    await page.goto("/app/search");
    await expect(page).toHaveURL(/\/app\/search/);
  });

  test("should persist authentication state on reload", async ({ page }) => {
    const dashboardPage = new DashboardPage(page);

    await waitForAuthStorage(page);
    await dashboardPage.gotoLibraryOverview();
    await expect(page).toHaveURL(/\/app\/library\/overview/);

    const sidebarTrigger = page
      .locator('button[data-sidebar="trigger"]')
      .first();
    const isMobile = await sidebarTrigger.isVisible();

    if (!isMobile) {
      await expect(dashboardPage.sidebar).toBeVisible({ timeout: 15000 });
    }

    await waitForAuthStorage(page);
    await page.reload();
    await expect(page).toHaveURL(/\/app\/library\/overview/, {
      timeout: 15000,
    });
    await expect(dashboardPage.sidebar).toBeVisible({ timeout: 15000 });
  });
});
