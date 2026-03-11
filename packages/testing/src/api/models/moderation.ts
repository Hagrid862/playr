import {
  ReportStatus,
  type Report,
  type ReportTarget,
  type ModeratorAccount,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildReport(overrides: Partial<Report> = {}): Report {
  const base: Report = {
    id: "report-123",
    reason: "spam",
    description: null,
    status: ReportStatus.created,
    userId: "user-123",
    targetId: null,
    assignedModeratorId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildReportTarget(
  overrides: Partial<ReportTarget> = {},
): ReportTarget {
  const base: ReportTarget = {
    id: "report-target-123",
    userId: null,
    communityProfileId: null,
    communityCommentId: null,
    artistId: null,
    albumId: null,
    trackId: null,
    playlistId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildModeratorAccount(
  overrides: Partial<ModeratorAccount> = {},
): ModeratorAccount {
  const base: ModeratorAccount = {
    id: "moderator-123",
    userId: "user-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
