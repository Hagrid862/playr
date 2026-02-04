import { AlbumType, type Album } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const AlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.enum(AlbumType),
  totalTracks: z.number().int(),
  totalDuration: z.number().int(),
  releaseDate: zodDateTimeNullable(),
  coverId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Album>;

export type ZodAlbum = z.infer<typeof AlbumSchema>;
