import { z } from "zod";

export enum StreamAudioQuality {
  lossless = "lossless",
  high = "high",
  standard = "standard",
  low = "low",
}

export const StreamAudioQualitySchema = z.enum(StreamAudioQuality);
