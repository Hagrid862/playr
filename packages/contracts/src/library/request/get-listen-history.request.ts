import { z } from "zod";

export const GetListenHistoryRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetListenHistoryRequest = z.infer<
  typeof GetListenHistoryRequestSchema
>;
