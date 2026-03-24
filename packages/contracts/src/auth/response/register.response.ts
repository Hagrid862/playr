import { createApiResponseSchema } from "../../api/response.schema";
import { UserSchema } from "../../schemas/user.schema";
import { boolean, z } from "zod";

export const RegisterResponseSchema = createApiResponseSchema(
  z.object({
    user: UserSchema,
    isEmailSent: boolean,
  }),
);

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
