import { createApiResponseSchema } from "../../api";
import { z } from "zod";
import { UserSchema } from "../../schemas";

export const VerifyEmailResponseSchema = createApiResponseSchema(
  z.object({
    accessToken: z.string(),
    user: UserSchema,
  }),
);

export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;
