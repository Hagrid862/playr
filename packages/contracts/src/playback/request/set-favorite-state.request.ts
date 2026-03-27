import { z } from "zod";

export const SetFavoriteStateRequestSchema = z
  .object({
    favorite: z.enum(["favorited", "disliked", "not-set"]),
    expectedVersion: z.number().int().min(0).default(0),
  })
  .strict();

export type SetFavoriteStateRequest = z.infer<
  typeof SetFavoriteStateRequestSchema
>;
