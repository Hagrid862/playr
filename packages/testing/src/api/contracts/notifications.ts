import { NotificationStatus } from "@repo/db";
import type { ZodNotification } from "@repo/contracts";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildZodNotification(
  overrides: Partial<ZodNotification> = {},
): ZodNotification {
  const base: ZodNotification = {
    id: "notification-1",
    title: "Test Notification",
    description: "This is a test notification",
    status: NotificationStatus.default,
    userId: "user-1",
    createdAt: now,
    dismissedAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
