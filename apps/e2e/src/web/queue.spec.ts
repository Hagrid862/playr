import { expect, Page, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DashboardPage } from "./dashboard.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { LoginPage } from "./login.po";
import { PlayerPage } from "./player.po";
import { QueuePage } from "./queue.po";
import { RegistrationPage } from "./registration.po";
import { getOtpFromMailhog } from "./mailhog.helper";
import { VerifyEmailPage } from "./verify-email.po";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gets the unique album track card by title.
 * @param page - The page object.
 * @param trackTitle - The title of the track to get.
 * @returns The unique album track card.
 */
async function getUniqueAlbumTrackCard(page: Page, trackTitle: string) {
  const trackCards = page
    .locator("div.group.cursor-pointer")
    .filter({ hasText: trackTitle });
  await expect(trackCards).toHaveCount(1);
  return trackCards.first();
}

/**
 * Plays a track from the album page and waits until the player shows the track
 * and progress advances. Scoped to the real card to avoid matching unrelated divs.
 * @param page - The page object.
 * @param playerPage - The player page object.
 * @param trackTitle - The title of the track to play.
 * @returns The track card.
 */
async function playTrackFromAlbum(
  page: Page,
  playerPage: PlayerPage,
  trackTitle: string,
) {
  const trackCard = await getUniqueAlbumTrackCard(page, trackTitle);
  await trackCard.scrollIntoViewIfNeeded();
  await trackCard.hover();
  await trackCard.click();
  await playerPage.expectPlaying(trackTitle);
}

