import { z } from "zod";

export const SetRepeatStateRequestSchema = z
  .object({
    repeatMode: z.enum(["off", "all", "one"]),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export type SetRepeatStateRequest = z.infer<typeof SetRepeatStateRequestSchema>;
