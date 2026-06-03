import { expect, type Page, test } from "@playwright/test";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import {
  createAlbumWithTrack,
  createArtist,
  ensureLibraryReady,
} from "./fixtures/library-content.helper";
import { LibrarySongsPage } from "./library-songs.po";
import { PlayerPage } from "./player.po";
import { uniqueLabel } from "./test-data.helper";

test.describe("Library Songs Workflow", () => {
  let page: Page;
  let songsPage: LibrarySongsPage;
  let playerPage: PlayerPage;

  const artistName = uniqueLabel("Songs Artist");
  const albumName = uniqueLabel("Songs Album");
  const trackName = uniqueLabel("Songs Track");
  const editedTrackName = `${trackName} Edited`;

  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    songsPage = new LibrarySongsPage(page);
    playerPage = new PlayerPage(page);

    await createVerifiedUser(page, { prefix: "songs_user" });
    await ensureLibraryReady(page);
    await createArtist(page, artistName);
    await createAlbumWithTrack(page, {
      artistName,
      albumName,
      trackName,
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should list uploaded tracks on songs page", async () => {
    await songsPage.gotoSongsList();
    await songsPage.expectTrackVisible(trackName);
  });

  test("should play track from songs table", async () => {
    await songsPage.gotoSongsList();
    await songsPage.playTrackFromRow(trackName);
    await expect(playerPage.trackTitle).toHaveText(trackName, {
      timeout: 15000,
    });
  });

  test("should edit track metadata", async () => {
    await songsPage.gotoSongsList();
    await songsPage.editTrackFromContextMenu(trackName);
    await expect(page).toHaveURL(/\/edit/);
    await page.getByLabel("Track Title").clear();
    await page.getByLabel("Track Title").fill(editedTrackName);
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page).toHaveURL(/\/app\/library\/albums\/[^/]+$/, {
      timeout: 30000,
    });
    await songsPage.gotoSongsList();
    await songsPage.expectTrackVisible(editedTrackName);
  });

  test("should delete track from songs page", async () => {
    await songsPage.gotoSongsList();
    await songsPage.deleteTrackFromContextMenu(editedTrackName);
    await expect(
      page.getByRole("row").filter({ hasText: editedTrackName }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
