import { z } from "zod";
import { createApiResponseSchema } from "../api";
import { ArtistSchema } from "../schemas";

export const DeleteArtistResponseSchema = createApiResponseSchema(ArtistSchema);

export type DeleteArtistResponse = z.infer<typeof DeleteArtistResponseSchema>;
