import { expect, Page, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DashboardPage } from "./dashboard.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { LoginPage } from "./login.po";
import { PlayerPage } from "./player.po";
import { RegistrationPage } from "./registration.po";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Playback Functionality", () => {
  let page: Page;
  let loginPage: LoginPage;
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
  let albumId: string;

  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    loginPage = new LoginPage(page);
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

    await loginPage.goto();
    await loginPage.login(testUserData.email, testUserData.password);
    await expect(page).toHaveURL(/\/app/, { timeout: 20000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should setup content for playback", async () => {
    test.setTimeout(120000);
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
      const createAlbumResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/library/albums") &&
          response.status() === 201,
      );

      await page.goto("/app/library/albums/create");
      await page.waitForLoadState("networkidle");
      // The /create page starts with a selection view. We need to click "Pick existing artist"
      await page.getByRole("heading", { name: "Pick existing artist" }).click();
      await page.getByText(artistName).click();
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/add-content\/album/);

      await page.getByLabel("Album Title").waitFor({ state: "visible" });
      await page.getByLabel("Album Title").fill(albumName);
      await page.getByRole("button", { name: "Create Album" }).click();

      const createAlbumResponse = await createAlbumResponsePromise;
      const createAlbumPayload = (await createAlbumResponse.json()) as {
        id?: string;
        data?: { id?: string };
      };
      const createdAlbumId = createAlbumPayload.data?.id ?? createAlbumPayload.id;
      if (!createdAlbumId) {
        throw new Error("Album ID missing in create album response");
      }
      albumId = createdAlbumId;

      await page.waitForLoadState("networkidle");
      // After creating an album, it navigates to the artist detail page
      await expect(page).toHaveURL(new RegExp(`/app/library/artists/`));
    });

    await test.step("Add Track", async () => {
      await page.goto(`/app/library/albums/${albumId}/add-content`);
      await expect(page.getByText("Failed to load album")).toHaveCount(0);
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
        timeout: 60000,
      });
      await page.waitForLoadState("networkidle");

      // Verify track in album with extended timeout to allow for query refetch
      await expect(page.getByText(trackName)).toBeVisible({ timeout: 30000 });
    });
  });
  test("should play the track and toggle play/pause", async () => {
    test.setTimeout(120000);

    // Start playback from the target track row to avoid depending on album-level button state timing.
    await test.step("Start playback from track row", async () => {
      await expect(page).toHaveURL(/\/app\/library\/albums\/[^/]+$/);
      const trackRow = page.locator("div").filter({
        has: page.getByText(trackName, { exact: true }),
      });

      const deadline = Date.now() + 120_000;
      const processingFailedError = () =>
        new Error(`Audio processing failed for track "${trackName}".`);
      // Reload at most every few seconds; between reloads, let Playwright
      // auto-wait for the "Processing" label to disappear. "Processing failed" is terminal — fail fast, do not reload until it vanishes.
      while (Date.now() < deadline) {
        await expect(trackRow.getByLabel("Processing"))
          .toHaveCount(0, {
            timeout: 5_000,
          })
          .catch(() => {});
        const failedCount = await trackRow
          .getByLabel("Processing failed")
          .count();
        if (failedCount > 0) throw processingFailedError();
        const processingCount = await trackRow.getByLabel("Processing").count();
        if (processingCount === 0) break;
        await page.reload({ waitUntil: "networkidle" });
      }
      // After the 60s window, track must be playable (not stuck processing).
      if ((await trackRow.getByLabel("Processing failed").count()) > 0) {
        throw processingFailedError();
      }
      await expect(trackRow.getByLabel("Processing")).toHaveCount(0);

      await page
        .locator("div.group.cursor-pointer")
        .filter({ hasText: trackName })
        .first()
        .click();
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
