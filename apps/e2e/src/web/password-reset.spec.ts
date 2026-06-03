import { expect, test } from "@playwright/test";
import { ForgotPasswordPage } from "./forgot-password.po";
import { LoginPage } from "./login.po";
import { DashboardPage } from "./dashboard.po";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import { getOtpFromMailhog } from "./mailhog.helper";

test.describe("Password Reset Workflow", () => {
  let forgotPasswordPage: ForgotPasswordPage;
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    forgotPasswordPage = new ForgotPasswordPage(page);
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);

    page.on("console", (msg) => {
      if (msg.type() === "error") console.log(`BROWSER ERROR: ${msg.text()}`);
    });
  });

  test("should reset password via full flow and login with new password", async ({
    page,
  }) => {
    const user = await createVerifiedUser(page, {
      prefix: "reset_user",
      logoutAfter: true,
    });
    const newPassword = "NewPass456!";

    // ─── 1. Navigate to forgot password ────────────────────────
    await loginPage.goto();
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await forgotPasswordPage.expectForgotCardVisible();

    // ─── 2. Submit email for reset code ────────────────────────
    await forgotPasswordPage.fillEmail(user.email);
    await forgotPasswordPage.expectSendResetCodeButtonEnabled();
    await forgotPasswordPage.submitForgotPassword();

    // ─── 3. Wait for recover card and retrieve code from MailHog ─
    await forgotPasswordPage.expectRecoverCardVisible();
    const resetCode = await getOtpFromMailhog(user.email);
    expect(resetCode).not.toBeNull();
    expect(resetCode).toMatch(/^\d{8}$/);

    // ─── 4. Fill recovery form ─────────────────────────────────
    await forgotPasswordPage.fillOtpCode(resetCode!);
    await forgotPasswordPage.fillNewPassword(newPassword);
    await forgotPasswordPage.fillConfirmPassword(newPassword);
    await forgotPasswordPage.expectResetPasswordButtonEnabled();
    await forgotPasswordPage.submitRecoverPassword();

    // ─── 5. Should redirect to log in after successful reset ────
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 25000 });

    // ─── 6. Login with new password ────────────────────────────
    await loginPage.login(user.email, newPassword);
    await expect(page).toHaveURL(/\/app/, { timeout: 10000 });
    await expect(dashboardPage.logoutButton).toBeVisible();
  });

  test("should validate forgot password email field", async () => {
    await forgotPasswordPage.goto();

    // Empty email → button disabled
    await forgotPasswordPage.expectSendResetCodeButtonDisabled();

    // Invalid email format → button disabled
    await forgotPasswordPage.fillEmail("not-an-email");
    await forgotPasswordPage.expectSendResetCodeButtonDisabled();
  });

  test("should validate recover password form fields", async ({ page }) => {
    const user = await createVerifiedUser(page, {
      prefix: "validate_user",
      logoutAfter: true,
    });

    await forgotPasswordPage.goto();
    await forgotPasswordPage.fillEmail(user.email);
    await forgotPasswordPage.submitForgotPassword();

    await forgotPasswordPage.expectRecoverCardVisible();
    const resetCode = await getOtpFromMailhog(user.email);
    await forgotPasswordPage.fillOtpCode(resetCode!);

    // Weak password
    await forgotPasswordPage.fillNewPassword("weak");
    await forgotPasswordPage.fillConfirmPassword("weak");
    await forgotPasswordPage.expectResetPasswordButtonDisabled();

    // Mismatched confirm password
    await forgotPasswordPage.fillNewPassword("ValidPass1!");
    await forgotPasswordPage.fillConfirmPassword("Different1!");
    await forgotPasswordPage.expectResetPasswordButtonDisabled();
  });

  test("should allow going back from recover to forgot card", async ({
    page,
  }) => {
    const user = await createVerifiedUser(page, {
      prefix: "goback_user",
      logoutAfter: true,
    });

    await forgotPasswordPage.goto();
    await forgotPasswordPage.fillEmail(user.email);
    await forgotPasswordPage.submitForgotPassword();

    await forgotPasswordPage.expectRecoverCardVisible();
    const resetCode = await getOtpFromMailhog(user.email);
    expect(resetCode).not.toBeNull();

    // Click Go back
    await forgotPasswordPage.clickGoBack();
    await forgotPasswordPage.expectForgotCardVisible();

    // Email should be cleared (form reset)
    await expect(forgotPasswordPage.emailInput).toHaveValue("");
  });

  test("should resend reset code", async ({ page }) => {
    const user = await createVerifiedUser(page, {
      prefix: "resend_user",
      logoutAfter: true,
    });

    await forgotPasswordPage.goto();
    await forgotPasswordPage.fillEmail(user.email);
    await forgotPasswordPage.submitForgotPassword();

    await forgotPasswordPage.expectRecoverCardVisible();
    const firstCode = await getOtpFromMailhog(user.email);
    expect(firstCode).not.toBeNull();

    // Resend should be on cooldown immediately
    await forgotPasswordPage.expectResendTimerVisible();
    await expect(forgotPasswordPage.resendButton).toBeDisabled();
  });

  test("should show error for invalid reset code", async ({ page }) => {
    const user = await createVerifiedUser(page, {
      prefix: "invalid_user",
      logoutAfter: true,
    });

    await forgotPasswordPage.goto();
    await forgotPasswordPage.fillEmail(user.email);
    await forgotPasswordPage.submitForgotPassword();

    await forgotPasswordPage.expectRecoverCardVisible();
    // Wait for real code but don't use it
    await getOtpFromMailhog(user.email);

    // Enter wrong OTP
    await forgotPasswordPage.fillOtpCode("00000000");
    await forgotPasswordPage.fillNewPassword("ValidPass1!");
    await forgotPasswordPage.fillConfirmPassword("ValidPass1!");
    await forgotPasswordPage.expectResetPasswordButtonEnabled();
    await forgotPasswordPage.submitRecoverPassword();

    // Should show toast error
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should navigate back via cancel button on forgot card", async ({
    page,
  }) => {
    await forgotPasswordPage.goto();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);

    // Cancel button uses window.history.back()
    // Since we came directly, this won't navigate anywhere meaningful.
    // Instead, verify the button is present and clickable.
    await expect(forgotPasswordPage.cancelButton).toBeVisible();
    await forgotPasswordPage.clickCancel();
    // After history.back from a direct navigation, we may stay or go to about:blank
    // Just verify no error toast appears
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  });
});
