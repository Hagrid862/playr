import { CommunityReactionType, type CommunityCommentReaction } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";

export const CommunityCommentReactionSchema = z.object({
  id: z.string(),
  reaction: z.enum(CommunityReactionType),
  commentId: z.string(),
  profileId: z.string(),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),
}) satisfies z.ZodType<CommunityCommentReaction>;

export type ZodCommunityCommentReaction = z.infer<
  typeof CommunityCommentReactionSchema
>;
