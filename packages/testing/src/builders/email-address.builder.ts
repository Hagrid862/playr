import {
  randBetweenDate,
  randEmail,
  randPastDate,
  randUuid,
} from "@ngneat/falso";
import { EmailStatus, EmailType, type EmailAddress } from "@repo/db";

export function emailAddressBuilder(
  overrides?: Partial<EmailAddress>,
): EmailAddress {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    email: randEmail(),
    type: EmailType.primary,
    status: EmailStatus.pending,
    userId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    verifiedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
