import { type Track, Visibility } from "@repo/db";
import z from "zod";
import { zodDateTime, zodDateTimeNullable } from "../utils/zod-datetime";
import { AlbumSchema, type ZodAlbum } from "./album.schema";
import { ArtistSchema, type ZodArtist } from "./artist.schema";
import { AudioFileSchema, type ZodAudioFile } from "./audio-file.schema";
import {
  PlaylistTrackSchema,
  type ZodPlaylistTrack,
} from "./playlist-track.schema";
import { TrackCreditSchema, type ZodTrackCredit } from "./track-credit.schema";
import { TrackGenreSchema, type ZodTrackGenre } from "./track-genre.schema";

export interface ZodTrack extends Track {
  album?: ZodAlbum;
  artists?: ZodArtist[];
  audioFiles?: ZodAudioFile[];
  credits?: ZodTrackCredit[];
  genres?: ZodTrackGenre[];
  playlistTracks?: ZodPlaylistTrack[];
  visibility: Visibility;
}

export const TrackSchema: z.ZodType<ZodTrack> = z.object({
  id: z.string(),
  title: z.string(),
  trackNumber: z.number().int(),
  diskNumber: z.number().int(),
  duration: z.number().int(),
  listenedCount: z.number().int(),
  explicit: z.boolean(),
  lyrics: z.string().nullable(),
  albumId: z.string(),
  visibility: z.enum(Visibility),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
  deletedAt: zodDateTimeNullable(),

  album: z.lazy(() => AlbumSchema).optional(),
  artists: z.array(z.lazy(() => ArtistSchema)).optional(),
  audioFiles: z.array(z.lazy(() => AudioFileSchema)).optional(),
  credits: z.array(z.lazy(() => TrackCreditSchema)).optional(),
  genres: z.array(z.lazy(() => TrackGenreSchema)).optional(),
  playlistTracks: z.array(z.lazy(() => PlaylistTrackSchema)).optional(),
});

export type ZodTrackInfer = z.infer<typeof TrackSchema>;
