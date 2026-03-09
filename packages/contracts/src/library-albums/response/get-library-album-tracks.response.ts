import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const GetLibraryAlbumTracksResponseSchema = createApiResponseSchema(
  z.array(TrackSchema),
);

export type GetLibraryAlbumTracksResponse = z.infer<
  typeof GetLibraryAlbumTracksResponseSchema
>;
