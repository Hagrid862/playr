import { type Locator, type Page, expect } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly registerLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel("Email", { exact: true });
    this.passwordInput = page.getByLabel("Password", { exact: true });
    this.submitButton = page.getByRole("button", { name: "Login" });
    this.registerLink = page.getByRole("link", {
      name: "Don't have an account? Sign up!",
    });
    this.forgotPasswordLink = page.getByRole("link", {
      name: "Forgot password?",
    });
  }

  async goto() {
    await this.page.goto("/auth/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectFieldError(label: string, error: string) {
    const field = this.page
      .locator('div[data-slot="field"]')
      .filter({ has: this.page.locator(`label:text-is("${label}")`) });
    await expect(field.locator('[data-slot="field-error"]')).toHaveText(error);
  }
}
