import { expect, type Page, test } from "@playwright/test";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import {
  createAlbumWithTrack,
  createArtist,
  ensureLibraryReady,
} from "./fixtures/library-content.helper";
import { LibraryAlbumsPage } from "./library-albums.po";
import { PlayerPage } from "./player.po";
import { QueuePage } from "./queue.po";
import { uniqueLabel } from "./test-data.helper";

test.describe("Listen History Workflow", () => {
  let page: Page;
  let albumsPage: LibraryAlbumsPage;
  let playerPage: PlayerPage;
  let queuePage: QueuePage;

  const artistName = uniqueLabel("History Artist");
  const albumName = uniqueLabel("History Album");
  const trackName = uniqueLabel("History Track");

  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    albumsPage = new LibraryAlbumsPage(page);
    playerPage = new PlayerPage(page);
    queuePage = new QueuePage(page);

    await createVerifiedUser(page, { prefix: "history_user" });
    await ensureLibraryReady(page);
    await createArtist(page, artistName);
    const { albumId } = await createAlbumWithTrack(page, {
      artistName,
      albumName,
      trackName,
    });
    await page.goto(`/app/library/albums/${albumId}`);
    await albumsPage.playTrackOnDetail(trackName);
    await expect(playerPage.trackTitle).toHaveText(trackName, {
      timeout: 10000,
    });
    await playerPage.expectPlaying();
    await page.waitForTimeout(3000);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should show played track in history", async () => {
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await queuePage.openHistory();
    await expect(
      page.getByRole("heading", { name: "History", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: new RegExp(`Play ${trackName}`, "i"),
      }),
    ).toBeVisible({ timeout: 20000 });
  });

  test("should clear listen history", async () => {
    await page.goto("/app/library/overview");
    const queueButton = page.getByRole("button", {
      name: "Queue",
      exact: true,
    });
    await queueButton.scrollIntoViewIfNeeded();
    await queueButton.click({ timeout: 15000 });
    await queuePage.openHistory();
    await page.getByRole("button", { name: "Clear" }).click();
    await page
      .getByRole("button", { name: "Clear", exact: true })
      .last()
      .click();
    await expect(page.getByText("No listening history")).toBeVisible({
      timeout: 15000,
    });
  });
});
