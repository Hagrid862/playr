import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { LibraryArtistSchema } from "../../schemas";

export const GetLibraryArtistsResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(LibraryArtistSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);

export type GetLibraryArtistsResponseDto = z.infer<
  typeof GetLibraryArtistsResponseSchema
>;
