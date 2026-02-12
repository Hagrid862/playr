import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { AlbumSchema } from "../schemas";

export const GetArtistAlbumsResponseSchema = createApiResponseSchema(
  z.array(AlbumSchema),
);

export type GetArtistAlbumsResponse = z.infer<
  typeof GetArtistAlbumsResponseSchema
>;
