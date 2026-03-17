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
  const format = rand([
    AudioFormat.mp3,
    AudioFormat.opus,
    AudioFormat.flac,
    AudioFormat.aac,
    AudioFormat.wav,
  ]);

  const formatMeta: Record<AudioFormat, { ext: string; mimeType: string }> = {
    [AudioFormat.mp3]: { ext: "mp3", mimeType: "audio/mpeg" },
    [AudioFormat.opus]: { ext: "ogg", mimeType: "audio/ogg" },
    [AudioFormat.flac]: { ext: "flac", mimeType: "audio/flac" },
    [AudioFormat.aac]: { ext: "aac", mimeType: "audio/aac" },
    [AudioFormat.wav]: { ext: "wav", mimeType: "audio/wav" },
  };

  const createdAt = randPastDate();
  return {
    id: randUuid(),
    bucket: rand([FileBucket.private, FileBucket.public]),
    key: randFilePath() + "." + formatMeta[format].ext,
    url: null,
    mimeType: formatMeta[format].mimeType,
    size: randNumber({ min: 1000, max: 1000000 }),
    format,
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
