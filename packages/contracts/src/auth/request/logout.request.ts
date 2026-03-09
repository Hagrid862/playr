import { z } from "zod";

export const LogoutRequestSchema = z.object({}).strict();

export type LogoutRequest = z.infer<typeof LogoutRequestSchema>;
