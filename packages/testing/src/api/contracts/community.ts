import { CommunityReactionType } from "@repo/db";
import type {
  ZodCommunityProfile,
  ZodCommunityComment,
  ZodCommunityCommentReaction,
} from "@repo/contracts";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildZodCommunityProfile(
  overrides: Partial<ZodCommunityProfile> = {},
): ZodCommunityProfile {
  const base: ZodCommunityProfile = {
    id: "profile-1",
    name: "Test Profile",
    description: null,
    isVerified: false,
    coverId: null,
    avatarId: null,
    userId: "user-1",
    artistId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodCommunityComment(
  overrides: Partial<ZodCommunityComment> = {},
): ZodCommunityComment {
  const base: ZodCommunityComment = {
    id: "comment-1",
    content: "Test comment",
    isPinned: false,
    profileId: "profile-1",
    trackId: null,
    albumId: null,
    parentId: null,
    attachedImageId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodCommunityCommentReaction(
  overrides: Partial<ZodCommunityCommentReaction> = {},
): ZodCommunityCommentReaction {
  const base: ZodCommunityCommentReaction = {
    id: "reaction-1",
    reaction: CommunityReactionType.like,
    commentId: "comment-1",
    profileId: "profile-1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
