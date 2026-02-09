import z from "zod";
import { createApiResponseSchema } from "../api";
import { ArtistSchema } from "../schemas";

export const CreateArtistRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2048).optional(),
});

export type CreateArtistRequest = z.infer<typeof CreateArtistRequestSchema>;

export const CreateArtistResponseSchema = createApiResponseSchema(ArtistSchema);

export type CreateArtistResponse = z.infer<typeof CreateArtistResponseSchema>;
