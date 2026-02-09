import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { UserPrivateProfileSchema } from "../schemas";

export const GetPrivateProfileResponseSchema = createApiResponseSchema(
  UserPrivateProfileSchema,
);

export type GetPrivateProfileResponseDto = z.infer<
  typeof GetPrivateProfileResponseSchema
>;
