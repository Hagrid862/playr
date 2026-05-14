import { type Locator, type Page, expect } from "@playwright/test";

export class LibraryArtistsPage {
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

  readonly avatarInput: Locator;
  readonly bannerInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Artists list
    this.addArtistButton = page.getByRole("link", { name: "Add Artist" });
    this.emptyStateHeading = page.getByRole("heading", {
      name: "No artists found",
    });

    // Create form (CreateArtistForm.tsx)
    this.artistNameInput = page.getByLabel("Artist Name");
    this.descriptionTextarea = page.getByLabel("Description");
    this.createArtistSubmitButton = page.getByRole("button", {
      name: "Create Artist",
    });
    this.createArtistCancelButton = page.getByRole("link", { name: "Cancel" });

    // Artist detail
    this.artistDetailName = page.locator("h2.text-2xl.font-bold");
    this.playButton = page.getByRole("button", { name: "Play" });
    this.shuffleButton = page.getByRole("button", { name: "Shuffle" });
    // The menu trigger in detail page
    this.moreOptionsButton = page.getByRole("button", { name: "More options" });

    // Edit form (EditArtistForm.tsx - same labels)
    this.editArtistNameInput = page.getByLabel("Artist Name");
    this.editDescriptionTextarea = page.getByLabel("Description");
    this.saveChangesButton = page.getByRole("button", {
      name: "Save Changes",
    });
    this.editCancelButton = page.getByRole("button", { name: "Cancel" });

    // Inputs for file upload
    this.avatarInput = page
      .locator('input[type="file"][accept="image/*"]')
      .first();
    this.bannerInput = page
      .locator('input[type="file"][accept="image/*"]')
      .nth(1);
  }

  async uploadAvatar(filePath: string) {
    await this.avatarInput.setInputFiles(filePath);
  }

  async uploadBanner(filePath: string) {
    // In edit form, we expect two inputs. In create form, likely one (avatar).
    // This simple logic might need refinement if the DOM order changes, but works for now.
    await this.bannerInput.setInputFiles(filePath);
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
    await expect(this.createArtistSubmitButton).toBeEnabled();
    await this.submitCreateForm();
    // Redirects to list based on frontend code
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
    // Redirects to detail page
    await expect(this.page).toHaveURL(/\/app\/library\/artists\/[^/]+\/?$/, {
      timeout: 10000,
    });
  }

  async expectArtistDetailPage(name: string) {
    await expect(this.artistDetailName).toHaveText(name, { timeout: 10000 });
  }

  async openMoreOptionsMenu() {
    await this.moreOptionsButton.click();
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
    await this.saveChangesButton.scrollIntoViewIfNeeded();
    // requestSubmit avoids the fixed bottom player intercepting pointer events on the submit button
    await this.saveChangesButton.evaluate((btn: HTMLButtonElement) => {
      btn.form?.requestSubmit(btn);
    });
    // Redirects after PATCH + optional avatar/banner uploads (can be slow in Docker)
    await expect(this.page).toHaveURL(/\/app\/library\/artists\/[^/]+\/?$/, {
      timeout: 60000,
    });
  }

  async clickEditCancel() {
    await this.editCancelButton.scrollIntoViewIfNeeded();
    await this.editCancelButton.evaluate((el: HTMLElement) => {
      el.click();
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
    // Redirects back to artists list
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
      .locator('div[data-slot="field"]') // Assuming default shadcn form structure, adjust if needed
      .filter({ has: this.page.locator(`label:text-is("${label}")`) });
    await expect(field.locator('[data-slot="field-error"]')).toHaveText(error);
  }
}
