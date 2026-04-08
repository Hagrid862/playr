import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { UserWithPrimaryEmailSchema } from "../../schemas";

export const AuthenticatedLoginResponseSchema = z.object({
  outcome: z.literal("authenticated"),
  accessToken: z.string(),
  user: UserWithPrimaryEmailSchema,
});

export const UnauthenticatedEmailLoginResponseSchema = z.object({
  outcome: z.literal("unauthenticated"),
  user: UserWithPrimaryEmailSchema,
  isEmailSent: z.boolean(),
});

export const LoginResponseSchema = createApiResponseSchema(
  z.discriminatedUnion("outcome", [
    AuthenticatedLoginResponseSchema,
    UnauthenticatedEmailLoginResponseSchema,
  ]),
);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
