import { CommunityReactionType, type CommunityCommentReaction } from "@repo/db";
import z from "zod";

export const CommunityCommentReactionSchema = z.object({
  id: z.string(),
  reaction: z.enum(CommunityReactionType),
  commentId: z.string(),
  profileId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<CommunityCommentReaction>;

export type ZodCommunityCommentReaction = z.infer<
  typeof CommunityCommentReactionSchema
>;
