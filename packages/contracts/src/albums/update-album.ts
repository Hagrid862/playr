import { AlbumType } from "@repo/db";
import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { AlbumSchema } from "../schemas";
import { zodDateTimeNullable } from "../utils";

export const UpdateAlbumRequestSchema = z.object({
  name: z
    .string()
    .min(1, "Album name cannot be empty")
    .max(255, "Album name must be 255 characters or less")
    .optional(),
  description: z
    .string()
    .max(2048, "Description must be 2048 characters or less")
    .optional(),
  type: z.enum(AlbumType).optional(),
  releaseDate: zodDateTimeNullable().optional(),
  coverId: z.string().nullable().optional(),
});

export type UpdateAlbumRequest = z.infer<typeof UpdateAlbumRequestSchema>;

export const UpdateAlbumResponseSchema = createApiResponseSchema(AlbumSchema);

export type UpdateAlbumResponse = z.infer<typeof UpdateAlbumResponseSchema>;
