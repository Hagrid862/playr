import { EmailStatus, EmailType, type EmailAddress } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { UserSchema, type ZodUser } from "./user.schema";

export interface ZodEmailAddress extends EmailAddress {
  user?: ZodUser;
}

export const EmailAddressSchema: z.ZodType<ZodEmailAddress> = z.object({
  id: z.string(),
  email: z.string(),
  type: z.enum(EmailType),
  status: z.enum(EmailStatus),
  userId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  verifiedAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),

  user: z.lazy(() => UserSchema).optional(),
});

export type ZodEmailAddressInfer = z.infer<typeof EmailAddressSchema>;
