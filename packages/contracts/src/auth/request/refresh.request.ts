import { z } from "zod";

export const RefreshRequestSchema = z.object({}).strict();

export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;
