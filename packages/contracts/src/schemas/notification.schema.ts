import { NotificationStatus, type Notification } from "@repo/db";
import z from "zod";

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(NotificationStatus),
  userId: z.string(),
  createdAt: z.date(),
  dismissedAt: z.date().nullable(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<Notification>;

export type ZodNotification = z.infer<typeof NotificationSchema>;
