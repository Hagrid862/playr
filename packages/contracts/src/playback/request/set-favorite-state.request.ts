import { z } from "zod";

export const SetFavoriteStateRequestSchema = z
  .object({
    favorite: z.enum(["favorited", "disliked", "not-set"]),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type SetFavoriteStateRequest = z.infer<
  typeof SetFavoriteStateRequestSchema
>;
