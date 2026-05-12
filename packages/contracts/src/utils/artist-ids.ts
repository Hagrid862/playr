import { z } from "zod";

/** Shared cap for artist id arrays on library album flows. */
export const REASONABLE_ARTIST_IDS_LIMIT = 100;

/** Non-empty string ids, max length; no minimum count (for replace-all updates including `[]`). */
export const libraryArtistIdsSchema = z
  .array(z.string().min(1, "Artist id is required"))
  .max(
    REASONABLE_ARTIST_IDS_LIMIT,
    `At most ${REASONABLE_ARTIST_IDS_LIMIT} artists may be specified`,
  );

/** At least one artist (library album create). */
export const libraryAlbumCreateArtistIdsSchema = libraryArtistIdsSchema.min(
  1,
  "At least one artist is required",
);
