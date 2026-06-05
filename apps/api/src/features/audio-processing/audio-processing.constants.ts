import { AudioFormat, AudioQuality, ProcessingStatus } from '@repo/db';

export const WAVEFORM_POINTS = 1024;
export const WAVEFORM_SAMPLE_RATE = 44100;
export const WAVEFORM_BIT_DEPTH = 16;
export const TEMP_DIR_PREFIX = 'playr-';

export const LOSSLESS_FORMATS = ['wav', 'flac'] as const;

/** Rough size ratio vs original used when reserving quota headroom before transcodes complete. */
export const STORAGE_QUOTA_LOSSY_TRANSCODE_SIZE_RATIO = 0.4;
export const STORAGE_QUOTA_FLAC_TRANSCODE_SIZE_RATIO = 0.95;

export type TranscodePreset = {
  quality: AudioQuality;
  format: AudioFormat;
  bitrate: number | null;
  countsTowardStorageQuota: boolean;
};

export const TRANSCRIPTION_QUALITIES: TranscodePreset[] = [
  { quality: 'low', format: AudioFormat.mp3, bitrate: 64, countsTowardStorageQuota: true },
  {
    quality: 'standard',
    format: AudioFormat.opus,
    bitrate: 128,
    countsTowardStorageQuota: true,
  },
  {
    quality: 'standard',
    format: AudioFormat.mp3,
    bitrate: 128,
    countsTowardStorageQuota: false,
  },
  { quality: 'high', format: AudioFormat.opus, bitrate: 256, countsTowardStorageQuota: true },
  { quality: 'high', format: AudioFormat.mp3, bitrate: 320, countsTowardStorageQuota: false },
];

export const LOSSLESS_QUALITY_PRESET: TranscodePreset = {
  quality: 'original' as AudioQuality,
  format: AudioFormat.flac as AudioFormat,
  bitrate: null,
  countsTowardStorageQuota: true,
};

export function getTranscodePresetsForSource(isLossless: boolean): TranscodePreset[] {
  const presets = [...TRANSCRIPTION_QUALITIES];
  if (isLossless) {
    presets.push(LOSSLESS_QUALITY_PRESET);
  }
  return presets;
}

export function getCountableTranscodePresets(isLossless: boolean): TranscodePreset[] {
  return getTranscodePresetsForSource(isLossless).filter((p) => p.countsTowardStorageQuota);
}

export function presetMatchesAudioFile(
  preset: Pick<TranscodePreset, 'quality' | 'format'>,
  file: { quality: AudioQuality; format: AudioFormat },
): boolean {
  return preset.quality === file.quality && preset.format === file.format;
}

export function isAudioFileCountableTowardStorageQuota(file: {
  isOriginal: boolean;
  status: ProcessingStatus;
  quality: AudioQuality;
  format: AudioFormat;
}): boolean {
  if (file.isOriginal) {
    return true;
  }
  if (file.status !== ProcessingStatus.complete) {
    return false;
  }
  const allCountablePresets = [
    ...TRANSCRIPTION_QUALITIES.filter((p) => p.countsTowardStorageQuota),
    LOSSLESS_QUALITY_PRESET,
  ];
  return allCountablePresets.some((preset) => presetMatchesAudioFile(preset, file));
}

export function estimateReservedProcessedBytes(originalSize: number, isLossless: boolean): number {
  return getCountableTranscodePresets(isLossless).reduce((sum, preset) => {
    const ratio =
      preset.format === AudioFormat.flac
        ? STORAGE_QUOTA_FLAC_TRANSCODE_SIZE_RATIO
        : STORAGE_QUOTA_LOSSY_TRANSCODE_SIZE_RATIO;
    return sum + Math.ceil(originalSize * ratio);
  }, 0);
}

export function getTrackOwnerUserId(
  access: { userId: string; role: string }[] | undefined,
): string | null {
  return access?.find((a) => a.role === 'owner')?.userId ?? null;
}
