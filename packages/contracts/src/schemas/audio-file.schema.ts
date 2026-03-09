import {
  AudioFormat,
  AudioQuality,
  FileBucket,
  ProcessingStatus,
  type AudioFile,
} from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";
import { TrackSchema, type ZodTrack } from "./track.schema";

export interface ZodAudioFile extends AudioFile {
  track?: ZodTrack;
}

export const AudioFileSchema: z.ZodType<ZodAudioFile> = z.object({
  id: z.string(),
  bucket: z.enum(FileBucket),
  key: z.string(),
  url: z.string().nullable(),
  mimeType: z.string(),
  size: z.number().int(),
  format: z.enum(AudioFormat),
  duration: z.number().min(0).nullable(),
  bitrate: z.number().int().nullable(),
  sampleRate: z.number().int().nullable(),
  channels: z.number().int().nullable(),
  isOriginal: z.boolean(),
  waveformJson: z.string().nullable(),
  trackId: z.string(),
  quality: z.enum(AudioQuality),
  status: z.enum(ProcessingStatus),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),

  track: z.lazy(() => TrackSchema).optional(),
});

export type ZodAudioFileInfer = z.infer<typeof AudioFileSchema>;
