import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const BulkCreateLibraryTracksResponseSchema = createApiResponseSchema(
  z.object({
    tracks: z.array(TrackSchema),
  }),
);

export type BulkCreateLibraryTracksResponse = z.infer<
  typeof BulkCreateLibraryTracksResponseSchema
>;
