import { type ReportTarget } from "@repo/db";
import z from "zod";

export const ReportTargetSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  communityProfileId: z.string().nullable(),
  communityCommentId: z.string().nullable(),
  artistId: z.string().nullable(),
  albumId: z.string().nullable(),
  trackId: z.string().nullable(),
  playlistId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<ReportTarget>;

export type ZodReportTarget = z.infer<typeof ReportTargetSchema>;
