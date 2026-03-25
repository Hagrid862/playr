import { createApiResponseSchema } from "../../api";
import { z } from "zod";

export const VerifyEmailResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean,
  }),
);

export type VerifyEmailResponse = z.infer<typeof VerifyEmailResponseSchema>;