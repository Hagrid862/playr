import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const GetLibraryTracksResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(TrackSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);

export type GetLibraryTracksResponse = z.infer<
  typeof GetLibraryTracksResponseSchema
>;
