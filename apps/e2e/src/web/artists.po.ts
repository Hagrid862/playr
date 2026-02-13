import { type Locator, type Page, expect } from "@playwright/test";

export class ArtistsPage {
  readonly page: Page;

  // Artists list page
  readonly addArtistButton: Locator;
  readonly emptyStateHeading: Locator;

  // Create artist form
  readonly artistNameInput: Locator;
  readonly descriptionTextarea: Locator;
  readonly createArtistSubmitButton: Locator;
  readonly createArtistCancelButton: Locator;

  // Artist detail page
  readonly artistDetailName: Locator;
  readonly playButton: Locator;
  readonly shuffleButton: Locator;
  readonly moreOptionsButton: Locator;

  // Edit artist form
  readonly editArtistNameInput: Locator;
  readonly editDescriptionTextarea: Locator;
  readonly saveChangesButton: Locator;
  readonly editCancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Artists list
    this.addArtistButton = page.getByRole("link", { name: "Add Artist" });
    this.emptyStateHeading = page.getByRole("heading", {
      name: "No artists found",
    });

    // Create form
    this.artistNameInput = page.getByLabel("Artist Name");
    this.descriptionTextarea = page.getByLabel("Description");
    this.createArtistSubmitButton = page.getByRole("button", {
      name: "Create Artist",
    });
    this.createArtistCancelButton = page.getByRole("link", { name: "Cancel" });

    // Artist detail
    this.artistDetailName = page.locator("h2.text-2xl.font-bold.text-white");
    this.playButton = page.getByRole("button", { name: "Play" });
    this.shuffleButton = page.getByRole("button", { name: "Shuffle" });
    this.moreOptionsButton = page.locator(
      'button:has([data-icon="DotsThree"])',
    );

    // Edit form (same labels, different page context — use same locators)
    this.editArtistNameInput = page.getByLabel("Artist Name");
    this.editDescriptionTextarea = page.getByLabel("Description");
    this.saveChangesButton = page.getByRole("button", {
      name: "Save Changes",
    });
    this.editCancelButton = page.getByRole("button", { name: "Cancel" });
  }

  async gotoArtistsList() {
    await this.page.goto("/app/library/artists");
    await this.page.waitForLoadState("networkidle");
  }

  async gotoCreateArtist() {
    await this.page.goto("/app/library/artists/create");
    await this.page.waitForLoadState("networkidle");
  }

  async clickAddArtist() {
    await this.addArtistButton.click();
    await expect(this.page).toHaveURL(/\/artists\/create/);
  }

  async fillCreateForm(data: { name: string; description?: string }) {
    await this.artistNameInput.fill(data.name);
    if (data.description) {
      await this.descriptionTextarea.fill(data.description);
    }
  }

  async submitCreateForm() {
    await this.createArtistSubmitButton.click();
  }

  async createArtist(data: { name: string; description?: string }) {
    await this.fillCreateForm(data);
    await expect(this.createArtistSubmitButton).toBeEnabled({ timeout: 5000 });
    await this.submitCreateForm();
    // Wait for redirect back to the artists list
    await expect(this.page).toHaveURL(/\/app\/library\/artists\/?$/, {
      timeout: 15000,
    });
  }

  async expectArtistInList(name: string) {
    await expect(this.page.getByRole("heading", { name })).toBeVisible({
      timeout: 10000,
    });
  }

  async clickArtistCard(name: string) {
    await this.page
      .locator("a")
      .filter({ has: this.page.getByRole("heading", { name }) })
      .click();
    await expect(this.page).toHaveURL(/\/app\/library\/artists\/[^/]+\/?$/, {
      timeout: 10000,
    });
  }

  async expectArtistDetailPage(name: string) {
    await expect(this.artistDetailName).toHaveText(name, { timeout: 10000 });
  }

  async openMoreOptionsMenu() {
    // Find the last contextual dots-three button in the action bar
    const actionBar = this.page.locator(".flex.items-center.gap-1");
    const dotsInBar = actionBar.locator("button").last();
    await dotsInBar.click();
  }

  async clickEditFromMenu() {
    await this.openMoreOptionsMenu();
    await this.page
      .getByRole("menuitem", { name: "Edit" })
      .waitFor({ state: "visible" });
    await this.page.getByRole("menuitem", { name: "Edit" }).click();
    await expect(this.page).toHaveURL(/\/edit/, { timeout: 10000 });
  }

  async fillEditForm(data: { name?: string; description?: string }) {
    if (data.name !== undefined) {
      await this.editArtistNameInput.clear();
      await this.editArtistNameInput.fill(data.name);
    }
    if (data.description !== undefined) {
      await this.editDescriptionTextarea.clear();
      await this.editDescriptionTextarea.fill(data.description);
    }
  }

  async submitEditForm() {
    await this.saveChangesButton.click();
    // Wait for redirect back to artist detail page
    await expect(this.page).toHaveURL(/\/app\/library\/artists\/[^/]+\/?$/, {
      timeout: 15000,
    });
  }

  async clickDeleteFromMenu() {
    await this.openMoreOptionsMenu();
    await this.page
      .getByRole("menuitem", { name: "Delete" })
      .waitFor({ state: "visible" });
    await this.page.getByRole("menuitem", { name: "Delete" }).click();
  }

  async confirmDelete() {
    const dialog = this.page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete Artist" }).click();
    // Wait for redirect back to artists list
    await expect(this.page).toHaveURL(/\/app\/library\/artists\/?$/, {
      timeout: 15000,
    });
  }

  async expectArtistNotInList(name: string) {
    await expect(
      this.page.getByRole("heading", { name, exact: true }),
    ).not.toBeVisible({ timeout: 5000 });
  }

  async expectFieldError(label: string, error: string) {
    const field = this.page
      .locator('div[data-slot="field"]')
      .filter({ has: this.page.locator(`label:text-is("${label}")`) });
    await expect(field.locator('[data-slot="field-error"]')).toHaveText(error);
  }
}
