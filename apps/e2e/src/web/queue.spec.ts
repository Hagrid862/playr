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
 * Clicks the album track row (SongCard) and waits until the player shows the track
 * and progress advances. Scoped to the real card to avoid matching unrelated divs.
 */
async function getUniqueAlbumTrackCard(page: Page, trackTitle: string) {
  const trackCards = page
    .locator("div.group.cursor-pointer")
    .filter({ hasText: trackTitle });
  await expect(trackCards).toHaveCount(1);
  return trackCards.first();
}

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

  test.describe.configure({ mode: "serial" });

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

    // Create Album
    await page.goto("/app/library/albums/create");
    await page.getByRole("button", { name: "Pick existing artist" }).click();
    await page.getByText(artistName).click();
    await page.getByLabel("Album Title").waitFor({ state: "visible" });
    await page.getByLabel("Album Title").fill(albumName);
    await page.getByRole("button", { name: "Create Album" }).click();
    await page.waitForLoadState("networkidle");

    // Get album ID from URL or list
    await page.locator("a").filter({ hasText: albumName }).first().click();
    await page.waitForLoadState("networkidle");
    const albumUrl = new URL(page.url());
    const albumPathname = albumUrl.pathname.replace(/\/+$/, "");
    const albumId = albumPathname.split("/").pop();

    // Add Track 1
    await page.goto(`/app/library/albums/${albumId}/add-content`);
    await page.getByLabel("Track Title").waitFor({ state: "visible" });
    await page.getByLabel("Track Title").fill(track1);
    const audioPath = path.resolve(
      __dirname,
      "../../ui-tests/assets/test-audio.mp3",
    );
    await page.setInputFiles('input[type="file"]', audioPath);
    await page.getByRole("button", { name: "Add Track" }).click();

    // Wait for navigation to complete - the form navigates to the parent (album detail) page
    await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(track1)).toBeVisible({ timeout: 30000 });

    // Add Track 2
    await page.goto(`/app/library/albums/${albumId}/add-content`);
    await page.getByLabel("Track Title").waitFor({ state: "visible" });
    await page.getByLabel("Track Title").fill(track2);
    await page.setInputFiles('input[type="file"]', audioPath);
    await page.getByRole("button", { name: "Add Track" }).click();

    // Wait for navigation to complete - the form navigates to the parent (album detail) page
    await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, { timeout: 30000 });
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(track2)).toBeVisible({ timeout: 30000 });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should add tracks to queue and verify", async () => {
    await playTrackFromAlbum(page, playerPage, track1);

    const track2Card = await getUniqueAlbumTrackCard(page, track2);
    // Use right-click to open context menu
    await track2Card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Add to Queue" }).click();

    // Give context menu action time to process
    await page.waitForTimeout(1000);

    // Open Queue
    await page.getByRole("button", { name: "Queue" }).click();

    // Verify Track 2 in queue
    await queuePage.expectTrackInQueue(track2);

    // Close queue using Escape as the toggle button might be obscured by the Sheet/sidebar header
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500); // Wait for transition
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
