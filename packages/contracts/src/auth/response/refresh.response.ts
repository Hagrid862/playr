import { z } from "zod";
import { createApiResponseSchema } from "../../api/response.schema";
import { UserSchema } from "../../schemas/user.schema";

export const RefreshResponseSchema = createApiResponseSchema(
  z.object({
    accessToken: z.string(),
    user: UserSchema,
  }),
);

export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;
