import z from "zod";
import { createApiResponseSchema } from "../../api";

export const ResendEmailVerificationCodeResponseSchema =
  createApiResponseSchema(
    z.object({
      isEmailSent: z.boolean(),
    }),
  );

export type ResendEmailVerificationCodeResponse = z.infer<
  typeof ResendEmailVerificationCodeResponseSchema
>;
