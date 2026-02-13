import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { LibraryAlbumSchema } from "../schemas";

export const GetLibraryAlbumsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetLibraryAlbumsRequestDto = z.infer<
  typeof GetLibraryAlbumsRequestSchema
>;

export const GetLibraryAlbumsResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(LibraryAlbumSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);

export type GetLibraryAlbumsResponseDto = z.infer<
  typeof GetLibraryAlbumsResponseSchema
>;
