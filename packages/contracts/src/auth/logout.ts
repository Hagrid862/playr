import { z } from "zod";
import { createApiResponseSchema } from "../api/response.schema";

export const LogoutResponseSchema = createApiResponseSchema(z.object({}));

export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
