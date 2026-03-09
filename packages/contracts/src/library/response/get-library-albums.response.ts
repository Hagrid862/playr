import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { LibraryAlbumSchema } from "../../schemas";

export const GetLibraryAlbumsResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(LibraryAlbumSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);

export type GetLibraryAlbumsResponse = z.infer<
  typeof GetLibraryAlbumsResponseSchema
>;
