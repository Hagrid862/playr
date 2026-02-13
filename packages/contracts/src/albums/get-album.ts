import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { AlbumSchema } from "../schemas";

export const GetAlbumResponseSchema = createApiResponseSchema(AlbumSchema);

export type GetAlbumResponse = z.infer<typeof GetAlbumResponseSchema>;
