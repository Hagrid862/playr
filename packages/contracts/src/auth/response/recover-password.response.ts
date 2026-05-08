import { createApiResponseSchema } from "../../api";
import { z } from "zod";

export const RecoverPasswordResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean(),
  }),
);

export type RecoverPasswordResponse = z.infer<
  typeof RecoverPasswordResponseSchema
>;
