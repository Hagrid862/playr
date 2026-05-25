import { z } from "zod";
import { createApiResponseSchema } from "../../api";
import { ImageSchema } from "../../schemas/image.schema";
import { PlaylistSystemRoleSchema } from "../../schemas/playlist.schema";
import { TrackSchema } from "../../schemas/track.schema";
import { zodDateTime } from "../../utils/zod-datetime";

export const LibraryPlaylistListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemRole: PlaylistSystemRoleSchema.nullable(),
  cover: ImageSchema.nullable().optional(),
  trackCount: z.number().int(),
  pinned: z.boolean(),
  pinOrder: z.number().int().nullable(),
  /** Sidebar pin row id when `pinned`; required for unpin API. */
  pinId: z.string().nullable(),
});

export type LibraryPlaylistListItem = z.infer<
  typeof LibraryPlaylistListItemSchema
>;

export const GetLibraryPlaylistsResponseSchema = createApiResponseSchema(
  z.object({
    items: z.array(LibraryPlaylistListItemSchema),
  }),
);

export type GetLibraryPlaylistsResponse = z.infer<
  typeof GetLibraryPlaylistsResponseSchema
>;

export const LibraryPlaylistTrackRowSchema = z.object({
  addedAt: zodDateTime(),
  track: TrackSchema,
});

export const GetLibraryPlaylistDetailDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  systemRole: PlaylistSystemRoleSchema.nullable(),
  cover: ImageSchema.nullable().optional(),
  tracks: z.array(LibraryPlaylistTrackRowSchema),
  page: z.number().int(),
  limit: z.number().int(),
  totalTracks: z.number().int(),
});

export const GetLibraryPlaylistDetailResponseSchema = createApiResponseSchema(
  GetLibraryPlaylistDetailDataSchema,
);

export type GetLibraryPlaylistDetailResponse = z.infer<
  typeof GetLibraryPlaylistDetailResponseSchema
>;

export const LibraryPlaylistPinRowSchema = z.object({
  id: z.string(),
  order: z.number().int(),
  playlist: z.object({
    id: z.string(),
    name: z.string(),
    systemRole: PlaylistSystemRoleSchema.nullable(),
    cover: ImageSchema.nullable().optional(),
  }),
});

export const GetLibraryPlaylistPinsResponseSchema = createApiResponseSchema(
  z.array(LibraryPlaylistPinRowSchema),
);

export type GetLibraryPlaylistPinsResponse = z.infer<
  typeof GetLibraryPlaylistPinsResponseSchema
>;

export const CreateLibraryPlaylistResponseSchema = createApiResponseSchema(
  LibraryPlaylistListItemSchema,
);

export type CreateLibraryPlaylistResponse = z.infer<
  typeof CreateLibraryPlaylistResponseSchema
>;

export const UpdateLibraryPlaylistResponseSchema = createApiResponseSchema(
  LibraryPlaylistListItemSchema,
);

export type UpdateLibraryPlaylistResponse = z.infer<
  typeof UpdateLibraryPlaylistResponseSchema
>;

export const DeleteLibraryPlaylistResponseSchema = createApiResponseSchema(
  z.object({ id: z.string() }),
);

export type DeleteLibraryPlaylistResponse = z.infer<
  typeof DeleteLibraryPlaylistResponseSchema
>;

export const AddPlaylistTrackResponseSchema = createApiResponseSchema(
  z.object({ ok: z.literal(true) }),
);

export type AddPlaylistTrackResponse = z.infer<
  typeof AddPlaylistTrackResponseSchema
>;

export const AddPlaylistAlbumResponseSchema = createApiResponseSchema(
  z.object({
    ok: z.literal(true),
    addedCount: z.number().int().nonnegative(),
    trackCount: z.number().int().nonnegative(),
  }),
);

export type AddPlaylistAlbumResponse = z.infer<
  typeof AddPlaylistAlbumResponseSchema
>;

export const RemovePlaylistTrackResponseSchema = createApiResponseSchema(
  z.object({ ok: z.literal(true) }),
);

export type RemovePlaylistTrackResponse = z.infer<
  typeof RemovePlaylistTrackResponseSchema
>;

export const ReorderPlaylistTracksResponseSchema = createApiResponseSchema(
  z.object({ ok: z.literal(true) }),
);

export type ReorderPlaylistTracksResponse = z.infer<
  typeof ReorderPlaylistTracksResponseSchema
>;

export const SortPlaylistTracksResponseSchema = createApiResponseSchema(
  z.object({ ok: z.literal(true) }),
);

export type SortPlaylistTracksResponse = z.infer<
  typeof SortPlaylistTracksResponseSchema
>;

export const PinPlaylistResponseSchema = createApiResponseSchema(
  LibraryPlaylistPinRowSchema,
);

export type PinPlaylistResponse = z.infer<typeof PinPlaylistResponseSchema>;

export const UnpinPlaylistResponseSchema = createApiResponseSchema(
  z.object({ id: z.string() }),
);

export type UnpinPlaylistResponse = z.infer<typeof UnpinPlaylistResponseSchema>;

export const ReorderPlaylistPinsResponseSchema = createApiResponseSchema(
  z.array(LibraryPlaylistPinRowSchema),
);

export type ReorderPlaylistPinsResponse = z.infer<
  typeof ReorderPlaylistPinsResponseSchema
>;

export const UploadLibraryPlaylistCoverResponseSchema =
  createApiResponseSchema(ImageSchema);

export type UploadLibraryPlaylistCoverResponse = z.infer<
  typeof UploadLibraryPlaylistCoverResponseSchema
>;

export const DeleteLibraryPlaylistCoverDataSchema = z.object({
  id: z.string(),
  cover: ImageSchema.nullable().optional(),
});

export const DeleteLibraryPlaylistCoverResponseSchema = createApiResponseSchema(
  DeleteLibraryPlaylistCoverDataSchema,
);

export type DeleteLibraryPlaylistCoverResponse = z.infer<
  typeof DeleteLibraryPlaylistCoverResponseSchema
>;
