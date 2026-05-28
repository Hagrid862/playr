import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const GetListenHistoryResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(
      z.object({
        id: z.string(),
        listenedAt: z.string().datetime(),
        durationMs: z.number(),
        completed: z.boolean(),
        track: TrackSchema,
      }),
    ),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
  }),
);

export type GetListenHistoryResponse = z.infer<
  typeof GetListenHistoryResponseSchema
>;
