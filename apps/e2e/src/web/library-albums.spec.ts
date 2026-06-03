import { expect, type Page, test } from "@playwright/test";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import {
  createAlbumWithTrack,
  createArtist,
  ensureLibraryReady,
} from "./fixtures/library-content.helper";
import { LibraryAlbumsPage } from "./library-albums.po";
import { LibraryArtistsPage } from "./library-artists.po";
import { PlayerPage } from "./player.po";
import { uniqueLabel } from "./test-data.helper";

test.describe("Library Albums Workflow", () => {
  let page: Page;
  let albumsPage: LibraryAlbumsPage;
  let artistsPage: LibraryArtistsPage;
  let playerPage: PlayerPage;

  const artistName = uniqueLabel("Albums Artist");
  const albumName = uniqueLabel("Albums Album");
  const trackName = uniqueLabel("Albums Track");
  const createPageAlbum = uniqueLabel("Create Page Album");
  const createPageTrack = uniqueLabel("Create Page Track");
  let artistId: string;

  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    albumsPage = new LibraryAlbumsPage(page);
    artistsPage = new LibraryArtistsPage(page);
    playerPage = new PlayerPage(page);

    await createVerifiedUser(page, { prefix: "albums_user" });
    await ensureLibraryReady(page);
    await createArtist(page, artistName);
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(artistName);
    artistId = new URL(page.url()).pathname
      .replace(/\/+$/, "")
      .split("/")
      .pop()!;
    expect(artistId).toBeTruthy();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("should show empty albums list initially", async () => {
    await albumsPage.gotoAlbumsList();
    await albumsPage.expectEmptyState();
  });

  test("should create album via artist add-content and play track", async () => {
    const { albumId } = await createAlbumWithTrack(page, {
      artistName,
      albumName,
      trackName,
    });

    await page.goto(`/app/library/albums/${albumId}`);
    await expect(page.locator("h2").filter({ hasText: albumName })).toBeVisible(
      { timeout: 10000 },
    );
    await albumsPage.playTrackOnDetail(trackName);
    await expect(playerPage.trackTitle).toHaveText(trackName, {
      timeout: 10000,
    });
  });

  test("should list created album", async () => {
    await albumsPage.gotoAlbumsList();
    await albumsPage.expectAlbumInList(albumName);
  });

  test("should create album via standalone create page", async () => {
    await page.goto(`/app/library/albums/create?artistId=${artistId}`);
    await page.getByLabel("Album title").fill(createPageAlbum);

    await albumsPage.createAlbumFromCreatePage({
      trackName: createPageTrack,
    });
    await expect(page.getByText(createPageTrack)).toBeVisible({
      timeout: 30000,
    });
  });

  test("should edit album metadata on edit page", async () => {
    await albumsPage.gotoAlbumsList();
    await albumsPage.expectAlbumInList(createPageAlbum);
    await page
      .locator("a")
      .filter({ has: page.getByRole("heading", { name: createPageAlbum }) })
      .click();
    await expect(page).toHaveURL(/\/app\/library\/albums\/[^/]+$/);

    const editedName = `${createPageAlbum} Edited`;
    await albumsPage.gotoEditFromMenu();
    await page.getByLabel(/album title/i).clear();
    await page.getByLabel(/album title/i).fill(editedName);
    await albumsPage.saveAlbumEdit();
    await expect(
      page.locator("h2").filter({ hasText: editedName }),
    ).toBeVisible({ timeout: 15000 });
  });

  test("should delete album from detail menu", async () => {
    await albumsPage.gotoAlbumsList();
    const editedName = `${createPageAlbum} Edited`;
    await page
      .locator("a")
      .filter({ has: page.getByRole("heading", { name: editedName }) })
      .click();
    await albumsPage.deleteAlbumFromMenu();
    await albumsPage.gotoAlbumsList();
    await albumsPage.expectAlbumNotInList(editedName);
  });

  test("should reach add-content from artist detail", async () => {
    await artistsPage.gotoArtistsList();
    await artistsPage.clickArtistCard(artistName);
    await page.getByRole("link", { name: "Add Content" }).click();
    await expect(page).toHaveURL(/\/add-content/);
    await expect(page.getByLabel("Album title")).toBeVisible();
  });
});
