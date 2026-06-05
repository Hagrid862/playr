import { test as base } from "@playwright/test";
import {
  createVerifiedUser,
  type VerifiedUser,
} from "./authenticated-user.helper";
import { uniqueSuffix } from "../test-data.helper";

type AuthFixtures = {
  verifiedUser: VerifiedUser;
};

export const test = base.extend<AuthFixtures>({
  verifiedUser: async ({ page }, use) => {
    const user = await createVerifiedUser(page, {
      prefix: `fixture_user_${uniqueSuffix()}`,
    });
    await use(user);
  },
});

export { expect } from "@playwright/test";
