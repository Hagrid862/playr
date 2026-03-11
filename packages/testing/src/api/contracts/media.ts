import {
  FileBucket,
  ImageUploadStatus,
  ImageVariantType,
  AudioFormat,
  AudioQuality,
  ProcessingStatus,
} from '@repo/db';
import type { ZodImage, ZodImageVariant, ZodAudioFile } from '@repo/contracts';
import { buildWithOverrides } from '../../shared';
import { now } from '../internal/time';

export function buildZodImage(overrides: Partial<ZodImage> = {}): ZodImage {
  const base: ZodImage = {
    id: 'image-1',
    alt: null,
    bucket: FileBucket.public,
    key: 'images/test.jpg',
    url: 'https://example.com/images/test.jpg',
    mimeType: 'image/jpeg',
    blurhash: null,
    reportId: null,
    uploadStatus: ImageUploadStatus.uploaded,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodImageVariant(
  overrides: Partial<ZodImageVariant> = {},
): ZodImageVariant {
  const base: ZodImageVariant = {
    id: 'image-variant-1',
    type: ImageVariantType.thumbnail,
    bucket: FileBucket.public,
    key: 'images/test-thumb.jpg',
    url: 'https://example.com/images/test-thumb.jpg',
    width: 256,
    height: 256,
    size: 1024,
    imageId: 'image-1',
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodAudioFile(
  overrides: Partial<ZodAudioFile> = {},
): ZodAudioFile {
  const base: ZodAudioFile = {
    id: 'audio-1',
    bucket: FileBucket.private,
    key: 'audio/test.mp3',
    url: null,
    mimeType: 'audio/mpeg',
    size: 2048,
    format: AudioFormat.mp3,
    duration: 180,
    bitrate: 320,
    sampleRate: 44100,
    channels: 2,
    isOriginal: true,
    waveformJson: null,
    trackId: 'track-1',
    quality: AudioQuality.high,
    status: ProcessingStatus.complete,
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}
