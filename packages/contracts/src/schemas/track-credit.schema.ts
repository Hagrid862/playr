import { CreditRole, type TrackCredit } from "@repo/db";
import z from "zod";

export const TrackCreditSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(CreditRole),
  trackId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
}) satisfies z.ZodType<TrackCredit>;

export type ZodTrackCredit = z.infer<typeof TrackCreditSchema>;
