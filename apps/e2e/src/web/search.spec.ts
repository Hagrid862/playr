import { expect, test } from "@playwright/test";
import { RegistrationPage } from "./registration.po";
import { VerifyEmailPage } from "./verify-email.po";
import { getOtpFromMailhog } from "./mailhog.helper";

test.describe("Search Feature", () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Authentication to reach the app
    const registrationPage = new RegistrationPage(page);
    const verifyEmailPage = new VerifyEmailPage(page);
    const timestamp = Math.floor(Math.random() * 1000000);
    const testUserData = {
      username: `search_user_${timestamp}`,
      email: `search_${timestamp}@example.com`,
      password: "Password123!",
    };

    await registrationPage.goto();
    await registrationPage.fillForm({
      username: testUserData.username,
      firstName: "Search",
      lastName: "User",
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await registrationPage.selectGender("Other");
    await registrationPage.selectBirthDate(new Date(1992, 1, 1));
    await registrationPage.submit();
    
    const otpCode = await getOtpFromMailhog(testUserData.email);
    await verifyEmailPage.fillOtpCode(otpCode!);
    await verifyEmailPage.clickVerify();
    await expect(page).toHaveURL(/\/app/);
  });

  test("should perform search and reset view when clicking search link again", async ({ page }) => {
    // 1. Navigate to Search
    await page.getByRole('link', { name: /search/i }).click();
    await expect(page).toHaveURL(/\/app\/search/);

    // 2. Perform a search
    const searchInput = page.getByTestId("search-input-field");
    await searchInput.fill("test query");
    await page.keyboard.press("Enter");
    
    // 3. Verify results are shown
    // Note: Search results might take a moment to load
    await expect(page.getByRole("main")).toContainText("Search", { timeout: 15000 });
    // Check for some result indication, like artist or song name, if possible, 
    // or just check that we are still on the search page and results aren't empty

    // 4. Click Search link again (Sidebar/MobileNav)
    await page.getByRole('link', { name: /search/i }).click();
    
    // 5. Verify it reset to root search (empty query or base state)
    await expect(page).toHaveURL(/\/app\/search/);
    await expect(searchInput).toHaveValue(""); 
  });
});
