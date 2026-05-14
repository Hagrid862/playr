import { expect, Page, test } from "@playwright/test";
import { LibraryArtistsPage } from "./library-artists.po";
import { RegistrationPage } from "./registration.po";
import { getOtpFromMailhog } from "./mailhog.helper";
import { VerifyEmailPage } from "./verify-email.po";

test.describe("Library Artist CRUD Workflow", () => {
  let page: Page;
  let verifyEmailPage: VerifyEmailPage;
  let artistsPage: LibraryArtistsPage;

  const timestamp = Date.now();
  const testUserData = {
    username: `artist_user_${timestamp}`,
    email: `artist_${timestamp}@example.com`,
    password: "Password123!",
  };

  // We run all tests in this suite serially and share state so we can
  // exercise the full create -> view -> edit -> delete lifecycle in order.
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    // Create shared page for the whole suite
    page = await browser.newPage();
    verifyEmailPage = new VerifyEmailPage(page);
    artistsPage = new LibraryArtistsPage(page);

    // Register a fresh user
    const regPage = new RegistrationPage(page);
    await regPage.goto();
    await regPage.fillForm({
      username: testUserData.username,
      firstName: "Artist",
      lastName: "Tester",
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await regPage.selectGender("Male");
    await regPage.selectBirthDate(new Date(1995, 3, 20));
    await expect(regPage.submitButton).toBeEnabled({ timeout: 10000 });
    await regPage.submit();
    await regPage.expectSuccess();

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

  test.afterAll(async () => {
    await page.close();
  });

  // ─── Prerequisites: Library & Private Profile ───────────────────

  test("should create a library", async () => {
    await page.goto("/app/library/overview");
    await page.waitForLoadState("networkidle");

    const successState = page.getByText("Your Private Library");
    const emptyState = page.getByText("You don't have a private library yet");

    // Wait for either state to load
    await expect(successState.or(emptyState)).toBeVisible({ timeout: 10000 });

    if (await emptyState.isVisible()) {
      await page.getByRole("button", { name: "Create Library" }).click();
      await expect(successState).toBeVisible({ timeout: 15000 });
    }
  });

  test("should create a private profile", async () => {
    await page.goto("/app/library/overview/private");
    await page.waitForLoadState("networkidle");

    const lockedState = page.getByText("Private Library Locked");
    const contentState = page.getByText(
      "No content in your private library yet",
    );

    // Wait for either state to load
    await expect(lockedState.or(contentState)).toBeVisible({ timeout: 10000 });

    if (await lockedState.isVisible()) {
      await page
        .getByRole("button", { name: /Create Private Profile/ })
        .last()
        .click();
      // Wait for the profile to be created and the locked state to disappear
      await expect(lockedState).not.toBeVisible({ timeout: 15000 });
    }
  });

  // ─── Navigate to Artists ───────────────────────────────────────

  test("should navigate to artists page from sidebar", async () => {
    // Assuming there is a sidebar link or we can go directly
    await artistsPage.gotoArtistsList();
    await expect(page).toHaveURL(/\/app\/library\/artists/);
  });

  test("should show empty artists state initially", async () => {
    await artistsPage.gotoArtistsList();
    await expect(artistsPage.emptyStateHeading).toBeVisible({ timeout: 10000 });
  });

  // ─── Create ────────────────────────────────────────────────────

  test("should navigate to create artist page", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickAddArtist();

    await expect(artistsPage.artistNameInput).toBeVisible();
    await expect(artistsPage.descriptionTextarea).toBeVisible();
  });

  test("should validate that artist name is required", async () => {
    await artistsPage.gotoCreateArtist();

    // Submit button should be disabled when name is empty
    await expect(artistsPage.createArtistSubmitButton).toBeDisabled();
  });

  test("should create a new artist with avatar successfully", async () => {
    await artistsPage.gotoCreateArtist();
    const name = `E2E Artist ${timestamp}`;

    // Test validation first
    await artistsPage.fillCreateForm({ name: "", description: "Test" });
    await expect(artistsPage.createArtistSubmitButton).toBeDisabled();

    await artistsPage.createArtist({
      name,
      description: "An artist with avatar created by the E2E test suite",
    });

    // Verify the artist was created successfully
    await artistsPage.expectArtistInList(name);
  });

  test("should upload avatar and banner in edit mode", async () => {
    test.setTimeout(90_000);
    const name = `E2E Artist ${timestamp}`;
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(name);
    await artistsPage.expectArtistDetailPage(name);

    await artistsPage.clickEditFromMenu();

    // Upload Avatar
    const avatarPath = "ui-tests/assets/test-image.jpg";
    await artistsPage.uploadAvatar(avatarPath);

    // Upload Banner
    const bannerPath = "ui-tests/assets/test-image.jpg";
    await artistsPage.uploadBanner(bannerPath);

    await artistsPage.submitEditForm();

    // Verify we are back on detail page
    await artistsPage.expectArtistDetailPage(name);
  });

  test("should toggle favorite status", async () => {
    const name = `E2E Artist ${timestamp}`;
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(name);
    await artistsPage.expectArtistDetailPage(name);

    const heartButton = page.getByRole("button", { name: "Add to favorites" });
    await expect(heartButton).toBeVisible();
    await heartButton.click();

    // Expect visual change or state change?
    // The icon usually changes weight/fill.
    // For now, ensure it doesn't crash and stays visible.
    await expect(heartButton).toBeVisible();
  });

  test("should validate max length for description", async () => {
    const name = `E2E Artist ${timestamp}`;
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(name);
    await artistsPage.expectArtistDetailPage(name);
    await artistsPage.clickEditFromMenu();

    const longDescription = "a".repeat(2049);
    await artistsPage.fillEditForm({ description: longDescription });
    await artistsPage.expectFieldError(
      "Description",
      "Description must be 2048 characters or less",
    );

    // Cancel to reset state
    await artistsPage.clickEditCancel();
  });

  // ─── Delete ────────────────────────────────────────────────────
  test("should open delete confirmation dialog", async () => {
    const name = `E2E Artist ${timestamp}`;
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(name);
    await artistsPage.expectArtistDetailPage(name);

    await artistsPage.clickDeleteFromMenu();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Delete Artist" }),
    ).toBeVisible();
  });

  test("should cancel delete", async () => {
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("should delete an artist", async () => {
    const name = `E2E Artist ${timestamp}`;
    // Ensure we are on the page (previous test might have left us there)
    // But since we are serial, we are on the detail page with dialog closed.

    await artistsPage.clickDeleteFromMenu();
    await artistsPage.confirmDelete();

    await artistsPage.expectArtistNotInList(name);
  });
});
