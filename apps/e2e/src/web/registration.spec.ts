import { test, expect } from "@playwright/test";
import { RegistrationPage } from "./registration.po";

test.describe("Registration Workflow", () => {
  let registrationPage: RegistrationPage;

  test.beforeEach(async ({ page }) => {
    registrationPage = new RegistrationPage(page);
    await registrationPage.goto();
  });

  test("should successfully register a new user", async ({ page }) => {
    const timestamp = Date.now();
    const username = `user_${timestamp}`;
    const email = `user_${timestamp}@example.com`;

    await registrationPage.fillForm({
      username,
      firstName: "John",
      lastName: "Doe",
      email,
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    await registrationPage.selectGender("Male");

    // Select a birth date in the past
    const birthDate = new Date(2000, 0, 15);
    await registrationPage.selectBirthDate(birthDate);

    // Wait for the button to be enabled
    await expect(registrationPage.submitButton).toBeEnabled({ timeout: 10000 });
    await registrationPage.submit();

    // Check if there's any server error message if it doesn't redirect immediately
    await expect(registrationPage.page).toHaveURL(/\/auth\/login/, {
      timeout: 15000,
    });
  });

  test("should show validation errors for empty fields", async () => {
    // Instead of clicking the disabled button, we blur all fields to trigger validation
    await registrationPage.usernameInput.focus();
    await registrationPage.usernameInput.blur();
    await registrationPage.firstNameInput.focus();
    await registrationPage.firstNameInput.blur();
    await registrationPage.lastNameInput.focus();
    await registrationPage.lastNameInput.blur();
    await registrationPage.emailInput.focus();
    await registrationPage.emailInput.blur();
    await registrationPage.passwordInput.focus();
    await registrationPage.passwordInput.blur();

    await registrationPage.expectFieldError("Username", "Username is required");
    await registrationPage.expectFieldError(
      "First name",
      "First name is required",
    );
    await registrationPage.expectFieldError(
      "Last name",
      "Last name is required",
    );

    // Force blur on birth date and gender if they haven't been touched
    await registrationPage.birthDateButton.focus();
    await registrationPage.birthDateButton.blur();
    await registrationPage.genderSelect.focus();
    await registrationPage.genderSelect.blur();

    await registrationPage.expectFieldError(
      "Birth date",
      "Birth date is required",
    );
    await registrationPage.expectFieldError("Gender", "Gender is required");
    await registrationPage.expectFieldError("Email", "Email is required");
    await registrationPage.expectFieldError("Password", "Password is required");

    await registrationPage.confirmPasswordInput.focus();
    await registrationPage.confirmPasswordInput.blur();
    await registrationPage.expectFieldError(
      "Confirm password",
      "Please confirm your password",
    );
  });

  test("should validate username format", async () => {
    await registrationPage.usernameInput.fill("ab");
    await registrationPage.usernameInput.blur();
    await registrationPage.expectFieldError(
      "Username",
      "Username must be at least 3 characters",
    );

    await registrationPage.usernameInput.fill("Invalid User!");
    await registrationPage.usernameInput.blur();
    await registrationPage.expectFieldError(
      "Username",
      "Username can only contain lowercase letters, numbers, underscores, and dots",
    );
  });

  test("should validate age requirement", async () => {
    // Use the POM method that we've improved
    const thirteenYearsAgo = new Date();
    thirteenYearsAgo.setFullYear(thirteenYearsAgo.getFullYear() - 1); // 1 year old

    // Select Month and Year specifically to avoid confusion
    await registrationPage.selectBirthDate(thirteenYearsAgo);

    await registrationPage.expectFieldError(
      "Birth date",
      "You must be at least 13 years old to register",
    );
  });

  test("should validate password strength and match", async () => {
    // Length
    await registrationPage.passwordInput.fill("short");
    await registrationPage.passwordInput.blur();
    await registrationPage.expectFieldError(
      "Password",
      "Password must be at least 8 characters",
    );

    // Missing uppercase
    await registrationPage.passwordInput.fill("password123");
    await registrationPage.passwordInput.blur();
    await registrationPage.expectFieldError(
      "Password",
      "Password must contain at least one uppercase letter",
    );

    // Missing number
    await registrationPage.passwordInput.fill("Password");
    await registrationPage.passwordInput.blur();
    await registrationPage.expectFieldError(
      "Password",
      "Password must contain at least one number",
    );

    // Password match
    await registrationPage.passwordInput.fill("Password123!");
    await registrationPage.confirmPasswordInput.fill("Password123!");
    await registrationPage.confirmPasswordInput.blur();

    // Should not show error for matching passwords
    const error = registrationPage.page
      .locator('div[data-slot="field"]')
      .filter({
        has: registrationPage.page.locator('label:text-is("Confirm password")'),
      })
      .locator('[data-slot="field-error"]');
    await expect(error).not.toBeVisible();
  });

  test("should show password strength popover on focus", async () => {
    await registrationPage.passwordInput.fill("somepassword");
    await registrationPage.passwordInput.focus();
    await expect(
      registrationPage.page.getByText("At least 8 characters"),
    ).toBeVisible();
    await expect(
      registrationPage.page.getByText("One lowercase letter"),
    ).toBeVisible();
    await expect(
      registrationPage.page.getByText("One uppercase letter"),
    ).toBeVisible();
    await expect(registrationPage.page.getByText("One number")).toBeVisible();
    await expect(
      registrationPage.page.getByText("One special character"),
    ).toBeVisible();
    // Check that some requirements are met (this depends on how PasswordStrengthPopover is implemented)
    // Assuming it uses classes or icons to show status.
  });

  test("should navigate to login page", async () => {
    await registrationPage.loginLink.click();
    await expect(registrationPage.page).toHaveURL(/\/auth\/login/);
  });
});
