import {
  rand,
  randBetweenDate,
  randFilePath,
  randNumber,
  randPastDate,
  randUuid,
} from "@ngneat/falso";
import {
  AudioFormat,
  AudioQuality,
  FileBucket,
  ProcessingStatus,
  type AudioFile,
} from "@repo/db";

export function audioFileBuilder(overrides?: Partial<AudioFile>): AudioFile {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    bucket: rand([FileBucket.private, FileBucket.public]),
    key: randFilePath() + ".mp3",
    url: null,
    mimeType: "audio/mpeg",
    size: randNumber({ min: 1000, max: 1000000 }),
    format: rand([
      AudioFormat.mp3,
      AudioFormat.opus,
      AudioFormat.flac,
      AudioFormat.aac,
      AudioFormat.wav,
    ]),
    duration: null,
    bitrate: null,
    sampleRate: null,
    channels: null,
    isOriginal: true,
    waveformJson: null,
    trackId: randUuid(),
    quality: AudioQuality.original,
    status: ProcessingStatus.pending,
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    ...overrides,
  };
}
