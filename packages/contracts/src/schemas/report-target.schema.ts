import { type ReportTarget } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const ReportTargetSchema = z.object({
  id: z.string(),
  userId: z.string().nullable(),
  communityProfileId: z.string().nullable(),
  communityCommentId: z.string().nullable(),
  artistId: z.string().nullable(),
  albumId: z.string().nullable(),
  trackId: z.string().nullable(),
  playlistId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<ReportTarget>;

export type ZodReportTarget = z.infer<typeof ReportTargetSchema>;
