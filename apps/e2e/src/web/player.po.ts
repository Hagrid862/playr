import { type Locator, type Page, expect } from "@playwright/test";

export class PlayerPage {
  readonly page: Page;
  readonly playPauseButton: Locator;
  readonly nextButton: Locator;
  readonly previousButton: Locator;
  readonly shuffleButton: Locator;
  readonly repeatButton: Locator;
  readonly volumeButton: Locator;
  readonly volumeSlider: Locator;
  readonly progressSlider: Locator;
  readonly moreActionsButton: Locator;
  readonly trackTitle: Locator;
  readonly trackArtist: Locator;
  readonly audioQualityMenuTrigger: Locator;

  constructor(page: Page) {
    this.page = page;

    // Targeted selectors based on aria-labels in PlayerControls.tsx and PlayerActions.tsx
    this.playPauseButton = page
      .getByLabel("Player Controls")
      .getByRole("button", { name: /Play|Pause/i });
    this.previousButton = page.getByRole("button", { name: "Previous Track" });
    this.nextButton = page.getByRole("button", { name: "Next Track" });
    this.shuffleButton = page.getByRole("button", { name: "Toggle Shuffle" });
    this.repeatButton = page.getByRole("button", { name: /Repeat/i });

    // More accurate for PlayerTrackInfo
    this.trackTitle = page.locator("div.text-white.font-semibold span").first();

    this.trackArtist = page
      .locator("div.text-white\\/50.text-\\[12px\\]")
      .first();
    this.progressSlider = page.locator('div[role="slider"]').first();

    this.moreActionsButton = page.getByRole("button", {
      name: "More Player Actions",
    });
    this.volumeButton = page.getByRole("button", { name: "Volume" });
    this.volumeSlider = page.locator('div[role="slider"]').last();
    this.audioQualityMenuTrigger = page.getByRole("menuitem", {
      name: "Audio Quality",
    });
  }

  async togglePlay() {
    await this.playPauseButton.click();
  }

  async skipForward() {
    await this.nextButton.click();
  }

  async skipBackward() {
    await this.previousButton.click();
  }

  async toggleShuffle() {
    await this.shuffleButton.click();
  }

  async toggleRepeat() {
    await this.repeatButton.click();
  }

  async setVolume(value: number) {
    await this.volumeButton.click();
    await this.volumeSlider.waitFor({ state: "visible" });
    const box = await this.volumeSlider.boundingBox();
    if (!box) {
      throw new Error("volume slider not visible");
    }
    await this.page.mouse.click(
      box.x + (box.width * value) / 100,
      box.y + box.height / 2,
    );
  }

  async seek(percentage: number) {
    const box = await this.progressSlider.boundingBox();
    if (!box) {
      throw new Error("progress slider not visible");
    }
    await this.page.mouse.click(
      box.x + (box.width * percentage) / 100,
      box.y + box.height / 2,
    );
  }

  async changeQuality(
    quality: "Auto" | "Lossless" | "High" | "Standard" | "Low",
  ) {
    await this.moreActionsButton.click();
    await this.audioQualityMenuTrigger.click();
    await this.page.getByRole("menuitemcheckbox", { name: quality }).click();
  }

  async expectPlaying(expectedTitle?: string) {
    if (expectedTitle) {
      await expect(this.trackTitle).toHaveText(expectedTitle);
    }
    // Check if progress slider value changes over time
    const initialValue =
      await this.progressSlider.getAttribute("aria-valuenow");
    await this.page.waitForTimeout(1000);
    const newValue = await this.progressSlider.getAttribute("aria-valuenow");
    expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
  }
}
