import { type Locator, type Page, expect } from "@playwright/test";

export class ForgotPasswordPage {
  readonly page: Page;

  // Forgot Password Card
  readonly forgotCardTitle: Locator;
  readonly emailInput: Locator;
  readonly sendResetCodeButton: Locator;
  readonly cancelButton: Locator;

  // Recover Password Card
  readonly recoverCardTitle: Locator;
  readonly otpHiddenInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly resendButton: Locator;
  readonly resetPasswordButton: Locator;
  readonly goBackButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Forgot password locators
    this.forgotCardTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: "Recover your password" });
    this.emailInput = page.getByLabel("Email", { exact: true });
    this.sendResetCodeButton = page.getByRole("button", {
      name: /Send Reset Code/i,
    });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });

    // Recover password locators
    this.recoverCardTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: "Reset your password" });
    this.otpHiddenInput = page.locator("input[data-input-otp]");
    this.newPasswordInput = page.getByLabel("New Password", { exact: false });
    this.confirmPasswordInput = page.getByLabel("Confirm Password", {
      exact: true,
    });

    this.resendButton = page
      .getByRole("button")
      .filter({ hasText: /Resend Code|Wait \d+s to resend/ });

    this.resetPasswordButton = page
      .getByRole("button")
      .filter({ hasText: /Reset Password/i });

    this.goBackButton = page.getByRole("button", { name: "Go back" });
  }

  async goto() {
    await this.page.goto("/auth/forgot-password");
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async submitForgotPassword() {
    await this.sendResetCodeButton.click();
  }

  async fillOtpCode(code: string) {
    await this.otpHiddenInput.fill(code, { force: true });
  }

  async fillNewPassword(password: string) {
    await this.newPasswordInput.fill(password);
  }

  async fillConfirmPassword(password: string) {
    await this.confirmPasswordInput.fill(password);
  }

  async submitRecoverPassword() {
    await this.resetPasswordButton.click();
  }

  async clickResend() {
    await this.resendButton.click();
  }

  async clickGoBack() {
    await this.goBackButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async expectForgotCardVisible() {
    await expect(this.forgotCardTitle).toBeVisible();
  }

  async expectRecoverCardVisible() {
    await expect(this.recoverCardTitle).toBeVisible();
  }

  async expectFieldError(label: string, error: string) {
    const field = this.page
      .locator('div[data-slot="field"]')
      .filter({ has: this.page.locator(`label:text-is("${label}")`) });
    await expect(field.locator('[data-slot="field-error"]')).toHaveText(error);
  }

  async expectSendResetCodeButtonDisabled() {
    await expect(this.sendResetCodeButton).toBeDisabled();
  }

  async expectSendResetCodeButtonEnabled() {
    await expect(this.sendResetCodeButton).toBeEnabled();
  }

  async expectResetPasswordButtonDisabled() {
    await expect(this.resetPasswordButton).toBeDisabled();
  }

  async expectResetPasswordButtonEnabled() {
    await expect(this.resetPasswordButton).toBeEnabled();
  }

  async expectResendTimerVisible() {
    await expect(this.page.getByText(/Wait \d+s to resend/)).toBeVisible();
  }
}
