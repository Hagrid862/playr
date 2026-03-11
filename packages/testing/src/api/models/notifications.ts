import { NotificationStatus, type Notification } from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildNotification(
  overrides: Partial<Notification> = {},
): Notification {
  const base: Notification = {
    id: "notification-123",
    title: "Test Notification",
    description: "This is a test notification.",
    status: NotificationStatus.default,
    userId: "user-id-123",
    createdAt: now,
    dismissedAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
