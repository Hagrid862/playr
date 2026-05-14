import { z } from "zod";

export const PresenceTouchResponseSchema = z.object({
  ok: z.literal(true),
  serverTime: z.iso.datetime(),
});

export type PresenceTouchResponse = z.infer<typeof PresenceTouchResponseSchema>;
