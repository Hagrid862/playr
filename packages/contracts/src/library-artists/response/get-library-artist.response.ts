import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { LibraryArtistSchema } from "../../schemas";

export const GetLibraryArtistResponseSchema =
  createApiResponseSchema(LibraryArtistSchema);

export type GetLibraryArtistResponseDto = z.infer<
  typeof GetLibraryArtistResponseSchema
>;
