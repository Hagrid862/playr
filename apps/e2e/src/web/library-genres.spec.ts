import { expect, type Page, test } from "@playwright/test";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import {
  attachGenresToAlbumViaApi,
  attachGenresToTrackViaApi,
  createLibraryGenreViaApi,
  getAlbumTrackIdsViaApi,
} from "./fixtures/api.helper";
import { waitForAuthStorage } from "./fixtures/auth-storage.helper";
import {
  createAlbumWithTrack,
  createArtist,
  ensureLibraryReady,
} from "./fixtures/library-content.helper";
import { uniqueLabel } from "./test-data.helper";

test.describe("Library Genres Workflow", () => {
  let page: Page;

  const artistName = uniqueLabel("Genre Artist");
  const albumName = uniqueLabel("Genre Album");
  const trackName = uniqueLabel("Genre Track");
  const genreName = uniqueLabel("E2E Genre");
  let albumId: string;

  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    page = await browser.newPage();
    await createVerifiedUser(page, { prefix: "genres_user" });
    await ensureLibraryReady(page);
    await createArtist(page, artistName);
    const seed = await createAlbumWithTrack(page, {
      artistName,
      albumName,
      trackName,
    });
    albumId = seed.albumId;
  });

  test.afterAll(async () => {
    if (page) await page.close();
  });

  test("should list genre and open detail with album and track", async () => {
    await waitForAuthStorage(page);
    const genreId = await createLibraryGenreViaApi(page, genreName);
    await attachGenresToAlbumViaApi(page, albumId, [genreId]);
    const trackIds = await getAlbumTrackIdsViaApi(page, albumId);
    expect(trackIds.length).toBeGreaterThan(0);
    await attachGenresToTrackViaApi(page, trackIds[0]!, [genreId]);

    await page.goto("/app/library/genres");
    await expect(page.getByRole("heading", { name: "Genres" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("link", { name: genreName })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("link", { name: genreName }).click();
    await expect(page).toHaveURL(/\/app\/library\/genres\/[^/]+/);
    await expect(
      page.getByRole("heading", { name: albumName, exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(trackName)).toBeVisible({ timeout: 15000 });
  });
});
