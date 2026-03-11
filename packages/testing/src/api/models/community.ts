import {
  CommunityReactionType,
  type CommunityProfile,
  type CommunityComment,
  type CommunityCommentReaction,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildCommunityProfile(
  overrides: Partial<CommunityProfile> = {},
): CommunityProfile {
  const base: CommunityProfile = {
    id: "community-profile-123",
    name: "Test Profile",
    description: null,
    isVerified: false,
    coverId: null,
    avatarId: null,
    userId: "user-123",
    artistId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildCommunityComment(
  overrides: Partial<CommunityComment> = {},
): CommunityComment {
  const base: CommunityComment = {
    id: "comment-123",
    content: "This is a test comment",
    isPinned: false,
    profileId: "community-profile-123",
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

export function buildCommunityCommentReaction(
  overrides: Partial<CommunityCommentReaction> = {},
): CommunityCommentReaction {
  const base: CommunityCommentReaction = {
    id: "reaction-123",
    reaction: CommunityReactionType.like,
    commentId: "comment-123",
    profileId: "community-profile-123",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
