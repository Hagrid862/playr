import { type Locator, type Page, expect } from "@playwright/test";

export class PlaylistsPage {
  readonly page: Page;
  readonly emptyStateHeading: Locator;
  readonly newPlaylistLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyStateHeading = page.getByRole("heading", {
      name: "No playlists yet",
    });
    this.newPlaylistLink = page.getByRole("link", { name: "New playlist" });
  }

  async gotoPlaylistsList() {
    await this.page.goto("/app/playlists");
  }

  async gotoCreatePlaylist() {
    await this.page.goto("/app/playlists/create");
  }

  async expectPlaylistsIndexLoaded() {
    await expect(
      this.page.getByRole("heading", { name: "All Playlists" }),
    ).toBeVisible({ timeout: 10000 });
    const empty = this.emptyStateHeading;
    const hasCards = this.page.locator("div.group\\/playlist");
    await expect(empty.or(hasCards.first())).toBeVisible({ timeout: 10000 });
  }

  async createPlaylist(name: string) {
    await this.page.getByLabel("Name").fill(name);
    await this.page.getByRole("button", { name: "Create playlist" }).click();
    await this.page.waitForURL(/\/app\/playlists\/[^/]+$/, {
      timeout: 15000,
    });
  }

  async openPlaylistCard(name: string) {
    await this.page.getByRole("heading", { name, exact: true }).click();
    await this.page.waitForURL(/\/app\/playlists\/[^/]+$/, { timeout: 10000 });
  }

  async addTrackToPlaylistFromContextMenu(
    trackTitle: string,
    playlistName: string,
  ) {
    const trackRow = this.page
      .locator("div.group.cursor-pointer")
      .filter({ hasText: trackTitle });
    await trackRow.click({ button: "right" });
    await this.page.getByRole("menuitem", { name: "Add to playlist" }).hover();
    await this.page
      .getByRole("menuitem", { name: playlistName, exact: true })
      .click();
  }

  private playlistCard(playlistName: string) {
    return this.page.locator("div.group\\/playlist").filter({
      has: this.page.getByRole("heading", { name: playlistName, exact: true }),
    });
  }

  async pinPlaylistFromContextMenu(playlistName: string) {
    const card = this.playlistCard(playlistName);
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.click({ button: "right" });
    await this.page.getByRole("menuitem", { name: "Pin to sidebar" }).click();
    await expect(
      this.page
        .locator("[data-sonner-toast]")
        .filter({ hasText: "Pinned to sidebar" }),
    ).toBeVisible({ timeout: 15000 });
    // Context menu items call preventDefault() so the menu stays open and blocks the card.
    await this.page.keyboard.press("Escape");
    await this.expectPlaylistPinnedInSidebar(playlistName);
  }

  async expectPlaylistPinnedInSidebar(playlistName: string) {
    const sidebar = this.page.locator('[data-sidebar="sidebar"]');
    await expect(
      sidebar.getByRole("link", { name: playlistName, exact: true }),
    ).toBeVisible({ timeout: 15000 });
  }

  async playPlaylist() {
    await this.page.getByRole("button", { name: "Play" }).first().click();
  }

  async shufflePlaylist() {
    await this.page.getByRole("button", { name: "Shuffle" }).click();
  }

  private playlistDetailActionsButton() {
    return this.page
      .locator("div.flex.items-center.gap-1.ml-2")
      .getByRole("button");
  }

  async openEditFromMenu() {
    await this.playlistDetailActionsButton().click();
    await this.page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(this.page).toHaveURL(/\/edit/, { timeout: 10000 });
  }

  async deletePlaylistFromDetail() {
    await this.playlistDetailActionsButton().click();
    await this.page.getByRole("menuitem", { name: /delete/i }).click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /delete/i }).click();
    await expect(this.page).toHaveURL(/\/app\/playlists\/?$/, {
      timeout: 15000,
    });
  }

  async deletePlaylistFromCardContext(playlistName: string) {
    const card = this.page
      .locator("div.group\\/playlist")
      .filter({ has: this.page.getByRole("heading", { name: playlistName }) });
    await card.click({ button: "right" });
    await this.page.getByRole("menuitem", { name: /delete playlist/i }).click();
    const dialog = this.page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /delete/i }).click();
  }
}
