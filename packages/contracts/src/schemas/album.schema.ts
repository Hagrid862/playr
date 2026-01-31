import { AlbumType, type Album } from "@repo/db";
import z from "zod";

export const AlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(AlbumType),
  totalTracks: z.number().int(),
  totalDuration: z.number().int(),
  releaseDate: z.date().nullable(),
  coverId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Album>;

export type ZodAlbum = z.infer<typeof AlbumSchema>;
