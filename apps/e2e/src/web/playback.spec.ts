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
  const initialTrackName = "Initial Track";
  let albumId: string;

  test.describe.configure({ mode: "serial", timeout: 120_000 });

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
      await expect(artistsPage.page).toHaveURL(/\/app\/library\/artists/);
      await artistsPage.addArtistButton.waitFor({
        state: "visible",
        timeout: 30000,
      });
      await artistsPage.clickAddArtist();
      await artistsPage.createArtist({
        name: artistName,
        description: "Tester artist",
      });
    });

    await test.step("Create Album", async () => {
      await artistsPage.gotoArtistsList();
      await artistsPage.expectArtistInList(artistName);
      await artistsPage.clickArtistCard(artistName);
      await artistsPage.expectArtistDetailPage(artistName);

      const artistUrl = new URL(page.url());
      const artistPath = artistUrl.pathname.replace(/\/+$/, "");
      const artistId = artistPath.split("/").pop();
      expect(artistId).toBeTruthy();

      await page.goto(`/app/library/artists/${artistId}/add-content`);

      await page.getByLabel("Album title").waitFor({ state: "visible" });
      await page.getByLabel("Album title").fill(albumName);

      const dummyAudioPath = path.resolve(
        __dirname,
        "../../ui-tests/assets/test-audio.mp3",
      );
      await page
        .locator('input[type="file"][accept="audio/*"]')
        .setInputFiles(dummyAudioPath);

      // Wait for metadata scan to potentially start and then finish
      await page.waitForTimeout(500);
      await expect(page.getByText(/Scanning metadata/)).toBeHidden({
        timeout: 20000,
      });

      // Rename the first track staged during album creation to avoid "Test audio" collision
      await page.getByLabel("Track Title").fill("Initial Track");

      await page.getByRole("button", { name: /Create album & upload/ }).click();
      await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, {
        timeout: 60000,
      });
    });

    await test.step("Add Track", async () => {
      await expect(page).toHaveURL(/\/app\/library\/albums\/[^/]+/);
      const albumUrl = page.url().split("?")[0];
      albumId = albumUrl.split("/").filter(Boolean).pop()!;
      expect(albumId).toBeTruthy();

      await page.goto(`/app/library/albums/${albumId}/add-content`);
      const dummyAudioPath = path.resolve(
        __dirname,
        "../../ui-tests/assets/test-audio.mp3",
      );
      await page.setInputFiles('input[type="file"]', dummyAudioPath);
      await page.waitForTimeout(500);
      await expect(
        page.getByText(
          /Scanning metadata|Scanning tracks for cover art|Scanning metadata and cover art/,
        ),
      ).toBeHidden({ timeout: 20000 });
      await page.getByLabel("Track Title").fill(trackName);

      const uploadTracks = page.getByRole("button", {
        name: /Upload \d+ tracks?/,
      });
      await expect(uploadTracks).toBeEnabled({ timeout: 30000 });
      await uploadTracks.click();

      // Wait for navigation to complete - the form navigates to the parent (album detail) page
      await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, {
        timeout: 30000,
      });

      // Verify track in album with extended timeout to allow for query refetch
      await expect(page.getByText(trackName)).toBeVisible({ timeout: 30000 });
    });
  });
  test("should play the track and toggle play/pause", async () => {
    // Click on the specifically added track to play it
    await test.step("Click Play on the added track", async () => {
      const trackRow = page
        .locator("div.group.cursor-pointer")
        .filter({ hasText: trackName });
      await trackRow.scrollIntoViewIfNeeded();
      await trackRow.hover();
      await trackRow.click();
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
    await playerPage.moreActionsButton.click();
    await playerPage.audioQualityMenuTrigger.click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Auto" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });

  test("should toggle shuffle and repeat", async () => {
    await page.goto(`/app/library/albums/${albumId}`);
    const trackRow = page
      .locator("div.group.cursor-pointer")
      .filter({ hasText: initialTrackName });
    await trackRow.click();

    await playerPage.toggleShuffle();
    await expect(playerPage.shuffleButton).toHaveClass(/text-emerald-500/);

    await playerPage.toggleRepeat();
    await expect(playerPage.repeatButton).toHaveClass(/text-emerald-500/);
  });

  test("should skip between tracks", async () => {
    await page.goto(`/app/library/albums/${albumId}`);
    await expect(page.getByText(trackName)).toBeVisible({ timeout: 30000 });

    const initialRow = page
      .locator("div.group.cursor-pointer")
      .filter({ hasText: initialTrackName });
    await initialRow.click();
    await expect(playerPage.trackTitle).toHaveText(initialTrackName, {
      timeout: 10000,
    });

    await playerPage.skipForward();
    await expect(playerPage.trackTitle).not.toHaveText(initialTrackName, {
      timeout: 15000,
    });

    const afterSkip = await playerPage.trackTitle.textContent();
    await playerPage.skipBackward();
    await expect(playerPage.trackTitle).toHaveText(initialTrackName, {
      timeout: 10000,
    });
    expect(afterSkip).not.toBe(initialTrackName);
  });

  test("should seek within track", async () => {
    await page.goto(`/app/library/albums/${albumId}`);
    const trackRow = page
      .locator("div.group.cursor-pointer")
      .filter({ hasText: initialTrackName });
    await trackRow.click();
    await playerPage.expectPlaying(initialTrackName);

    const before = Number(
      (await playerPage.progressSlider.getAttribute("aria-valuenow")) ?? "0",
    );
    await playerPage.seek(75);
    await expect
      .poll(async () =>
        Number(
          (await playerPage.progressSlider.getAttribute("aria-valuenow")) ??
            "0",
        ),
      )
      .toBeGreaterThan(before);
  });

  test("should open audio quality menu and select when enabled", async () => {
    await playerPage.moreActionsButton.click();
    await playerPage.audioQualityMenuTrigger.click();
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Auto" }),
    ).toBeVisible();
    const highOption = page.getByRole("menuitemcheckbox", { name: "High" });
    if (await highOption.isVisible()) {
      await expect(highOption).toBeEnabled();
      await highOption.click();
    }
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
  });

  test("should favorite track from player", async () => {
    await page.goto(`/app/library/albums/${albumId}`);
    const trackRow = page
      .locator("div.group.cursor-pointer")
      .filter({ hasText: initialTrackName });
    await trackRow.click();

    const favButton = page.getByRole("button", {
      name: "Favorite",
      exact: true,
    });
    await favButton.click();
    await expect(favButton).toHaveClass(/text-emerald/);
  });
});
