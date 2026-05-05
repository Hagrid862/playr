import { createApiResponseSchema } from "../../api";
import { UserWithPrimaryEmailSchema } from "../../schemas";
import { z } from "zod";

export const RegisterResponseSchema = createApiResponseSchema(
  z.object({
    user: UserWithPrimaryEmailSchema,
    isEmailSent: z.boolean(),
  }),
);

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
