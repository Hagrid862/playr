import { type Locator, type Page, expect } from "@playwright/test";
import { TEST_AUDIO_PATH, TEST_IMAGE_PATH } from "./test-data.helper";

export class LibraryAlbumsPage {
  readonly page: Page;
  readonly emptyStateHeading: Locator;
  readonly addAlbumLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyStateHeading = page.getByRole("heading", {
      name: "No albums found",
    });
    this.addAlbumLink = page.getByRole("link", { name: /add album/i });
  }

  async gotoAlbumsList() {
    await this.page.goto("/app/library/albums");
  }

  async gotoCreateAlbum() {
    await this.page.goto("/app/library/albums/create");
  }

  async expectEmptyState() {
    await expect(this.emptyStateHeading).toBeVisible({ timeout: 10000 });
  }

  async createAlbumFromCreatePage(options: { trackName: string }) {
    await this.page.getByLabel("Album title").waitFor({ state: "visible" });
    await this.page
      .locator('input[type="file"][accept="audio/*"]')
      .setInputFiles(TEST_AUDIO_PATH);
    await this.page.waitForTimeout(500);
    await expect(this.page.getByText(/Scanning metadata/)).toBeHidden({
      timeout: 20000,
    });
    await this.page.getByLabel("Track Title").fill(options.trackName);
    await this.page
      .getByRole("button", { name: /Create album & upload/ })
      .click();
    await this.page.waitForURL(/\/app\/library\/albums\/[^/]+$/, {
      timeout: 60000,
    });
  }

  async playTrackOnDetail(trackName: string) {
    const trackRow = this.page
      .locator("div.group.cursor-pointer")
      .filter({ hasText: trackName });
    await trackRow.scrollIntoViewIfNeeded();
    await trackRow.hover();
    await trackRow.click();
  }

  async gotoEditFromMenu() {
    await this.openAlbumMoreMenu();
    await this.page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(this.page).toHaveURL(/\/edit/, { timeout: 10000 });
  }

  async openAlbumMoreMenu() {
    await this.page
      .locator("div.flex.items-center.gap-1.ml-2")
      .getByRole("button")
      .last()
      .click();
  }

  async deleteAlbumFromMenu() {
    await this.openAlbumMoreMenu();
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete Album" }).click();
    await expect(this.page).toHaveURL(/\/app\/library\/albums\/?$/, {
      timeout: 15000,
    });
  }

  async uploadCoverOnEdit() {
    const coverInput = this.page
      .locator('input[type="file"][accept="image/*"]')
      .first();
    await coverInput.setInputFiles(TEST_IMAGE_PATH);
  }

  async saveAlbumEdit() {
    await this.page.getByRole("button", { name: /save changes/i }).click();
    await expect(this.page).toHaveURL(/\/app\/library\/albums\/[^/]+\/?$/, {
      timeout: 60000,
    });
  }

  async expectAlbumInList(albumName: string) {
    await expect(
      this.page
        .locator("a")
        .filter({ has: this.page.getByRole("heading", { name: albumName }) }),
    ).toBeVisible({ timeout: 10000 });
  }

  async expectAlbumNotInList(albumName: string) {
    await expect(
      this.page.getByRole("heading", { name: albumName, exact: true }),
    ).not.toBeVisible({ timeout: 5000 });
  }
}
