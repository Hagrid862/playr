import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { LibraryArtistSchema } from "../schemas";

export const GetLibraryArtistsRequestSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type GetLibraryArtistsRequestDto = z.infer<
  typeof GetLibraryArtistsRequestSchema
>;

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
