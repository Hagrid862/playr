import { expect, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { RegistrationPage } from "./registration.po";
import { VerifyEmailPage } from "./verify-email.po";
import { deleteAllMailhogMessages, getOtpFromMailhog } from "./mailhog.helper";

test.describe("Email Verification Workflow", () => {
  let registrationPage: RegistrationPage;
  let verifyEmailPage: VerifyEmailPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    verifyEmailPage = new VerifyEmailPage(page);
    dashboardPage = new DashboardPage(page);

    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`BROWSER ERROR: ${msg.text()}`);
    });

    // Clear MailHog so each test gets only its own OTPs
    await deleteAllMailhogMessages();
  });

  test("should register, verify email, and access the app", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const email = `verify_${timestamp}@example.com`;

    // 1. Register a new user
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: `verify_user_${timestamp}`,
      firstName: "Verify",
      lastName: "Test",
      email,
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1990, 5, 15));
    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // 2. Should redirect to the email verification page with the user's email
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });
    await expect(verifyEmailPage.pageTitle).toBeVisible();
    await verifyEmailPage.expectEmailDisplayed(email);

    // 3. Retrieve the OTP code sent via email (MailHog intercepts in dev/test)
    const otpCode = await getOtpFromMailhog(email);
    expect(otpCode).not.toBeNull();
    expect(otpCode).toMatch(/^\d{8}$/);

    // 4. Enter the OTP and submit verification
    await verifyEmailPage.fillOtpCode(otpCode!);
    await expect(verifyEmailPage.verifyButton).toBeEnabled();
    await verifyEmailPage.clickVerify();

    // 5. Should redirect to the app home page
    await expect(page).toHaveURL(/\/app$/, { timeout: 15000 });

    // 6. User should be authenticated (logout button visible)
    await expect(dashboardPage.logoutButton).toBeVisible();

    // 7. Session should persist across page reload
    await page.reload();
    await expect(page).toHaveURL(/\/app$/);
    await expect(dashboardPage.logoutButton).toBeVisible();
  });

  test("should show error for invalid OTP code", async ({ page }) => {
    const timestamp = Date.now();
    const email = `bad_otp_${timestamp}@example.com`;

    // 1. Register a new user
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: `bad_otp_user_${timestamp}`,
      firstName: "Bad",
      lastName: "Otp",
      email,
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    await registrationPage.selectGender("Female");
    await registrationPage.selectBirthDate(new Date(1992, 3, 20));
    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // 2. Should reach the verified email page
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });

    // 3. Submit an invalid OTP
    await verifyEmailPage.fillOtpCode("12345678");
    await expect(verifyEmailPage.verifyButton).toBeEnabled();
    await verifyEmailPage.clickVerify();

    // 4. Should stay on the verify-email page (not redirected to app)
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 10000 });

    // 5. The OTP input should still be interactable
    await expect(verifyEmailPage.verifyButton).toBeEnabled();
  });

  test("should resend verification code and verify with new OTP", async ({
    page,
  }) => {
    const timestamp = Date.now();
    const email = `resend_${timestamp}@example.com`;

    // 1. Register
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: `resend_user_${timestamp}`,
      firstName: "Resend",
      lastName: "Test",
      email,
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    await registrationPage.selectGender("Male");
    await registrationPage.selectBirthDate(new Date(1995, 7, 10));
    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // 2. Should reach the verified email page
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });

    // 3. Click the resend code button
    await verifyEmailPage.clickResend();

    // 4. Should show a cooldown timer on the resend button
    await verifyEmailPage.expectResendTimerVisible();

    // 5. Retrieve the new OTP from MailHog
    const otpCode = await getOtpFromMailhog(email);
    expect(otpCode).not.toBeNull();
    expect(otpCode).toMatch(/^\d{8}$/);

    // 6. Verify with the new code
    await verifyEmailPage.fillOtpCode(otpCode!);
    await verifyEmailPage.clickVerify();
    await expect(page).toHaveURL(/\/app$/, { timeout: 15000 });
    await expect(dashboardPage.logoutButton).toBeVisible();
  });

  test("should allow logout during email verification", async ({ page }) => {
    const timestamp = Date.now();
    const email = `logout_verify_${timestamp}@example.com`;

    // 1. Register
    await registrationPage.goto();
    await registrationPage.fillForm({
      username: `logout_user_${timestamp}`,
      firstName: "Logout",
      lastName: "Verify",
      email,
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    await registrationPage.selectGender("Female");
    await registrationPage.selectBirthDate(new Date(1998, 1, 5));
    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // 2. Should reach the verified email page
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });

    // 3. Click logout trigger - alert dialog should open
    await verifyEmailPage.clickLogoutTrigger();
    await verifyEmailPage.expectAlertDialogVisible();

    // 4. Cancel logout - dialog should close
    await verifyEmailPage.cancelLogout();
    await verifyEmailPage.expectAlertDialogNotVisible();

    // 5. Open the dialog again and confirm the logout
    console.log("DEBUG: Clicking logout trigger");
    await verifyEmailPage.clickLogoutTrigger();
    await verifyEmailPage.expectAlertDialogVisible();

    console.log("DEBUG: Confirming logout in dialog");
    await verifyEmailPage.confirmLogout();

    // 6. Should be redirected to the login page
    console.log("DEBUG: Waiting for redirect to /auth/login");
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
    console.log("DEBUG: Redirect successful");
  });

  test("should redirect to login when accessing verify-email without a user session", async ({
    page,
  }) => {
    // Try accessing the verify-email page directly without registration
    await page.goto("/auth/verify-email?email=test@example.com");
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 10000 });
  });
});
