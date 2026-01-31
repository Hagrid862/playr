import { NotificationStatus, type Notification } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const NotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(NotificationStatus),
  userId: z.string(),
  createdAt: zodDateTime(),
  dismissedAt: zodDateTimeNullable(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<Notification>;

export type ZodNotification = z.infer<typeof NotificationSchema>;
