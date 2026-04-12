import { z } from "zod";

/** Stream query `format=` — tie-break when multiple transcodes exist at the same tier. */
export enum StreamPreferredFormat {
  mp3 = "mp3",
  opus = "opus",
}

export const StreamPreferredFormatSchema = z.enum(StreamPreferredFormat);
