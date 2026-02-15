import { expect, Page, test } from "@playwright/test";
import { LibraryArtistsPage } from "./library-artists.po";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";

test.describe("Library Artist CRUD Workflow", () => {
  let page: Page;
  let loginPage: LoginPage;
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
    loginPage = new LoginPage(page);
    artistsPage = new LibraryArtistsPage(page);

    // 1. Register a fresh user
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

    // 2. Login (if registration didn't auto-login, or to be sure)
    await loginPage.goto();
    await loginPage.login(testUserData.email, testUserData.password);
    await expect(page).toHaveURL(/\/app/, { timeout: 20000 });
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

  test("should create a new artist successfully", async () => {
    await artistsPage.gotoCreateArtist();

    await artistsPage.createArtist({
      name: `E2E Artist ${timestamp}`,
      description: "An artist created by the E2E test suite",
    });

    // Should be redirected to the artists list and see the new artist
    await artistsPage.expectArtistInList(`E2E Artist ${timestamp}`);
  });

  test("should create a second artist", async () => {
    await artistsPage.gotoCreateArtist();

    await artistsPage.createArtist({
      name: `E2E Artist Two ${timestamp}`,
      description: "An artist created by the E2E test suite",
    });

    await artistsPage.expectArtistInList(`E2E Artist Two ${timestamp}`);
  });

  // ─── Read (List & Detail) ──────────────────────────────────────

  test("should show all artists in the grid", async () => {
    await artistsPage.gotoArtistsList();

    await artistsPage.expectArtistInList(`E2E Artist ${timestamp}`);
    await artistsPage.expectArtistInList(`E2E Artist Two ${timestamp}`);
  });

  test("should navigate to artist detail page", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(`E2E Artist ${timestamp}`);

    await artistsPage.expectArtistDetailPage(`E2E Artist ${timestamp}`);
    await expect(artistsPage.playButton).toBeVisible();
    await expect(artistsPage.shuffleButton).toBeVisible();
  });

  test("should display artist type label on detail page", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(`E2E Artist ${timestamp}`);

    // Wait for detail page to load first
    await artistsPage.expectArtistDetailPage(`E2E Artist ${timestamp}`);

    // In detail page, it shows 'Private Artist' or 'Community Artist'
    await expect(page.getByText("Private Artist")).toBeVisible();
  });

  // ─── Update ────────────────────────────────────────────────────

  test("should navigate to edit artist page from detail", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(`E2E Artist ${timestamp}`);

    await artistsPage.clickEditFromMenu();

    // Should be on the edit page with pre-filled values
    await expect(artistsPage.editArtistNameInput).toHaveValue(
      `E2E Artist ${timestamp}`,
    );
  });

  test("should update artist name and description", async () => {
    // Navigate to edit page again (or continue from previous test if we want to be safe)
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(`E2E Artist ${timestamp}`);
    await artistsPage.clickEditFromMenu();

    await artistsPage.fillEditForm({
      name: `E2E Artist Updated ${timestamp}`,
      description: "Updated description from E2E test",
    });
    await artistsPage.submitEditForm();

    // Should be back on the detail page with the updated name
    await artistsPage.expectArtistDetailPage(`E2E Artist Updated ${timestamp}`);
  });

  test("should persist updated artist name in the list", async () => {
    await artistsPage.gotoArtistsList();

    // Old name should be gone, new name should appear
    await artistsPage.expectArtistNotInList(`E2E Artist ${timestamp}`);
    await artistsPage.expectArtistInList(`E2E Artist Updated ${timestamp}`);
  });

  // ─── Delete ────────────────────────────────────────────────────

  test("should open delete confirmation dialog", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(`E2E Artist Two ${timestamp}`);

    await artistsPage.clickDeleteFromMenu();

    // Verify the dialog is shown
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Delete Artist" }),
    ).toBeVisible();
    // Use a looser check for the text content to avoid flakiness with exact matches
    await expect(dialog).toContainText(`E2E Artist Two ${timestamp}`);

    // Cancel the dialog — artist should still exist
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("should delete an artist", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(`E2E Artist Two ${timestamp}`);

    await artistsPage.clickDeleteFromMenu();
    await artistsPage.confirmDelete();

    // Should be redirected to the artists list
    // The deleted artist should no longer appear
    await artistsPage.expectArtistNotInList(`E2E Artist Two ${timestamp}`);
  });

  test("should keep remaining artists after deletion", async () => {
    await artistsPage.gotoArtistsList();

    // The updated artist should still be there
    await artistsPage.expectArtistInList(`E2E Artist Updated ${timestamp}`);
    // The deleted one should not
    await artistsPage.expectArtistNotInList(`E2E Artist Two ${timestamp}`);
  });
});
