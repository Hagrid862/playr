import { expect, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { RegistrationPage } from "./registration.po";
import {getOtpFromMailhog} from "./mailhog.helper";
import {VerifyEmailPage} from "./verify-email.po";

test.describe("Library Management Workflow", () => {
  let verifyEmailPage: VerifyEmailPage;
  let registrationPage: RegistrationPage;
  let dashboardPage: DashboardPage;

  const timestamp = Date.now();
  const testUserData = {
    username: `lib_user_${timestamp}`,
    email: `lib_${timestamp}@example.com`,
    password: "Password123!",
  };

  test.beforeEach(async ({ page }) => {
    verifyEmailPage = new VerifyEmailPage(page);
    registrationPage = new RegistrationPage(page);
    dashboardPage = new DashboardPage(page);

    // Setup: Register and Login
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: testUserData.username,
      firstName: "Library",
      lastName: "User",
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await registrationPage.selectGender("Female");
    await registrationPage.selectBirthDate(new Date(1990, 0, 1));
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

  test("should create and view a private library", async ({ page }) => {
    // 1. Navigate to Library Overview
    await dashboardPage.gotoLibraryOverview();

    // 2. Verify empty state
    await expect(
      page.getByText("You don't have a private library yet."),
    ).toBeVisible();

    // 3. Create Library
    await dashboardPage.createLibrary();

    // 4. Verify Success state
    await expect(page.getByText("Your Private Library")).toBeVisible();
    await expect(page.getByText("Library ID:")).toBeVisible();

    // 5. Navigate away and back to ensure persistence
    await page.goto("/app");
    await dashboardPage.gotoLibraryOverview();
    await expect(page.getByText("Your Private Library")).toBeVisible();
  });
});
