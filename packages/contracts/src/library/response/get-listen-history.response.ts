import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const GetListenHistoryResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(
      z.object({
        id: z.string(),
        listenedAt: z.string(),
        durationMs: z.number(),
        completed: z.boolean(),
        track: TrackSchema,
      }),
    ),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);

export type GetListenHistoryResponse = z.infer<
  typeof GetListenHistoryResponseSchema
>;
