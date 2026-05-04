import { type Locator, type Page, expect } from "@playwright/test";

export class VerifyEmailPage {
  readonly page: Page;
  readonly hiddenInput: Locator;
  readonly verifyButton: Locator;
  readonly resendButton: Locator;
  readonly logoutTriggerButton: Locator;
  readonly confirmLogoutButton: Locator;
  readonly cancelLogoutButton: Locator;
  readonly alertDialog: Locator;
  readonly emailDisplay: Locator;
  readonly fieldError: Locator;
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;

  constructor(page: Page) {
    this.page = page;
    // input-otp renders a hidden <input data-input-otp> that captures keyboard input
    this.hiddenInput = page.locator("input[data-input-otp]");
    this.verifyButton = page.getByRole("button", { name: "Verify" });
    this.resendButton = page.getByRole("button", { name: /Resend Code/i });
    this.logoutTriggerButton = page
      .getByRole("button", { name: /log out/i })
      .first();
    this.confirmLogoutButton = page
      .getByRole("alertdialog")
      .getByRole("button", { name: /log out/i });
    this.cancelLogoutButton = page.getByRole("alertdialog").getByRole("button", { name: "Cancel" });
    this.alertDialog = page.getByRole("alertdialog");
    this.emailDisplay = page.locator("span.font-medium.text-foreground");
    this.fieldError = page.locator('[data-slot="field-error"]');
    this.pageTitle = page
      .locator('[data-slot="card-title"]')
      .filter({ hasText: "Verify your Email" });
    this.pageDescription = page.locator("div.text-muted-foreground");
  }

  async goto(email?: string) {
    const url = email
      ? `/auth/verify-email?email=${encodeURIComponent(email)}`
      : "/auth/verify-email";
    await this.page.goto(url);
  }

  /** Enter the 8-digit OTP code into the hidden input-otp input field. */
  async fillOtpCode(code: string) {
    // The input has color: transparent, so force is needed for Playwright actionability
    await this.hiddenInput.fill(code, { force: true });
  }

  async clickVerify() {
    await this.verifyButton.click();
  }

  async clickResend() {
    await this.resendButton.click();
  }

  async clickLogoutTrigger() {
    await this.logoutTriggerButton.click();
  }

  async confirmLogout() {
    await this.confirmLogoutButton.click();
  }

  async cancelLogout() {
    await this.cancelLogoutButton.click();
  }

  async expectFieldError(error: string) {
    await expect(this.fieldError).toHaveText(error);
  }

  async expectFieldErrorNotVisible() {
    await expect(this.fieldError).not.toBeVisible();
  }

  async expectResendTimerVisible() {
    await expect(
      this.page.getByText(/Wait \d+s to Resend code/i),
    ).toBeVisible();
  }

  async expectAlertDialogVisible() {
    await expect(this.alertDialog).toBeVisible();
  }

  async expectAlertDialogNotVisible() {
    await expect(this.alertDialog).not.toBeVisible();
  }

  async expectEmailDisplayed(email: string) {
    await expect(this.emailDisplay).toContainText(email);
  }
}
