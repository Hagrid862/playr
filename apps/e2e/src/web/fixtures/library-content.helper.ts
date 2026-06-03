import { expect, type Page } from "@playwright/test";
import { DashboardPage } from "../dashboard.po";
import { LibraryArtistsPage } from "../library-artists.po";
import { TEST_AUDIO_PATH } from "../test-data.helper";

export interface LibrarySeedResult {
  artistName: string;
  albumName: string;
  trackName: string;
  albumId: string;
  artistId: string;
}

export async function addGenreOnAlbumForm(
  page: Page,
  genreName: string,
): Promise<void> {
  const metadata = page.getByRole("complementary").filter({
    has: page.getByRole("heading", { name: "Album details" }),
  });
  const onEditLayout = (await metadata.count()) > 0;
  const genreTrigger = onEditLayout
    ? metadata.getByRole("button", { name: "Genres (optional)" })
    : page.getByRole("button", { name: "Genres (optional)" });
  await genreTrigger.scrollIntoViewIfNeeded();
  await expect(genreTrigger).toBeEnabled({ timeout: 60000 });
  if (onEditLayout) {
    await genreTrigger.click();
  } else {
    await genreTrigger.click({ force: true });
  }
  await expect(genreTrigger).toHaveAttribute("aria-expanded", "true", {
    timeout: 10000,
  });

  const listbox = page.getByRole("listbox", { name: "Genres" });
  await expect(listbox).toBeVisible({ timeout: 15000 });
  await listbox.getByRole("option", { name: "+ Create new genre…" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "New genre" })).toBeVisible({
    timeout: 10000,
  });
  await dialog.getByLabel("Genre name").fill(genreName);
  await dialog.getByRole("button", { name: "Add genre" }).click();
  await expect(dialog).not.toBeVisible({ timeout: 10000 });
  await expect(
    page.getByRole("button", { name: `Remove ${genreName} (new)` }),
  ).toBeVisible({ timeout: 10000 });
}

export async function ensurePrivateLibrary(page: Page): Promise<void> {
  const dashboardPage = new DashboardPage(page);
  await page.goto("/app/library/overview");

  const libraryCreatedState = page.getByText("Your Private Library");
  const libraryNotCreatedState = page.getByText(
    "You don't have a private library yet.",
  );

  await expect(libraryCreatedState.or(libraryNotCreatedState)).toBeVisible();
  if (await libraryNotCreatedState.isVisible()) {
    await dashboardPage.createLibrary();
  }
}

export async function ensurePrivateProfile(page: Page): Promise<void> {
  await page.goto("/app/library/overview/private");

  const lockedState = page.getByText("Private Library Locked");
  const contentState = page.getByText("No content in your private library yet");

  await expect(lockedState.or(contentState)).toBeVisible({ timeout: 10000 });
  if (await lockedState.isVisible()) {
    await page
      .getByRole("button", { name: /Create Private Profile/ })
      .last()
      .click();
    await expect(lockedState).not.toBeVisible({ timeout: 15000 });
  }
}

export async function ensureLibraryReady(page: Page): Promise<void> {
  await ensurePrivateLibrary(page);
  await ensurePrivateProfile(page);
}

export async function createArtist(
  page: Page,
  artistName: string,
): Promise<void> {
  const artistsPage = new LibraryArtistsPage(page);
  await artistsPage.gotoArtistsList();
  await artistsPage.clickAddArtist();
  await artistsPage.createArtist({
    name: artistName,
    description: "E2E test artist",
  });
}

export async function createAlbumWithTrack(
  page: Page,
  options: {
    artistName: string;
    albumName: string;
    trackName: string;
    genreName?: string;
  },
): Promise<{ albumId: string; artistId: string }> {
  const artistsPage = new LibraryArtistsPage(page);
  await artistsPage.gotoArtistsList();
  await artistsPage.expectArtistInList(options.artistName);
  await artistsPage.clickArtistCard(options.artistName);

  const artistUrl = new URL(page.url());
  const artistPath = artistUrl.pathname.replace(/\/+$/, "");
  const artistId = artistPath.split("/").pop();
  expect(artistId).toBeTruthy();

  await page.goto(`/app/library/artists/${artistId}/add-content`);
  await page.getByLabel("Album title").waitFor({ state: "visible" });
  await page.getByLabel("Album title").fill(options.albumName);

  if (options.genreName) {
    await page
      .locator("form")
      .first()
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await addGenreOnAlbumForm(page, options.genreName);
  }

  await page
    .locator('input[type="file"][accept="audio/*"]')
    .setInputFiles(TEST_AUDIO_PATH);
  await page.waitForTimeout(500);
  await expect(page.getByText(/Scanning metadata/)).toBeHidden({
    timeout: 20000,
  });
  await page.getByLabel("Track Title").fill(options.trackName);

  await page.getByRole("button", { name: /Create album & upload/ }).click();
  await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, {
    timeout: 60000,
  });

  const albumUrl = page.url().split("?")[0];
  const albumId = albumUrl.split("/").filter(Boolean).pop();
  expect(albumId).toBeTruthy();

  return { albumId: albumId!, artistId: artistId! };
}

export async function seedLibraryWithAlbumAndTrack(
  page: Page,
  names: { artistName: string; albumName: string; trackName: string },
  genreName?: string,
): Promise<LibrarySeedResult> {
  await ensureLibraryReady(page);
  await createArtist(page, names.artistName);
  const { albumId, artistId } = await createAlbumWithTrack(page, {
    ...names,
    genreName,
  });
  return { ...names, albumId, artistId };
}

export async function addSecondTrackToAlbum(
  page: Page,
  albumId: string,
  trackName: string,
): Promise<void> {
  await page.goto(`/app/library/albums/${albumId}/add-content`);
  await page.setInputFiles('input[type="file"]', TEST_AUDIO_PATH);
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
  await page.waitForURL(/\/app\/library\/albums\/[^/]+$/, {
    timeout: 30000,
  });
  await expect(page.getByText(trackName)).toBeVisible({ timeout: 30000 });
}
