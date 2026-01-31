import { ReportStatus, type Report } from "@repo/db";
import z from "zod";

export const ReportSchema = z.object({
  id: z.string(),
  reason: z.string(),
  description: z.string().nullable(),
  status: z.enum(ReportStatus),
  userId: z.string(),
  targetId: z.string().nullable(),
  assignedModeratorId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Report>;

export type ZodReport = z.infer<typeof ReportSchema>;
