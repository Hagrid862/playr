import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { ArtistSchema } from "../schemas";

export const GetPrivateArtistsResponseSchema = createApiResponseSchema(
  z.array(ArtistSchema),
);

export type GetPrivateArtistsResponse = z.infer<
  typeof GetPrivateArtistsResponseSchema
>;
