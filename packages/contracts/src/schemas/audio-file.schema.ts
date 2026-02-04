import {
  AudioFormat,
  AudioQuality,
  FileBucket,
  ProcessingStatus,
  type AudioFile,
} from "@repo/db";
import z from "zod";
import { zodDateTime } from "../utils/zod-datetime";

export const AudioFileSchema = z.object({
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
  waveformJson: z.string().nullable(),
  trackId: z.string(),
  quality: z.enum(AudioQuality),
  status: z.enum(ProcessingStatus),
  createdAt: zodDateTime(),
  updatedAt: zodDateTime(),
}) satisfies z.ZodType<AudioFile>;

export type ZodAudioFile = z.infer<typeof AudioFileSchema>;
