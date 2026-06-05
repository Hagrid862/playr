import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { LibraryStorageQuotaService } from '@/shared/services/library-storage-quota.service';
import { StorageService } from '@/shared/services/storage.service';
import { getQueueToken } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AudioFileSchema } from '@repo/contracts';
import { AccessRole, AudioFormat, FileBucket, ProcessingStatus } from '@repo/db';
import {
  audioFileBuilder,
  trackWithAccessBuilder,
  type TrackWithAccessAndAlbumId,
} from '@repo/testing/builders';
import { createMockFile } from '@repo/testing/mocks';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { BulkUploadTrackAudioCommand } from '../impl/bulk-upload-track-audio.command';
import { BulkUploadTrackAudioHandler } from './bulk-upload-track-audio.handler';

describe('BulkUploadTrackAudioHandler', () => {
  let handler: BulkUploadTrackAudioHandler;
  let trackRepository: DeepMocked<TrackRepository>;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let storageService: DeepMocked<StorageService>;
  let storageQuotaService: DeepMocked<LibraryStorageQuotaService>;
  let processingQueue: DeepMocked<Queue>;

  const userId = 'user-123';
  const albumId = 'album-123';
  const trackId1 = 'track-1';
  const trackId2 = 'track-2';

  const mockTrackWithAccess = (trackId: string, albumIdParam: string): TrackWithAccessAndAlbumId =>
    trackWithAccessBuilder({
      id: trackId,
      albumId: albumIdParam,
      userId,
      role: AccessRole.owner,
    }) as TrackWithAccessAndAlbumId;

  const mockAudioFileForTrack = (id: string, trackIdParam: string) =>
    audioFileBuilder({
      id,
      trackId: trackIdParam,
      bucket: FileBucket.private,
      key: `tracks/${trackIdParam}/originals/key`,
      url: 'https://storage.url/file',
      mimeType: 'audio/mpeg',
      size: 1024,
      format: AudioFormat.mp3,
      status: ProcessingStatus.pending,
    });

  beforeEach(async () => {
    trackRepository = createMock<TrackRepository>();
    audioFileRepository = createMock<AudioFileRepository>();
    storageService = createMock<StorageService>();
    storageQuotaService = createMock<LibraryStorageQuotaService>();
    processingQueue = createMock<Queue>();

    storageQuotaService.estimateReservedProcessedBytes.mockReturnValue(0);
    storageQuotaService.assertCanAddBytes.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkUploadTrackAudioHandler,
        { provide: TrackRepository, useValue: trackRepository },
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: StorageService, useValue: storageService },
        { provide: LibraryStorageQuotaService, useValue: storageQuotaService },
        { provide: getQueueToken('audio-processing'), useValue: processingQueue },
      ],
    }).compile();

    handler = module.get<BulkUploadTrackAudioHandler>(BulkUploadTrackAudioHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw BadRequestException when trackIds and files count mismatch', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile(), createMockFile()],
        userId,
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'trackIds count (1) must match files count (2)',
      );
    });

    it('should throw BadRequestException when trackIds and files count mismatch (more trackIds)', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1, trackId2],
        [createMockFile()],
        userId,
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'trackIds count (2) must match files count (1)',
      );
    });

    it('should throw BadRequestException when no files provided', async () => {
      const command = new BulkUploadTrackAudioCommand(albumId, [], [], userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'At least one file and track ID is required',
      );
    });

    it('should throw BadRequestException when more than 50 files', async () => {
      const trackIds = Array.from({ length: 51 }, (_, i) => `track-${i}`);
      const files = Array.from({ length: 51 }, () => createMockFile());
      const command = new BulkUploadTrackAudioCommand(albumId, trackIds, files, userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Maximum 50 files per bulk upload');
    });

    it('should throw BadRequestException when file has no buffer', async () => {
      const invalidFile = createMockFile({ buffer: undefined });
      const command = new BulkUploadTrackAudioCommand(albumId, [trackId1], [invalidFile], userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('File at index 0 is empty or invalid');
    });

    it('should throw BadRequestException when file exceeds 100MB', async () => {
      const largeFile = createMockFile({ size: 101 * 1024 * 1024 });
      const command = new BulkUploadTrackAudioCommand(albumId, [trackId1], [largeFile], userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'File at index 0 exceeds maximum size of 100MB',
      );
    });

    it('should throw BadRequestException when file has invalid mimetype', async () => {
      const invalidMimeFile = createMockFile({ mimetype: 'image/jpeg' });
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [invalidMimeFile],
        userId,
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'File at index 0 has invalid type: image/jpeg',
      );
    });

    it('should throw BadRequestException when second file has invalid mimetype', async () => {
      const file1 = createMockFile();
      const invalidMimeFile = createMockFile({ mimetype: 'image/jpeg' });
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1, trackId2],
        [file1, invalidMimeFile],
        userId,
      );
      trackRepository.getById.mockResolvedValue(mockTrackWithAccess(trackId1, albumId));
      storageService.uploadFile.mockResolvedValue({ url: 'https://s3.url/file', key: 'key' });
      audioFileRepository.create.mockResolvedValue(mockAudioFileForTrack('af-1', trackId1));

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'File at index 1 has invalid type: image/jpeg',
      );
    });

    it('should throw BadRequestException when file is null', async () => {
      // @ts-expect-error - we are testing invalid input (null file)
      const command = new BulkUploadTrackAudioCommand(albumId, [trackId1], [null], userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('File at index 0 is empty or invalid');
    });

    it('should throw NotFoundException when track does not exist', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      trackRepository.getById.mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(`Track ${trackId1} not found`);
    });

    it('should throw BadRequestException when track does not belong to album', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      trackRepository.getById.mockResolvedValue(mockTrackWithAccess(trackId1, 'other-album-id'));

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        `Track ${trackId1} does not belong to album ${albumId}`,
      );
    });

    it('should throw ForbiddenException when user has no access', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      const trackWithOtherOwner = trackWithAccessBuilder({
        id: trackId1,
        albumId,
        userId: 'other-user',
        role: AccessRole.owner,
      });
      trackRepository.getById.mockResolvedValue(trackWithOtherOwner);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        `You do not have permission to upload audio for track ${trackId1}`,
      );
    });

    it('should throw ForbiddenException when user has viewer role', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      const trackWithViewerAccess = trackWithAccessBuilder({
        id: trackId1,
        albumId,
        userId,
        role: AccessRole.viewer,
      });
      trackRepository.getById.mockResolvedValue(trackWithViewerAccess);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        `You do not have permission to upload audio for track ${trackId1}`,
      );
    });

    it('should throw ForbiddenException when track has no access property', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      const trackWithoutAccess = trackWithAccessBuilder({
        id: trackId1,
        albumId,
        access: [],
      });
      trackRepository.getById.mockResolvedValue(trackWithoutAccess);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        `You do not have permission to upload audio for track ${trackId1}`,
      );
    });

    it('should throw ForbiddenException when track has no owner', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      const trackWithEditorOnly = trackWithAccessBuilder({
        id: trackId1,
        albumId,
        access: [{ userId, role: AccessRole.editor }],
      });
      trackRepository.getById.mockResolvedValue(trackWithEditorOnly);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(`Track ${trackId1} has no owner`);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should allow editor role', async () => {
      const file = createMockFile();
      const command = new BulkUploadTrackAudioCommand(albumId, [trackId1], [file], userId);
      const ownerUserId = 'owner-user';
      const trackWithEditorAccess = trackWithAccessBuilder({
        id: trackId1,
        albumId,
        access: [
          { userId: ownerUserId, role: AccessRole.owner },
          { userId, role: AccessRole.editor },
        ],
      });
      trackRepository.getById.mockResolvedValue(trackWithEditorAccess);
      storageService.uploadFile.mockResolvedValue({ url: 'https://s3.url/file', key: 'key' });
      audioFileRepository.create.mockResolvedValue(mockAudioFileForTrack('af-1', trackId1));

      const result = await handler.execute(command);

      expect(result.audioFiles).toHaveLength(1);
      expect(trackRepository.getById).toHaveBeenCalledWith(trackId1, {
        include: { access: true },
      });
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(audioFileRepository.create).toHaveBeenCalled();
      expect(processingQueue.add).toHaveBeenCalledWith('process-audio', {
        audioFileId: 'af-1',
        trackId: trackId1,
        userId,
      });
      expect(storageQuotaService.assertCanAddBytes).toHaveBeenCalledWith(
        ownerUserId,
        expect.any(Number),
      );
    });

    it('should succeed when file size is exactly 100MB', async () => {
      const file = createMockFile({ size: 100 * 1024 * 1024 });
      const command = new BulkUploadTrackAudioCommand(albumId, [trackId1], [file], userId);
      trackRepository.getById.mockResolvedValue(mockTrackWithAccess(trackId1, albumId));
      storageService.uploadFile.mockResolvedValue({ url: 'https://s3.url/file', key: 'key' });
      audioFileRepository.create.mockResolvedValue(mockAudioFileForTrack('af-1', trackId1));

      const result = await handler.execute(command);

      expect(result.audioFiles).toHaveLength(1);
      expect(storageService.uploadFile).toHaveBeenCalled();
      expect(audioFileRepository.create).toHaveBeenCalled();
    });

    it('should throw PayloadTooLargeException when storage quota pre-flight fails', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      trackRepository.getById.mockResolvedValue(mockTrackWithAccess(trackId1, albumId));
      storageQuotaService.assertCanAddBytes.mockRejectedValue(
        new PayloadTooLargeException({
          message: 'Storage quota exceeded',
          usedBytes: 9_000,
          limitBytes: 10_000,
        }),
      );

      await expect(handler.execute(command)).rejects.toThrow(PayloadTooLargeException);
      expect(storageService.uploadFile).not.toHaveBeenCalled();
    });

    it('should upload multiple files successfully', async () => {
      const file1 = createMockFile({ originalname: 'track1.mp3' });
      const file2 = createMockFile({ originalname: 'track2.flac', mimetype: 'audio/flac' });
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1, trackId2],
        [file1, file2],
        userId,
      );

      trackRepository.getById
        .mockResolvedValueOnce(mockTrackWithAccess(trackId1, albumId))
        .mockResolvedValueOnce(mockTrackWithAccess(trackId2, albumId));

      storageService.uploadFile.mockResolvedValue({ url: 'https://s3.url/file', key: 'key' });

      audioFileRepository.create
        .mockResolvedValueOnce(mockAudioFileForTrack('af-1', trackId1))
        .mockResolvedValueOnce(mockAudioFileForTrack('af-2', trackId2));

      const result = await handler.execute(command);

      expect(result.audioFiles).toHaveLength(2);
      expect(trackRepository.getById).toHaveBeenCalledTimes(2);
      expect(storageService.uploadFile).toHaveBeenCalledTimes(2);
      expect(audioFileRepository.create).toHaveBeenCalledTimes(2);
      expect(processingQueue.add).toHaveBeenCalledTimes(2);

      expect(storageService.uploadFile).toHaveBeenNthCalledWith(
        1,
        file1.buffer,
        FileBucket.private,
        expect.stringMatching(new RegExp(`tracks/${trackId1}/originals/\\d+_0\\.mp3`)),
        { contentType: 'audio/mpeg' },
      );
      expect(storageService.uploadFile).toHaveBeenNthCalledWith(
        2,
        file2.buffer,
        FileBucket.private,
        expect.stringMatching(new RegExp(`tracks/${trackId2}/originals/\\d+_1\\.flac`)),
        { contentType: 'audio/flac' },
      );

      expect(audioFileRepository.create).toHaveBeenNthCalledWith(1, {
        track: { connect: { id: trackId1 } },
        bucket: FileBucket.private,
        key: expect.stringContaining(`tracks/${trackId1}/originals/`),
        url: 'https://s3.url/file',
        mimeType: 'audio/mpeg',
        size: file1.size,
        format: AudioFormat.mp3,
        isOriginal: true,
        status: ProcessingStatus.pending,
        quality: 'original',
      });
      expect(audioFileRepository.create).toHaveBeenNthCalledWith(2, {
        track: { connect: { id: trackId2 } },
        bucket: FileBucket.private,
        key: expect.stringContaining(`tracks/${trackId2}/originals/`),
        url: 'https://s3.url/file',
        mimeType: 'audio/flac',
        size: file2.size,
        format: AudioFormat.flac,
        isOriginal: true,
        status: ProcessingStatus.pending,
        quality: 'original',
      });
    });

    it('should throw BadRequestException when AudioFileSchema validation fails', async () => {
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1],
        [createMockFile()],
        userId,
      );
      trackRepository.getById.mockResolvedValue(mockTrackWithAccess(trackId1, albumId));
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });
      audioFileRepository.create.mockResolvedValue(audioFileBuilder({ id: 'af-1' }));

      vi.spyOn(AudioFileSchema, 'safeParse').mockReturnValue({
        success: false,
        error: new z.ZodError([]),
      } as ReturnType<typeof AudioFileSchema.safeParse>);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Failed to parse audio file at index 0',
      );
    });

    it('should fail on second file when first succeeds', async () => {
      const file1 = createMockFile();
      const file2 = createMockFile();
      const command = new BulkUploadTrackAudioCommand(
        albumId,
        [trackId1, trackId2],
        [file1, file2],
        userId,
      );

      trackRepository.getById
        .mockResolvedValueOnce(mockTrackWithAccess(trackId1, albumId))
        .mockResolvedValueOnce(null);

      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });
      audioFileRepository.create.mockResolvedValue(mockAudioFileForTrack('af-1', trackId1));

      await expect(handler.execute(command)).rejects.toThrow(
        new NotFoundException(`Track ${trackId2} not found`),
      );
    });
  });

  describe('format detection', () => {
    const scenarios: {
      description: string;
      mimetype: string;
      originalname: string;
      expectedFormat: AudioFormat;
    }[] = [
      {
        description: 'detects mp3',
        mimetype: 'audio/mpeg',
        originalname: 't.mp3',
        expectedFormat: AudioFormat.mp3,
      },
      {
        description: 'detects opus via ogg mime',
        mimetype: 'audio/ogg',
        originalname: 't.ogg',
        expectedFormat: AudioFormat.opus,
      },
      {
        description: 'detects flac',
        mimetype: 'audio/flac',
        originalname: 't.flac',
        expectedFormat: AudioFormat.flac,
      },
      {
        description: 'detects wav',
        mimetype: 'audio/x-wav',
        originalname: 't.wav',
        expectedFormat: AudioFormat.wav,
      },
      {
        description: 'detects aac',
        mimetype: 'audio/aac',
        originalname: 't.aac',
        expectedFormat: AudioFormat.aac,
      },
      {
        description: 'detects aac via mp4 mime',
        mimetype: 'audio/mp4',
        originalname: 't.m4a',
        expectedFormat: AudioFormat.aac,
      },
      {
        description: 'falls back to extension for flac (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.flac',
        expectedFormat: AudioFormat.flac,
      },
      {
        description: 'falls back to extension for ogg (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.ogg',
        expectedFormat: AudioFormat.opus,
      },
      {
        description: 'falls back to extension for opus (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.opus',
        expectedFormat: AudioFormat.opus,
      },
      {
        description: 'falls back to extension for mp3 (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.mp3',
        expectedFormat: AudioFormat.mp3,
      },
      {
        description: 'falls back to extension for wav (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.wav',
        expectedFormat: AudioFormat.wav,
      },
      {
        description: 'falls back to extension for aac (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.aac',
        expectedFormat: AudioFormat.aac,
      },
      {
        description: 'falls back to extension for m4a (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.m4a',
        expectedFormat: AudioFormat.aac,
      },
      {
        description: 'falls back to mp3 for unknown extension (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 't.xyz',
        expectedFormat: AudioFormat.mp3,
      },
      {
        description: 'falls back to mp3 when filename has no extension (audio/x-flac)',
        mimetype: 'audio/x-flac',
        originalname: 'song',
        expectedFormat: AudioFormat.mp3,
      },
    ];

    it.each(scenarios)('$description', async ({ mimetype, originalname, expectedFormat }) => {
      const file = createMockFile({ mimetype, originalname });
      const command = new BulkUploadTrackAudioCommand(albumId, [trackId1], [file], userId);

      trackRepository.getById.mockResolvedValue(mockTrackWithAccess(trackId1, albumId));
      storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });
      audioFileRepository.create.mockResolvedValue(mockAudioFileForTrack('af-1', trackId1));

      await handler.execute(command);

      expect(audioFileRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ format: expectedFormat }),
      );
    });
  });
});
