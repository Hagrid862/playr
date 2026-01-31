import { EmailStatus, EmailType, type EmailAddress } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const EmailAddressSchema = z.object({
  id: z.string(),
  email: z.string(),
  type: z.enum(EmailType),
  status: z.enum(EmailStatus),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  verifiedAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<EmailAddress>;

export type ZodEmailAddress = z.infer<typeof EmailAddressSchema>;
