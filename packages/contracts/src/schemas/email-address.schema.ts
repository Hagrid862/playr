import { EmailStatus, EmailType, type EmailAddress } from "@repo/db";
import z from "zod";

export const EmailAddressSchema = z.object({
  id: z.string(),
  email: z.string(),
  type: z.enum(EmailType),
  status: z.enum(EmailStatus),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  verifiedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<EmailAddress>;

export type ZodEmailAddress = z.infer<typeof EmailAddressSchema>;
