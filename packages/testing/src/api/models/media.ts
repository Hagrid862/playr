import {
  FileBucket,
  ImageUploadStatus,
  AudioFormat,
  AudioQuality,
  ProcessingStatus,
  ImageVariantType,
  type Image,
  type AudioFile,
  type ImageVariant,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildImage(overrides: Partial<Image> = {}): Image {
  const base: Image = {
    id: "image-123",
    bucket: FileBucket.private,
    key: "images/test-key.jpg",
    url: "https://example.com/images/test-key.jpg",
    mimeType: "image/jpeg",
    alt: null,
    blurhash: null,
    reportId: null,
    uploadStatus: ImageUploadStatus.uploaded,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildAudioFile(overrides: Partial<AudioFile> = {}): AudioFile {
  const base: AudioFile = {
    id: "audio-123",
    bucket: FileBucket.private,
    key: "tracks/track-123/original/audio.mp3",
    url: "https://example.com/tracks/track-123/original/audio.mp3",
    mimeType: "audio/mpeg",
    size: 5_242_880,
    format: AudioFormat.mp3,
    duration: 180,
    bitrate: 320_000,
    sampleRate: 44_100,
    channels: 2,
    isOriginal: true,
    waveformJson: null,
    trackId: "track-123",
    quality: AudioQuality.original,
    status: ProcessingStatus.pending,
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}

export function buildImageVariant(
  overrides: Partial<ImageVariant> = {},
): ImageVariant {
  const base: ImageVariant = {
    id: "image-variant-123",
    type: ImageVariantType.original,
    bucket: FileBucket.private,
    key: "images/test-key-variant.jpg",
    url: "https://example.com/images/test-key-variant.jpg",
    width: null,
    height: null,
    size: 1_048_576,
    imageId: "image-123",
    createdAt: now,
    updatedAt: now,
  };

  return buildWithOverrides(base, overrides);
}
