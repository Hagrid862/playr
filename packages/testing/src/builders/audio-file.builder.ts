import {
  AudioFormat,
  AudioQuality,
  FileBucket,
  ProcessingStatus,
  type AudioFile,
} from "@repo/db";
import { TEST_IDS } from "./constants";

export function audioFileBuilder(overrides?: Partial<AudioFile>): AudioFile {
  const now = new Date();
  return {
    id: TEST_IDS.audioFile,
    bucket: FileBucket.private,
    key: "path/to/original.mp3",
    url: null,
    mimeType: "audio/mpeg",
    size: 1234,
    format: AudioFormat.mp3,
    duration: null,
    bitrate: null,
    sampleRate: null,
    channels: null,
    isOriginal: true,
    waveformJson: null,
    trackId: TEST_IDS.track,
    quality: AudioQuality.original,
    status: ProcessingStatus.pending,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
