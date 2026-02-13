import { expect, test } from "@playwright/test";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";

test.describe("Auth Edge Cases", () => {
  let loginPage: LoginPage;
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    registrationPage = new RegistrationPage(page);
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

    // Expect global error message
    await expect(page.locator(".text-destructive")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".text-destructive")).toHaveText(
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

    // 2. Try to login with wrong password
    // MUST meet complexity requirements to enable the login button
    await loginPage.goto();
    await loginPage.login(user.email, "WrongPassword123!");

    await expect(page.locator(".text-destructive")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator(".text-destructive")).toHaveText(
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

    // Expect global error message for conflict
    await expect(page.locator(".text-destructive").first()).toBeVisible();
    await expect(page.locator(".text-destructive").first()).toHaveText(
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

    // Expect global error message
    await expect(page.locator(".text-destructive").first()).toBeVisible();
    await expect(page.locator(".text-destructive").first()).toHaveText(
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
});
