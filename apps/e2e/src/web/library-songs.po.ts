import { type Page, expect } from "@playwright/test";

export class LibrarySongsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async gotoSongsList() {
    await this.page.goto("/app/library/songs");
  }

  async expectTrackVisible(title: string) {
    await expect(this.page.getByText(title).first()).toBeVisible({
      timeout: 15000,
    });
  }

  async playTrackFromRow(title: string) {
    const row = this.page.getByRole("row").filter({ hasText: title });
    await row.click();
  }

  async openTrackContextMenu(title: string) {
    const row = this.page.getByRole("row").filter({ hasText: title });
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
