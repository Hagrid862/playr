import { randEmail, randPastDate, randUuid } from "@ngneat/falso";
import { EmailStatus, EmailType, type EmailAddress } from "@repo/db";

export function emailAddressBuilder(
  overrides?: Partial<EmailAddress>,
): EmailAddress {
  return {
    id: randUuid(),
    email: randEmail(),
    type: EmailType.primary,
    status: EmailStatus.pending,
    userId: randUuid(),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    verifiedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
