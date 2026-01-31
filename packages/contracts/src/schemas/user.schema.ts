import { Gender, type User } from "@repo/db";
import z from "zod";

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string().nullable(),
  birthDate: z.string().nullable(),
  gender: z.enum(Gender).nullable(),
  description: z.string().nullable(),
  password: z.string(),
  avatarId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<User>;

export type ZodUser = z.infer<typeof UserSchema>;
