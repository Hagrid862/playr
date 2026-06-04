import { expect, type Page, test } from "@playwright/test";
import { createVerifiedUser } from "./fixtures/authenticated-user.helper";
import {
  createAlbumWithTrack,
  createArtist,
  ensureLibraryReady,
} from "./fixtures/library-content.helper";
import { LibraryAlbumsPage } from "./library-albums.po";
import { PlayerPage } from "./player.po";
import { PlaylistsPage } from "./playlists.po";
import { uniqueLabel } from "./test-data.helper";

test.describe("Playlists Workflow", () => {
  let page: Page;
  let playlistsPage: PlaylistsPage;
  let albumsPage: LibraryAlbumsPage;
  let playerPage: PlayerPage;

  const artistName = uniqueLabel("Playlist Artist");
  const albumName = uniqueLabel("Playlist Album");
  const trackName = uniqueLabel("Playlist Track");
  const playlistName = uniqueLabel("E2E Playlist");
  let albumId: string;

  test.describe.configure({ mode: "serial", timeout: 120_000 });

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    playlistsPage = new PlaylistsPage(page);
    albumsPage = new LibraryAlbumsPage(page);
    playerPage = new PlayerPage(page);

    await createVerifiedUser(page, { prefix: "playlists_user" });
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

  test("should load playlists index", async () => {
    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.expectPlaylistsIndexLoaded();
  });

  test("should create a playlist", async () => {
    await playlistsPage.gotoCreatePlaylist();
    await playlistsPage.createPlaylist(playlistName);
    await expect(
      page.locator("h2").filter({ hasText: playlistName }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should add track via context menu from album", async () => {
    await page.goto(`/app/library/albums/${albumId}`);
    await playlistsPage.addTrackToPlaylistFromContextMenu(
      trackName,
      playlistName,
    );
    await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show track on playlist detail and play", async () => {
    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.openPlaylistCard(playlistName);
    await expect(page.getByText(trackName)).toBeVisible({ timeout: 10000 });
    await playlistsPage.playPlaylist();
    await expect(playerPage.trackTitle).toHaveText(trackName, {
      timeout: 15000,
    });
  });

  test("should shuffle playlist", async () => {
    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.openPlaylistCard(playlistName);
    await playlistsPage.shufflePlaylist();
    await expect(playerPage.trackTitle).toBeVisible({ timeout: 15000 });
  });

  test("should pin playlist to sidebar", async () => {
    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.pinPlaylistFromContextMenu(playlistName);
  });

  test("should edit playlist name", async () => {
    const editedName = `${playlistName} Edited`;
    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.openPlaylistCard(playlistName);

    await playlistsPage.openEditFromMenu();
    await expect(page).toHaveURL(/\/edit/);

    const titleInput = page.getByLabel("Title");
    await titleInput.waitFor({ state: "visible", timeout: 15000 });
    await titleInput.clear();
    await titleInput.fill(editedName);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page).toHaveURL(/\/app\/playlists\/[^/]+$/, {
      timeout: 15000,
    });
    await expect(
      page.locator("h2").filter({ hasText: editedName }),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should favorite track from player and show in Favorites playlist", async () => {
    await page.goto(`/app/library/albums/${albumId}`);
    await albumsPage.playTrackOnDetail(trackName);
    await expect(playerPage.trackTitle).toHaveText(trackName, {
      timeout: 10000,
    });

    await playerPage.favoriteButton.click();
    await expect(playerPage.favoriteButton).toHaveClass(/text-emerald/);

    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.openPlaylistCard("Favorite songs");
    await expect(page.getByText(trackName)).toBeVisible({ timeout: 15000 });
  });

  test("should delete custom playlist", async () => {
    const editedName = `${playlistName} Edited`;
    await playlistsPage.gotoPlaylistsList();
    await playlistsPage.deletePlaylistFromCardContext(editedName);
    await expect(
      page.getByRole("heading", { name: editedName, exact: true }),
    ).not.toBeVisible({ timeout: 5000 });
  });
});
