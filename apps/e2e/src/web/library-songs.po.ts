import { type Locator, type Page, expect } from "@playwright/test";

export class LibrarySongsPage {
  readonly page: Page;
  readonly songsTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.songsTable = page.getByRole("table");
  }

  async gotoSongsList() {
    await this.page.goto("/app/library/songs");
  }

  private trackRow(title: string) {
    return this.songsTable.getByRole("row").filter({ hasText: title });
  }

  async expectTrackVisible(title: string) {
    await expect(this.trackRow(title).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async playTrackFromRow(title: string) {
    const row = this.trackRow(title);
    await row.click();
  }

  async openTrackContextMenu(title: string) {
    const row = this.trackRow(title);
    await row.click({ button: "right" });
  }

  async editTrackFromContextMenu(title: string) {
    await this.openTrackContextMenu(title);
    await this.page.getByRole("menuitem", { name: "Edit" }).click();
  }

  async deleteTrackFromContextMenu(title: string) {
    await this.openTrackContextMenu(title);
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete Track" }).click();
  }
}
