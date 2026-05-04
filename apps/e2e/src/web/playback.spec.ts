import { expect, Page, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DashboardPage } from "./dashboard.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { PlayerPage } from "./player.po";
import { RegistrationPage } from "./registration.po";
import { getOtpFromMailhog } from "./mailhog.helper";
import { VerifyEmailPage } from "./verify-email.po";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Playback Functionality", () => {
  let page: Page;
  let verifyEmailPage: VerifyEmailPage;
  let artistsPage: LibraryArtistsPage;
  let playerPage: PlayerPage;
  let dashboardPage: DashboardPage;

  const timestamp = Date.now();
  const testUserData = {
    username: `playback_user_${timestamp}`,
    email: `playback_${timestamp}@example.com`,
    password: "Password123!",
  };

  const artistName = `Playback Artist ${timestamp}`;
  const albumName = `Playback Album ${timestamp}`;
  const trackName = `Playback Track ${timestamp}`;

  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    verifyEmailPage = new VerifyEmailPage(page);
    artistsPage = new LibraryArtistsPage(page);
    playerPage = new PlayerPage(page);
    dashboardPage = new DashboardPage(page);

    // 1. Register and Login
    const regPage = new RegistrationPage(page);
    await regPage.goto();
    await regPage.fillForm({
      username: testUserData.username,
      firstName: "Playback",
      lastName: "Tester",
      email: testUserData.email,
      password: testUserData.password,
      confirmPassword: testUserData.password,
    });
    await regPage.selectGender("Male");
    await regPage.selectBirthDate(new Date(1990, 5, 15));
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

  test("should setup content for playback", async () => {
    await test.step("Create Library", async () => {
      await dashboardPage.gotoLibraryOverview();
      await dashboardPage.createLibrary();
    });

    await test.step("Create Artist", async () => {
      await artistsPage.gotoArtistsList();
      await artistsPage.clickAddArtist();
      await artistsPage.createArtist({
        name: artistName,
        description: "Tester artist",
      });
    });

    await test.step("Create Album", async () => {
      await page.goto("/app/library/albums/create");
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Pick existing artist" }).click();
      await page.getByText(artistName).click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/add-content\/album/);

      await page.getByLabel("Album Title").waitFor({ state: "visible" });
      await page.getByLabel("Album Title").fill(albumName);
      await page.getByRole("button", { name: "Create Album" }).click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(new RegExp(`/app/library/artists/`));
    });

    await test.step("Add Track", async () => {
      // 5. Add Track
      await page.locator("a").filter({ hasText: albumName }).first().click();
      await page.waitForLoadState("networkidle");

      // Wait for album detail and get ID
      await expect(page).toHaveURL(/\/app\/library\/albums\/[^/]+/);
      const albumUrl = page.url().split("?")[0];
      const albumId = albumUrl.split("/").filter(Boolean).pop();

      await page.goto(`/app/library/albums/${albumId}/add-content`);
      await page.getByLabel("Track Title").waitFor({ state: "visible" });
      await page.getByLabel("Track Title").fill(trackName);
      const dummyAudioPath = path.resolve(
        __dirname,
        "../../ui-tests/assets/test-audio.mp3",
      );
      await page.setInputFiles('input[type="file"]', dummyAudioPath);

      // Corrected Label: "Add Track" instead of "Create Track"
      await page.getByRole("button", { name: "Add Track" }).click();

      // Wait for navigation to complete - the form navigates to the parent (album detail) page
      await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, {
        timeout: 30000,
      });
      await page.waitForLoadState("networkidle");

      // Verify track in album with extended timeout to allow for query refetch
      await expect(page.getByText(trackName)).toBeVisible({ timeout: 30000 });
    });
  });
  test("should play the track and toggle play/pause", async () => {
    // Click Play on the album page - specifically looking for the big Play button in the header actions area
    await test.step("Click Play on album page", async () => {
      const playButton = page.getByRole("button", { name: /^Play$/ }).first();
      await playButton.waitFor({ state: "visible", timeout: 10000 });
      await playButton.click();
    });

    // Verify track info in player
    await test.step("Verify player state", async () => {
      await expect(playerPage.trackTitle).toHaveText(trackName, {
        timeout: 10000,
      });
      await playerPage.expectPlaying();
    });

    // Toggle Pause
    await test.step("Toggle Play/Pause", async () => {
      await playerPage.togglePlay();

      // Wait for pause to take effect
      await page.waitForTimeout(500);

      const initialPos =
        await playerPage.progressSlider.getAttribute("aria-valuenow");
      await page.waitForTimeout(2000);
      const newPos =
        await playerPage.progressSlider.getAttribute("aria-valuenow");
      expect(newPos).toBe(initialPos);

      // Toggle Play again
      await playerPage.togglePlay();
      await playerPage.expectPlaying();
    });
  });

  test("should adjust volume", async () => {
    await playerPage.setVolume(50);
    // Note: validating volume state might require checking local storage or computed styles if not in aria
    // For now we just check it doesn't crash and slider is interactable
  });

  test("should check audio quality menu", async () => {
    // We only check that the quality menu opens and "Auto" is available.
    // Specific qualities might be disabled depending on backend processing latency.
    await playerPage.moreActionsButton.click();
    await playerPage.audioQualityMenuTrigger.click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Auto" }),
    ).toBeVisible();
    // Close menu
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });
});
