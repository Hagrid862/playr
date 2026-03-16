import { EmailStatus, EmailType, type EmailAddress } from "@repo/db";
import { TEST_IDS } from "./constants";

export function emailAddressBuilder(
  overrides?: Partial<EmailAddress>,
): EmailAddress {
  const now = new Date();
  return {
    id: TEST_IDS.emailAddress,
    email: "test@example.com",
    type: EmailType.primary,
    status: EmailStatus.pending,
    userId: TEST_IDS.user,
    createdAt: now,
    updatedAt: now,
    verifiedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
