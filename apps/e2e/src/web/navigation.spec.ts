import { expect, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { RegistrationPage } from "./registration.po";
import { getOtpFromMailhog } from "./mailhog.helper";
import { VerifyEmailPage } from "./verify-email.po";

test.describe("Navigation Flow", () => {
  let verifyEmailPage: VerifyEmailPage;
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;
  let artistsPage: LibraryArtistsPage;

  let testUserData: {
    username: string;
    email: string;
    password: string;
  };

  test.beforeEach(async ({ page }) => {
    verifyEmailPage = new VerifyEmailPage(page);
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

    // 1. Should redirect to the email verification page with the user's email
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });
    await expect(verifyEmailPage.pageTitle).toBeVisible();
    await verifyEmailPage.expectEmailDisplayed(testUserData.email);

    // 2. Retrieve the OTP code sent via email (MailHog intercepts in dev/test)
    const otpCode = await getOtpFromMailhog(testUserData.email);
    expect(otpCode).not.toBeNull();
    expect(otpCode).toMatch(/^\d{8}$/);

    // 3. Enter the OTP and submit verification
    await verifyEmailPage.fillOtpCode(otpCode!);
    await expect(verifyEmailPage.verifyButton).toBeEnabled();
    await verifyEmailPage.clickVerify();

    // 4. Should redirect to the dashboard after email verification
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

    // Wait for auth state to be persisted in IndexedDB (auth store uses idb-keyval, not localStorage)
    await page.waitForFunction(
      () => {
        return new Promise<boolean>((resolve) => {
          try {
            const request = indexedDB.open("keyval-store");
            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction("keyval", "readonly");
              const store = tx.objectStore("keyval");
              const getReq = store.get("auth-storage");
              getReq.onsuccess = () => {
                db.close();
                resolve(getReq.result != null && getReq.result !== undefined);
              };
              getReq.onerror = () => {
                db.close();
                resolve(false);
              };
            };
            request.onerror = () => resolve(false);
          } catch {
            resolve(false);
          }
        });
      },
      { timeout: 15000 },
    );

    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check if we were redirected to login
    let currentUrl = page.url();
    const idbAuth = await page.evaluate(async () => {
      return new Promise<unknown>((resolve) => {
        try {
          const request = indexedDB.open("keyval-store");
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("keyval", "readonly");
            const store = tx.objectStore("keyval");
            const getReq = store.get("auth-storage");
            getReq.onsuccess = () => {
              db.close();
              resolve(getReq.result);
            };
            getReq.onerror = () => {
              db.close();
              resolve(null);
            };
          };
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    });
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
        `Session lost after reload: redirected to ${currentUrl}. IndexedDB auth: ${JSON.stringify(idbAuth)}`,
      );
    }

    await expect(page).toHaveURL(/\/app\/library\/overview/);
    await expect(dashboardPage.sidebar).toBeVisible({ timeout: 15000 });
  });
});
