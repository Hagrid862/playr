import { AudioFormat, AudioQuality } from '@repo/db';

export const WAVEFORM_POINTS = 1024;
export const WAVEFORM_SAMPLE_RATE = 44100;
export const WAVEFORM_BIT_DEPTH = 16;
export const TEMP_DIR_PREFIX = 'playr-';

export const LOSSLESS_FORMATS = ['wav', 'flac'] as const;

export const TRANSCRIPTION_QUALITIES: {
  quality: AudioQuality;
  format: AudioFormat;
  bitrate: number | null;
}[] = [
  { quality: 'low', format: AudioFormat.mp3, bitrate: 64 },
  { quality: 'standard', format: AudioFormat.opus, bitrate: 128 },
  { quality: 'standard', format: AudioFormat.mp3, bitrate: 128 },
  { quality: 'high', format: AudioFormat.opus, bitrate: 256 },
  { quality: 'high', format: AudioFormat.mp3, bitrate: 320 },
];

export const LOSSLESS_QUALITY_PRESET = {
  quality: 'original' as AudioQuality,
  format: AudioFormat.flac as AudioFormat,
  bitrate: null as number | null,
};
