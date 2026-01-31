import { CreditRole, type TrackCredit } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const TrackCreditSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(CreditRole),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<TrackCredit>;

export type ZodTrackCredit = z.infer<typeof TrackCreditSchema>;
