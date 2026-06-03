import { type Locator, type Page, expect } from "@playwright/test";

export class QueuePage {
  readonly page: Page;
  readonly queueContainer: Locator;
  readonly nextUpList: Locator;
  readonly nowPlayingItem: Locator;
  readonly historyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.queueContainer = page.locator(
      "div:has(> .absolute.inset-0.flex.flex-col)",
    );
    this.nextUpList = page.getByLabel("Next Up");
    this.nowPlayingItem = page.getByLabel("Now Playing");
    this.historyButton = page.getByRole("button", { name: /History/i });
  }

  async playTrackInQueue(index: number) {
    const track = this.nextUpList
      .locator('[data-testid="queue-item"]')
      .nth(index);
    await track.click();
  }

  async removeTrackFromQueueByTitle(title: string) {
    const row = this.nextUpList
      .locator("div.group")
      .filter({ has: this.page.getByText(title, { exact: true }) })
      .first();
    await row.hover();
    await row.locator("button").last().click();
  }

  async expectTrackInQueue(title: string) {
    await expect(this.nextUpList.getByText(title).first()).toBeVisible({
      timeout: 10000,
    });
  }

  async expectNowPlayingInQueue(title: string) {
    await expect(this.nowPlayingItem.getByText(title)).toBeVisible();
  }

  async openHistory() {
    await this.historyButton.click();
  }
}
