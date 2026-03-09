import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { TrackSchema } from "../../schemas";

export const GetLibraryTrackResponseSchema =
  createApiResponseSchema(TrackSchema);

export type GetLibraryTrackResponse = z.infer<
  typeof GetLibraryTrackResponseSchema
>;
