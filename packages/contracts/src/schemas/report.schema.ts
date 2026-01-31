import { ReportStatus, type Report } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const ReportSchema = z.object({
  id: z.string(),
  reason: z.string(),
  description: z.string().nullable(),
  status: z.enum(ReportStatus),
  userId: z.string(),
  targetId: z.string().nullable(),
  assignedModeratorId: z.string().nullable(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Report>;

export type ZodReport = z.infer<typeof ReportSchema>;
