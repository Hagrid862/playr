import { expect, type Page } from "@playwright/test";
import { DashboardPage } from "../dashboard.po";
import { RegistrationPage } from "../registration.po";
import { VerifyEmailPage } from "../verify-email.po";
import { getOtpFromMailhog } from "../mailhog.helper";
import { gotoAppShell } from "./auth-storage.helper";
import {
  DEFAULT_TEST_PASSWORD,
  uniqueEmail,
  uniqueUsername,
} from "../test-data.helper";

export interface VerifiedUser {
  username: string;
  email: string;
  password: string;
}

export interface CreateVerifiedUserOptions {
  prefix?: string;
  logoutAfter?: boolean;
  firstName?: string;
  lastName?: string;
  gender?: "Male" | "Female" | "Other";
  birthDate?: Date;
}

/**
 * Registers a new user, verifies email via MailHog, and lands on /app.
 * Optionally logs out afterward (e.g. password-reset flows).
 */
export async function createVerifiedUser(
  page: Page,
  options: CreateVerifiedUserOptions = {},
): Promise<VerifiedUser> {
  const prefix = options.prefix ?? "e2e_user";
  const username = uniqueUsername(prefix);
  const email = uniqueEmail(prefix);
  const password = DEFAULT_TEST_PASSWORD;

  const registrationPage = new RegistrationPage(page);
  const verifyEmailPage = new VerifyEmailPage(page);
  const dashboardPage = new DashboardPage(page);

  await registrationPage.goto();
  await registrationPage.fillForm({
    username,
    firstName: options.firstName ?? "Test",
    lastName: options.lastName ?? "User",
    email,
    password,
    confirmPassword: password,
  });
  await registrationPage.selectGender(options.gender ?? "Male");
  await registrationPage.selectBirthDate(
    options.birthDate ?? new Date(2000, 0, 15),
  );
  await registrationPage.confirmPasswordInput.blur();
  await expect(registrationPage.submitButton).toBeEnabled({
    timeout: 30000,
  });
  await registrationPage.submit();
  await registrationPage.expectSuccess();

  await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 15000 });
  const otpCode = await getOtpFromMailhog(email);
  expect(otpCode).not.toBeNull();
  expect(otpCode).toMatch(/^\d{8}$/);

  await verifyEmailPage.fillOtpCode(otpCode!);
  await expect(verifyEmailPage.verifyButton).toBeEnabled();
  await verifyEmailPage.clickVerify();
  await expect(page).toHaveURL(/\/app/, { timeout: 15000 });

  if (options.logoutAfter) {
    await dashboardPage.logout();
    await expect(page).toHaveURL(/\/auth\/login/);
  } else {
    await gotoAppShell(page);
  }

  return { username, email, password };
}
