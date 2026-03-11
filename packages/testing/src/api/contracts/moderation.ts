import { ReportStatus } from "@repo/db";
import type {
  ZodReport,
  ZodReportTarget,
  ZodModeratorAccount,
} from "@repo/contracts";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildZodReport(overrides: Partial<ZodReport> = {}): ZodReport {
  const base: ZodReport = {
    id: "report-1",
    reason: "spam",
    description: null,
    status: ReportStatus.created,
    userId: "user-1",
    targetId: "target-1",
    assignedModeratorId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodReportTarget(
  overrides: Partial<ZodReportTarget> = {},
): ZodReportTarget {
  const base: ZodReportTarget = {
    id: "target-1",
    userId: null,
    communityProfileId: null,
    communityCommentId: null,
    artistId: null,
    albumId: null,
    trackId: "track-1",
    playlistId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodModeratorAccount(
  overrides: Partial<ZodModeratorAccount> = {},
): ZodModeratorAccount {
  const base: ZodModeratorAccount = {
    id: "moderator-1",
    userId: "user-1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
