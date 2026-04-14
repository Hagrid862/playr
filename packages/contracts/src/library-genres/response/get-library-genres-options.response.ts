import { GenreKind } from "@repo/db";
import { z } from "zod";
import { createApiResponseSchema } from "../../api";

export const LibraryGenreOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  kind: z.enum(GenreKind),
});

export const GetLibraryGenresOptionsResponseSchema = createApiResponseSchema(
  z.array(LibraryGenreOptionSchema),
);

export type GetLibraryGenresOptionsResponse = z.infer<
  typeof GetLibraryGenresOptionsResponseSchema
>;
