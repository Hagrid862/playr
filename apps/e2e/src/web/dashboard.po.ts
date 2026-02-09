import { type Locator, type Page, expect } from "@playwright/test";

export class DashboardPage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly logoutButton: Locator;
  readonly createLibraryButton: Locator;
  readonly libraryOverviewLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('nav[data-sidebar="sidebar"]');
    this.logoutButton = page.getByRole("button", { name: "Log out" });
    this.createLibraryButton = page.getByRole("button", {
      name: "Create Library",
    });
    this.libraryOverviewLink = page.getByRole("link", { name: "Overview" });
  }

  async goto() {
    await this.page.goto("/app");
  }

  async gotoLibraryOverview() {
    await this.libraryOverviewLink.click();
    await expect(this.page).toHaveURL(/\/app\/library\/overview/);
  }

  async createLibrary() {
    await this.createLibraryButton.click();
    // Use a non-blocking check for the loading state as it might be very brief
    await this.page
      .getByText("Just a sec...")
      .waitFor({ state: "visible", timeout: 2000 })
      .catch(() => { });
    await expect(this.page.getByText("Your Private Library")).toBeVisible({
      timeout: 15000,
    });
  }

  async logout() {
    await this.logoutButton.click();
    await expect(this.page).toHaveURL(/\/auth\/login/);
  }
}
