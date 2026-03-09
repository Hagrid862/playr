import { expect, Page, test } from "@playwright/test";
import { DashboardPage } from "./dashboard.po";
import { LoginPage } from "./login.po";
import { RegistrationPage } from "./registration.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { QueuePage } from "./queue.po";
import { PlayerPage } from "./player.po";
import path from "path";

test.describe("Queue Management", () => {
  let page: Page;
  let loginPage: LoginPage;
  let artistsPage: LibraryArtistsPage;
  let queuePage: QueuePage;
  let playerPage: PlayerPage;
  let dashboardPage: DashboardPage;

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
    loginPage = new LoginPage(page);
    artistsPage = new LibraryArtistsPage(page);
    queuePage = new QueuePage(page);
    playerPage = new PlayerPage(page);
    dashboardPage = new DashboardPage(page);

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

    await loginPage.goto();
    await loginPage.login(testUserData.email, testUserData.password);
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
    // On album page, right click Track 2 -> Add to Queue
    // (Assuming SongCard has a context menu or "Add to Queue" button)
    // Let's use the explicit "Add to Queue" trigger if available
    const track2Card = page.locator("div").filter({ hasText: track2 }).last();
    // Use right-click to open context menu since there's no "More options" button in SongCard
    await track2Card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Add to Queue" }).click();

    // Give context menu action time to process
    await page.waitForTimeout(1000);

    // Open Queue using newly added aria-label for reliability
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
    await page.locator("div").filter({ hasText: track1 }).last().click();
    await expect(playerPage.trackTitle).toHaveText(track1);

    // Add Track 2 as Play Next
    const track2Card = page.locator("div").filter({ hasText: track2 }).last();
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
});
