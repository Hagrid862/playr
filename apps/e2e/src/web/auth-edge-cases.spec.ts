import { expect, test } from "@playwright/test";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";
import { getOtpFromMailhog } from "./mailhog.helper";
import { VerifyEmailPage } from "./verify-email.po";
import { DashboardPage } from "./dashboard.po";

test.describe("Auth Edge Cases", () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;
  let verifyEmailPage: VerifyEmailPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
    verifyEmailPage = new VerifyEmailPage(page);
    dashboardPage = new DashboardPage(page);
  });

  // ─── Login Failures ──────────────────────────────────────────────

  test("should show error for invalid credentials", async ({ page }) => {
    await loginPage.goto();
    // Use a random email that doesn't exist
    // Password must meet complexity requirements: 8 chars, 1 upper, 1 lower, 1 number
    await loginPage.login(
      `nonexistent_${Date.now()}@example.com`,
      "WrongPass123!",
    );

    // Expect Sonner toast error message
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-sonner-toast]").first()).toHaveText(
      /Invalid credentials|User not found/i,
    );
  });

  test("should show error for correct email but wrong password", async ({
    page,
  }) => {
    // 1. Create a user first
    const timestamp = Date.now();
    const user = {
      username: `edge_user_${timestamp}`,
      email: `edge_${timestamp}@example.com`,
      password: "Password123!",
    };

    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user.username,
      firstName: "Edge",
      lastName: "Case",
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1995, 5, 15));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    // 2. Should redirect to the email verification page with the user's email
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });
    await expect(verifyEmailPage.pageTitle).toBeVisible();
    await verifyEmailPage.expectEmailDisplayed(user.email);

    // 3. Retrieve the OTP code sent via email (MailHog intercepts in dev/test)
    const otpCode = await getOtpFromMailhog(user.email);
    expect(otpCode).not.toBeNull();
    expect(otpCode).toMatch(/^\d{8}$/);

    // 4. Enter the OTP and submit verification
    await verifyEmailPage.fillOtpCode(otpCode!);
    await expect(verifyEmailPage.verifyButton).toBeEnabled();
    await verifyEmailPage.clickVerify();

    // 5. Should redirect to the dashboard after email verification
    await expect(page).toHaveURL(/\/app/);

    // 6. log out to test login
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/auth\/login/);

    // 7. Try to log in with the wrong password
    // MUST meet complexity requirements to enable the login button
    await loginPage.goto();
    await loginPage.login(user.email, "WrongPassword123!");

    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-sonner-toast]").first()).toHaveText(
      /Invalid credentials/i,
    );
  });

  // ─── Registration Conflicts ──────────────────────────────────────

  test("should prevent duplicate username registration", async ({ page }) => {
    const timestamp = Date.now();
    const user1 = {
      username: `duplicate_user_${timestamp}`,
      email: `first_${timestamp}@example.com`,
      password: "Password123!",
    };
    const user2 = {
      username: user1.username, // SAME USERNAME
      email: `second_${timestamp}@example.com`, // Different email
      password: "Password123!",
    };

    // Register User 1
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user1.username,
      firstName: "User",
      lastName: "One",
      email: user1.email,
      password: user1.password,
      confirmPassword: user1.password,
    });
    await registrationPage.selectGender("Female");
    await registrationPage.selectBirthDate(new Date(1995, 5, 15));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    // Wait to avoid rate limiting
    await page.waitForTimeout(3000);

    // Try to register User 2 with same username
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user2.username,
      firstName: "User",
      lastName: "Two",
      email: user2.email,
      password: user2.password,
      confirmPassword: user2.password,
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1998, 2, 10));
    await registrationPage.submit();

    // Expect Sonner toast error message for conflict
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator("[data-sonner-toast]").first()).toHaveText(
      /taken|exists|duplicate/i,
    );
  });

  test("should prevent duplicate email registration", async ({ page }) => {
    const timestamp = Date.now();
    const user1 = {
      username: `unique_user_${timestamp}`,
      email: `duplicate_${timestamp}@example.com`,
      password: "Password123!",
    };
    const user2 = {
      username: `other_user_${timestamp}`, // Different username
      email: user1.email, // SAME EMAIL
      password: "Password123!",
    };

    // Register User 1
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user1.username,
      firstName: "User",
      lastName: "One",
      email: user1.email,
      password: user1.password,
      confirmPassword: user1.password,
    });
    await registrationPage.selectGender("Female");
    await registrationPage.selectBirthDate(new Date(1995, 5, 15));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    // Wait to avoid rate limiting
    await page.waitForTimeout(3000);

    // Try to register User 2 with same email
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user2.username,
      firstName: "User",
      lastName: "Two",
      email: user2.email,
      password: user2.password,
      confirmPassword: user2.password,
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1998, 2, 10));
    await registrationPage.submit();

    // Expect Sonner toast error message
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible();
    await expect(page.locator("[data-sonner-toast]").first()).toHaveText(
      /taken|exists|duplicate/i,
    );
  });

  // ─── Session Handling ────────────────────────────────────────────

  test("should redirect to login when accessing protected route without session", async ({
    page,
  }) => {
    // Ensure we are logged out (new context/page always starts clean, but good to be explicit mentally)
    await page.goto("/app/library/overview");

    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should clean up local session and redirect even if server logout fails", async ({
    page,
  }) => {
    // 1. Create a user first to have a valid session
    const timestamp = Date.now();
    const user = {
      username: `logout_fail_${timestamp}`,
      email: `logout_fail_${timestamp}@example.com`,
      password: "Password123!",
    };

    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user.username,
      firstName: "Logout",
      lastName: "Tester",
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1990, 5, 15));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    // Retrieve OTP and verify
    const otpCode = await getOtpFromMailhog(user.email);
    expect(otpCode).not.toBeNull();
    await verifyEmailPage.fillOtpCode(otpCode!);
    await verifyEmailPage.clickVerify();

    // Verify redirected to app
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

    // 2. Intercept logout API and force it to return a 500 error
    await page.route("**/auth/logout", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Internal Server Error" }),
      });
    });

    // 3. Trigger logout
    await dashboardPage.logout();

    // 4. Assert client still logs out and redirects to login
    await expect(page).toHaveURL(/\/auth\/login/);

    // 5. Try to navigate back to a protected route and verify we are redirected back to login
    await page.goto("/app/library/overview");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should clean up local session and redirect when manual logout fails with 401 Unauthorized", async ({
    page,
  }) => {
    // 1. Create a user first to have a valid session
    const timestamp = Date.now();
    const user = {
      username: `logout_401_${timestamp}`,
      email: `logout_401_${timestamp}@example.com`,
      password: "Password123!",
    };

    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user.username,
      firstName: "Logout",
      lastName: "Tester",
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1990, 5, 15));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    // Retrieve OTP and verify
    const otpCode = await getOtpFromMailhog(user.email);
    expect(otpCode).not.toBeNull();
    await verifyEmailPage.fillOtpCode(otpCode!);
    await verifyEmailPage.clickVerify();

    // Verify redirected to app
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

    // 2. Intercept logout API and force it to return a 401 error
    await page.route("**/auth/logout", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Session expired" } }),
      });
    });

    // 3. Trigger logout
    await dashboardPage.logout();

    // 4. Assert client still logs out and redirects to login
    await expect(page).toHaveURL(/\/auth\/login/);

    // 5. Try to navigate back to a protected route and verify we are redirected back to login
    await page.goto("/app/library/overview");
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should automatically log out and redirect to login when token refresh fails with 401", async ({
    page,
  }) => {
    // 1. Create a user first to have a valid session
    const timestamp = Date.now();
    const user = {
      username: `refresh_fail_${timestamp}`,
      email: `refresh_fail_${timestamp}@example.com`,
      password: "Password123!",
    };

    await registrationPage.goto();
    await registrationPage.fillForm({
      username: user.username,
      firstName: "Refresh",
      lastName: "Tester",
      email: user.email,
      password: user.password,
      confirmPassword: user.password,
    });
    await registrationPage.selectGender("Female");
    await registrationPage.selectBirthDate(new Date(1990, 5, 15));
    await registrationPage.submit();
    await registrationPage.expectSuccess();

    // Retrieve OTP and verify
    const otpCode = await getOtpFromMailhog(user.email);
    expect(otpCode).not.toBeNull();
    await verifyEmailPage.fillOtpCode(otpCode!);
    await verifyEmailPage.clickVerify();

    // Verify redirected to app
    await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

    // 2. Mock 401 response on any API fetch to '/library'
    await page.route("**/library", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Unauthorized" } }),
      });
    });

    // 3. Mock 401 response on token refresh endpoint
    await page.route("**/auth/refresh", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "Session expired" } }),
      });
    });

    // 4. Trigger the protected request by navigating to library overview
    await dashboardPage.gotoLibraryOverview();

    // 5. Assert we are automatically logged out and redirected to login page due to failed refresh
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });

    // 6. Assert "Session expired" Toast error is shown
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toHaveText(/Session expired/i);
  });
});
