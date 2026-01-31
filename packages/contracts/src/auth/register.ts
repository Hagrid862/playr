import { z } from "zod";
import { createApiResponseSchema } from "../api/response.schema";
import { UserSchema } from "../schemas/user.schema";
import { Gender } from "@repo/db";

export const RegisterRequestSchema = z.object({
  username: z.string().min(3).max(32),
  firstName: z.string().min(3).max(32),
  lastName: z.string().min(3).max(32),
  birthDate: z.string().max(10),
  gender: z.enum(Gender),
  email: z.email().max(256),
  password: z.string().min(8).max(128),
});

export const RegisterResponseSchema = createApiResponseSchema(
  UserSchema.omit({ password: true }),
);

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
