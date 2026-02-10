import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { LibraryArtistSchema } from "../schemas";

export const GetLibraryArtistRequestSchema = z.object({
  id: z.string(),
});

export type GetLibraryArtistRequestDto = z.infer<
  typeof GetLibraryArtistRequestSchema
>;

export const GetLibraryArtistResponseSchema =
  createApiResponseSchema(LibraryArtistSchema);

export type GetLibraryArtistResponseDto = z.infer<
  typeof GetLibraryArtistResponseSchema
>;
