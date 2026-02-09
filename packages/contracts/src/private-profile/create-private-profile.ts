import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { UserPrivateProfileSchema } from "../schemas";

export const CreatePrivateProfileResponseSchema = createApiResponseSchema(
  UserPrivateProfileSchema,
);

export type CreatePrivateProfileResponseDto = z.infer<
  typeof CreatePrivateProfileResponseSchema
>;
