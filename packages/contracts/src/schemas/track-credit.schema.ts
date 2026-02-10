import { CreditRole, type TrackCredit } from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodTrackCredit extends TrackCredit {
  track?: ZodTrack;
}

export const TrackCreditSchema: z.ZodType<ZodTrackCredit> = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(CreditRole),
  trackId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),

  track: z.lazy(() => TrackSchema).optional(),
});

export type ZodTrackCreditInfer = z.infer<typeof TrackCreditSchema>;