test.describe("Queue Management", () => {
  let page: Page;
  let artistsPage: LibraryArtistsPage;
  let queuePage: QueuePage;
  let playerPage: PlayerPage;
  let dashboardPage: DashboardPage;
  let verifyEmailPage: VerifyEmailPage;

  const timestamp = Date.now();
  const testUserData = {
    username: `queue_user_${timestamp}`,
    email: `queue_${timestamp}@example.com`,
    password: "Password123!",
  };

  const artistName = `Queue Artist ${timestamp}`;
  const albumName = `Queue Album ${timestamp}`;
  const track1 = `Track 1 ${timestamp}`;
  const track2 = `Track 2 ${timestamp}`;

  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    artistsPage = new LibraryArtistsPage(page);
    queuePage = new QueuePage(page);
    playerPage = new PlayerPage(page);
    dashboardPage = new DashboardPage(page);
    verifyEmailPage = new VerifyEmailPage(page);

    // Setup: Login and content creation
    const regPage = new RegistrationPage(page);
    await regPage.goto();
    await regPage.fillForm({
      username: testUserData.username,
      firstName: "Queue",
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

    await dashboardPage.gotoLibraryOverview();
    await dashboardPage.createLibrary();

    await artistsPage.gotoArtistsList();
    await artistsPage.clickAddArtist();
    await artistsPage.createArtist({ name: artistName });

    const audioPath = path.resolve(
      __dirname,
      "../../ui-tests/assets/test-audio.mp3",
    );

    // Create Album (artist add-content — same flow as albums/create, artist pre-selected)
    await artistsPage.gotoArtistsList();
    await artistsPage.expectArtistInList(artistName);
    await artistsPage.clickArtistCard(artistName);

    const artistUrl = new URL(page.url());
    const artistPath = artistUrl.pathname.replace(/\/+$/, "");
    const artistId = artistPath.split("/").pop();
    expect(artistId).toBeTruthy();

    await page.goto(`/app/library/artists/${artistId}/add-content`);

    await page.getByLabel("Album title").waitFor({ state: "visible" });
    await page.getByLabel("Album title").fill(albumName);

    await page
      .locator('input[type="file"][accept="audio/*"]')
      .setInputFiles(audioPath);
    // Wait for metadata scan to potentially start and then finish
    await page.waitForTimeout(500);
    await expect(page.getByText(/Scanning metadata/)).toBeHidden({
      timeout: 20000,
    });

    // Rename the first track staged during album creation to track1
    await page.getByLabel("Track Title").fill(track1);

    await page.getByRole("button", { name: /Create album & upload/ }).click();
    await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, { timeout: 60000 });

    const albumUrl = new URL(page.url());
    const albumPathname = albumUrl.pathname.replace(/\/+$/, "");
    const albumId = albumPathname.split("/").pop();
    expect(albumId).toBeTruthy();

    await expect(page.getByText(track1)).toBeVisible({ timeout: 30000 });

    // Add Track 2
    await page.goto(`/app/library/albums/${albumId}/add-content`);
    await page.setInputFiles('input[type="file"]', audioPath);
    await page.waitForTimeout(500);
    await expect(
      page.getByText(
        /Scanning metadata|Scanning tracks for cover art|Scanning metadata and cover art/,
      ),
    ).toBeHidden({ timeout: 20000 });
    await page.getByLabel("Track Title").fill(track2);
    const uploadTracks = page.getByRole("button", {
      name: /Upload \d+ tracks?/,
    });
    await expect(uploadTracks).toBeEnabled({ timeout: 30000 });
    await uploadTracks.click();

    // Wait for navigation to complete - the form navigates to the parent (album detail) page
    await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, { timeout: 30000 });
    await expect(page.getByText(track2)).toBeVisible({ timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should add tracks to queue and verify", async () => {
    // Start playback - ensuring the player is initialized
    await playTrackFromAlbum(page, playerPage, track1);

    // Locate the specific track card
    const track2Card = await getUniqueAlbumTrackCard(page, track2);

    // Open context menu via right-click
    await track2Card.click({ button: "right" });

    /**
     * Instead of waitForTimeout, we wait for the menu item to be ready.
     * This is faster and more reliable as it reacts to the UI state.
     */
    const addToQueueItem = page.getByRole("menuitem", { name: "Add to Queue" });
    await expect(addToQueueItem).toBeVisible();
    await addToQueueItem.click();

    /**
     * Avoid hardcoded 1000ms waits. Instead, wait for a toast notification
     * or for the menu to disappear to confirm the action was registered.
     */
    await expect(addToQueueItem).not.toBeVisible();

    // Open the Queue panel
    const queueButton = page.getByRole("button", { name: "Queue" });
    await queueButton.click();

    // Verify Track 2 is present in the list
    await queuePage.expectTrackInQueue(track2);

    /**
     * Using keyboard Escape is a good fallback, but ensure the transition
     * is handled by waiting for a specific locator to hide/show
     * rather than using a fixed 500ms delay.
     */
    await page.keyboard.press("Escape");

    // Wait for the queue overlay/sidebar to actually vanish from the DOM/Viewport
    await expect(page.getByRole("list", { name: "Queue" })).not.toBeVisible();
  });

  test("should use 'Play Next'", async () => {
    // Ensure queue is closed first (defensive)
    const isQueueBlocking = await page
      .locator('[data-slot="sheet-overlay"]')
      .isVisible()
      .catch(() => false);
    if (isQueueBlocking) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Play Track 1
    await playTrackFromAlbum(page, playerPage, track1);

    // Add Track 2 as Play Next
    const track2Card = await getUniqueAlbumTrackCard(page, track2);
    // Use right-click for context menu
    await track2Card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Play Next" }).click();

    // Verify it's in the queue
    await page.keyboard.press("Escape"); // Ensure nothing else is open
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await queuePage.expectTrackInQueue(track2);

    // Close queue
    await page.keyboard.press("Escape");
  });

  test("should sync queue across pages", async ({ browser }) => {
    // Ensure queue is closed first
    const isQueueBlocking = await page
      .locator('[data-slot="sheet-overlay"]')
      .isVisible()
      .catch(() => false);
    if (isQueueBlocking) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Create a new context to simulate another window
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const newLoginPage = new LoginPage(newPage);
    const newQueuePage = new QueuePage(newPage);

    // Login on the new page
    await newLoginPage.goto();
    await newLoginPage.login(testUserData.email, testUserData.password);
    await expect(newPage).toHaveURL(/\/app/);

    // Open queue on new page
    await newPage.getByRole("button", { name: "Queue" }).click();

    // Verify Track 2 is also in the synced queue
    await newQueuePage.expectTrackInQueue(track2);

    await newContext.close();
  });

  test("should sync playback state across pages", async ({ browser }) => {
    // Ensure queue is closed first
    const isQueueBlocking = await page
      .locator('[data-slot="sheet-overlay"]')
      .isVisible()
      .catch(() => false);
    if (isQueueBlocking) {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Play Track 1 on primary page
    await playTrackFromAlbum(page, playerPage, track1);

    // Create a new context to simulate another window
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();
    const newLoginPage = new LoginPage(newPage);
    const newPlayerPage = new PlayerPage(newPage);

    // Login on the new page
    await newLoginPage.goto();
    await newLoginPage.login(testUserData.email, testUserData.password);
    await expect(newPage).toHaveURL(/\/app/);

    // Give time for WebSocket to connect and state to sync
    await newPage.waitForTimeout(1000);

    // Verify track 1 is synced to the new page
    await expect(newPlayerPage.trackTitle).toHaveText(track1);

    // Skip to next track on the new page
    await newPlayerPage.skipForward();
    await expect(newPlayerPage.trackTitle).toHaveText(track2);

    // Verify track 2 syncs back to the primary page
    await expect(playerPage.trackTitle).toHaveText(track2);

    await newContext.close();
  });
});
