import { type Locator, type Page, expect } from "@playwright/test";

export class RegistrationPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly birthDateField: Locator;
  readonly birthDateButton: Locator;
  readonly genderField: Locator;
  readonly genderSelect: Locator;
  readonly emailInput: Locator;
  readonly passwordField: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly loginLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel("Username");
    this.firstNameInput = page.getByLabel("First name");
    this.lastNameInput = page.getByLabel("Last name");
    this.birthDateField = page
      .locator('div[data-slot="field"]')
      .filter({ has: page.locator('label:text-is("Birth date")') });
    this.birthDateButton = this.birthDateField.locator('[role="button"]');
    this.genderField = page
      .locator('div[data-slot="field"]')
      .filter({ has: page.locator('label:text-is("Gender")') });
    this.genderSelect = this.genderField.locator("button");
    this.emailInput = page.getByLabel("Email", { exact: true });
    this.passwordField = page
      .locator('div[data-slot="field"]')
      .filter({ has: page.locator('label:text-is("Password")') });
    this.passwordInput = page.getByLabel("Password", { exact: true });
    this.confirmPasswordInput = page.getByLabel("Confirm password");
    this.submitButton = page.getByRole("button", { name: "Create account" });
    this.loginLink = page.getByRole("link", {
      name: "Already have an account? Sign in!",
    });
    this.errorMessage = page.locator(".text-destructive").first();
  }

  async goto() {
    await this.page.goto("/auth/register");
  }

  async fillForm(data: {
    username?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }) {
    if (data.username !== undefined)
      await this.usernameInput.fill(data.username);
    if (data.firstName !== undefined)
      await this.firstNameInput.fill(data.firstName);
    if (data.lastName !== undefined)
      await this.lastNameInput.fill(data.lastName);
    if (data.email !== undefined) await this.emailInput.fill(data.email);
    if (data.password !== undefined)
      await this.passwordInput.fill(data.password);
    if (data.confirmPassword !== undefined)
      await this.confirmPasswordInput.fill(data.confirmPassword);
  }

  async selectGender(gender: string) {
    await this.genderSelect.click();
    // Wait for the listbox/portal to appear
    const option = this.page.getByRole("option", { name: gender, exact: true });
    await option.waitFor({ state: "visible" });
    await option.click();
  }

  async selectBirthDate(date: Date) {
    await this.birthDateButton.click();

    // Select year and month using dropdowns (captionLayout="dropdown")
    const year = date.getFullYear().toString();
    const monthValue = date.getMonth().toString(); // 0-11

    // Find the month and year selects within the popover.
    // React Day Picker uses aria-label for these selects.
    // They are often hidden (opacity-0) but interactive.
    const monthSelect = this.page
      .locator(
        'select.rdp-dropdown_month, select[aria-label="Month"], select[aria-label="Choose the Month"]',
      )
      .first();
    const yearSelect = this.page
      .locator(
        'select.rdp-dropdown_year, select[aria-label="Year"], select[aria-label="Choose the Year"]',
      )
      .first();

    await monthSelect.selectOption(monthValue);
    await yearSelect.selectOption(year);

    // Give it a moment to update the grid
    await this.page.waitForTimeout(500);

    const day = date.getDate().toString();
    // Try both button and gridcell roles, and be less strict with visibility if it's being stubborn
    const dayButton = this.page
      .locator('button:visible, [role="gridcell"]:visible')
      .filter({ hasText: new RegExp(`^${day}$`) })
      .first();
    await dayButton.click();
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectFieldError(label: string, error: string) {
    const field = this.page
      .locator('div[data-slot="field"]')
      .filter({ has: this.page.locator(`label:text-is("${label}")`) });
    await expect(field.locator('[data-slot="field-error"]')).toHaveText(error);
  }

  async expectSuccess() {
    try {
      await expect(this.page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
    } catch (e) {
      // If we failed, check if there's an error message on the page
      const errorMsg = await this.errorMessage.textContent();
      if (errorMsg) {
        console.error(`Registration failed with error: ${errorMsg}`);
      } else {
        console.error("Registration failed but no error message found.");
      }
      throw e;
    }
  }
}
