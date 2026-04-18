import { z } from "zod";

/** Shared cap for genre id arrays on library create/update and bulk flows. */
export const REASONABLE_GENRE_IDS_LIMIT = 100;

export const libraryGenreIdsSchema = z
  .array(z.string().min(1, "Genre id is required"))
  .max(
    REASONABLE_GENRE_IDS_LIMIT,
    `At most ${REASONABLE_GENRE_IDS_LIMIT} genres may be specified`,
  );
