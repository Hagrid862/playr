import { expect, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";
import { LibraryArtistsPage } from "./library-artists.po";

test.describe("Navigation Flow", () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;
  let artistsPage: LibraryArtistsPage;

  let testUserData: {
    username: string;
    email: string;
    password: string;
  };

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
    dashboardPage = new DashboardPage(page);
    artistsPage = new LibraryArtistsPage(page);

    const timestamp = Math.floor(Math.random() * 1000000);
    testUserData = {
      username: `nav_user_${timestamp}`,
      email: `nav_${timestamp}@example.com`,
      password: "Password123!",
    };

    // Setup: Register and Login
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: testUserData.username,
      firstName: "Nav",
      lastName: "User",
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await registrationPage.selectGender("Other");
    await registrationPage.selectBirthDate(new Date(1992, 1, 1));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    await loginPage.goto();
    await loginPage.login(testUserData.email, testUserData.password);
    await expect(page).toHaveURL(/\/app/);
  });

  test("should navigate through all main sidebar items", async ({ page }) => {
    // 1. Dashboard (Default)
    await expect(page).toHaveURL(/\/app/);

    // 2. Library Overview
    await dashboardPage.gotoLibraryOverview();
    await expect(page).toHaveURL(/\/app\/library\/overview/);

    // 3. Artists
    await artistsPage.gotoArtistsList();
    await expect(page).toHaveURL(/\/app\/library\/artists/);

    // 4. Albums (Direct navigation as PO might not exist yet)
    await page.goto("/app/library/albums");
    await expect(page).toHaveURL(/\/app\/library\/albums/);

    // 5. Search
    await page.goto("/app/search");
    await expect(page).toHaveURL(/\/app\/search/);
  });

  test("should persist authentication state on reload", async ({ page }) => {
    // Add telemetry for localStorage
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function (key, value) {
        const length =
          value != null && typeof value === "string" ? value.length : "unknown";
        console.log(
          `TELEMETRY: localStorage.setItem('${key}', valueLength=${length})`,
        );
        originalSetItem.apply(this, [key, value]);
      };
    });

    await page.goto("/app/library/overview");
    await page.waitForLoadState("networkidle");
    // Verify we are on Library Overview
    await expect(page).toHaveURL(/\/app\/library\/overview/);

    // Check if we are in mobile view - if sidebar trigger is visible, sidebar might be hidden
    // Note: There are two sidebar triggers (mobile and desktop), so we use .first() to avoid strict mode violation
    const sidebarTrigger = page
      .locator('button[data-sidebar="trigger"]')
      .first();
    const isMobile = await sidebarTrigger.isVisible();

    if (!isMobile) {
      await expect(dashboardPage.sidebar).toBeVisible({ timeout: 15000 });
    }

    // Wait for localStorage to be populated
    await page.waitForFunction(
      () => {
        try {
          return localStorage.getItem("auth-storage") !== null;
        } catch {
          return false;
        }
      },
      { timeout: 5000 },
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check if we were redirected to login
    let currentUrl = page.url();
    const localStorageAuth = await page.evaluate(() =>
      localStorage.getItem("auth-storage"),
    );
    console.log(`URL after reload: ${currentUrl}`);

    if (currentUrl.includes("/auth/login")) {
      console.log("Redirected to login, attempting recovery...");
      await page.waitForTimeout(2000);
      await page.goto("/app/library/overview");
      await page.waitForLoadState("networkidle");
      currentUrl = page.url();
    }

    if (currentUrl.includes("/auth/login")) {
      throw new Error(
        `Session lost after reload: redirected to ${currentUrl}. LocalStorage auth: ${localStorageAuth}`,
      );
    }

    await expect(page).toHaveURL(/\/app\/library\/overview/);
    await expect(dashboardPage.sidebar).toBeVisible({ timeout: 15000 });

    await expect(page).toHaveURL(/\/app\/library\/overview/);
    await expect(dashboardPage.sidebar).toBeVisible({ timeout: 15000 });
  });
});
