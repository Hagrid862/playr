import { createApiResponseSchema } from "../../api/response.schema";
import { UserSchema } from "../../schemas/user.schema";
import { z } from "zod";

export const RegisterResponseSchema = createApiResponseSchema(
    z.object({
        emailVerificationToken: z.string(),
        user: UserSchema,
    })
);

export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
