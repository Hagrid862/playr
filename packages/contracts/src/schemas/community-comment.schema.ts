import { type CommunityComment } from "@repo/db";
import z from "zod";

export const CommunityCommentSchema = z.object({
  id: z.string(),
  content: z.string(),
  isPinned: z.boolean(),
  profileId: z.string(),
  trackId: z.string().nullable(),
  albumId: z.string().nullable(),
  parentId: z.string().nullable(),
  attachedImageId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}) satisfies z.ZodType<CommunityComment>;

export type ZodCommunityComment = z.infer<typeof CommunityCommentSchema>;
