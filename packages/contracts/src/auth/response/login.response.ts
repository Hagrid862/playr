import { z } from "zod";
import { createApiResponseSchema } from "../../api/response.schema";
import { UserSchema } from "../../schemas";


export const AuthenticatedLoginResponseSchema = z.object({
    outcome: z.literal("authenticated"),
    accessToken: z.string(),
    user: UserSchema,
});

export const UnauthenticatedEmailLoginResponseSchema = z.object({
    outcome: z.literal("unauthenticated"),
    emailVerificationToken: z.string(),
    user: UserSchema,
});

export const LoginResponseSchema = createApiResponseSchema(
  z.discriminatedUnion("outcome", [
      AuthenticatedLoginResponseSchema,
      UnauthenticatedEmailLoginResponseSchema,
      ]),
);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
