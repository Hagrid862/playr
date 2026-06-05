import { AudioFormat, AudioQuality, ProcessingStatus } from '@repo/db';
import { describe, expect, it } from 'vitest';
import {
  estimateReservedProcessedBytes,
  getCountableTranscodePresets,
  isAudioFileCountableTowardStorageQuota,
} from './audio-processing.constants';

describe('audio-processing.constants (storage quota)', () => {
  it('counts originals regardless of status', () => {
    expect(
      isAudioFileCountableTowardStorageQuota({
        isOriginal: true,
        status: ProcessingStatus.pending,
        quality: AudioQuality.original,
        format: AudioFormat.mp3,
      }),
    ).toBe(true);
  });

  it('counts base processed variants only when complete', () => {
    expect(
      isAudioFileCountableTowardStorageQuota({
        isOriginal: false,
        status: ProcessingStatus.complete,
        quality: AudioQuality.standard,
        format: AudioFormat.opus,
      }),
    ).toBe(true);

    expect(
      isAudioFileCountableTowardStorageQuota({
        isOriginal: false,
        status: ProcessingStatus.complete,
        quality: AudioQuality.standard,
        format: AudioFormat.mp3,
      }),
    ).toBe(false);

    expect(
      isAudioFileCountableTowardStorageQuota({
        isOriginal: false,
        status: ProcessingStatus.pending,
        quality: AudioQuality.high,
        format: AudioFormat.opus,
      }),
    ).toBe(false);
  });

  it('reserves headroom for countable transcodes only', () => {
    const lossy = estimateReservedProcessedBytes(1_000_000, false);
    const lossless = estimateReservedProcessedBytes(1_000_000, true);

    expect(lossy).toBeGreaterThan(0);
    expect(lossless).toBeGreaterThan(lossy);
    expect(getCountableTranscodePresets(false)).toHaveLength(3);
    expect(getCountableTranscodePresets(true)).toHaveLength(4);
  });
});
