import { z } from "zod";
import { createApiResponseSchema } from "../../api/response.schema";
import { UserSchema } from "../../schemas";

export const LoginResponseSchema = createApiResponseSchema(
  z.object({
    accessToken: z.string(),
    user: UserSchema,
  }),
);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
