import { expect, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";

test.describe("Authentication Workflow", () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;

  const timestamp = Date.now();
  const testUserData = {
    username: `auth_user_${timestamp}`,
    email: `auth_${timestamp}@example.com`,
    password: "Password123!",
    firstName: "Auth",
    lastName: "Tester",
  };

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
    dashboardPage = new DashboardPage(page);

    // Log console messages for debugging
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`BROWSER ERROR: ${msg.text()}`);
    });
  });

  test("should register manually and then login", async ({ page }) => {
    // 1. Registration
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: testUserData.username,
      firstName: testUserData.firstName,
      lastName: testUserData.lastName,
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await registrationPage.selectGender("Male");
    // Select a date that is definitely in the past and reachable
    await registrationPage.selectBirthDate(new Date(1990, 5, 15));

    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // Wait for the URL change or check for error message
    try {
      await registrationPage.expectSuccess();
    } catch (e) {
      const error = await page
        .locator('[data-slot="field-error"]')
        .allTextContents();
      console.log("Registration failed with errors:", error);
      throw e;
    }

    // 2. Login
    await loginPage.goto();
    await loginPage.login(testUserData.email, testUserData.password);
    await expect(page).toHaveURL(/\/app/, { timeout: 10000 });

    // 3. Session Persistence (Reload)
    await page.reload();
    await expect(page).toHaveURL(/\/app/);
    await expect(dashboardPage.logoutButton).toBeVisible();

    // 4. Logout
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test("should validate login form fields", async () => {
    await loginPage.goto();

    // Email invalid format
    await loginPage.emailInput.fill("invalid");
    await loginPage.emailInput.blur();
    await loginPage.expectFieldError("Email", "Invalid email address");

    // Password too short (using a format that passes regexes to isolate length error)
    await loginPage.passwordInput.fill("A1aPass"); // 7 chars, passes A-Z, a-z, 0-9
    await loginPage.passwordInput.blur();
    await loginPage.expectFieldError(
      "Password",
      "Password must be at least 8 characters",
    );
  });
});
