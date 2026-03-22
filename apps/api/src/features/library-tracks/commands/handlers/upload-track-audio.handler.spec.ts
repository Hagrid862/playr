import { AudioFileRepository } from '@/shared/repositories/audio-file.repository';
import { TrackRepository } from '@/shared/repositories/track.repository';
import { StorageService } from '@/shared/services/storage.service';
import { getQueueToken } from '@nestjs/bullmq';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccessRole, AudioFormat, FileBucket, ProcessingStatus } from '@repo/db';
import { audioFileBuilder, trackWithAccessBuilder } from '@repo/testing/builders';
import { createMockFile } from '@repo/testing/mocks';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadTrackAudioCommand } from '../impl/upload-track-audio.command';
import { UploadTrackAudioHandler } from './upload-track-audio.handler';

describe('UploadTrackAudioHandler', () => {
  let handler: UploadTrackAudioHandler;
  let trackRepository: DeepMocked<TrackRepository>;
  let audioFileRepository: DeepMocked<AudioFileRepository>;
  let storageService: DeepMocked<StorageService>;
  let processingQueue: DeepMocked<Queue>;

  const mockUserId = 'user-123';
  const mockTrackId = 'track-123';

  beforeEach(async () => {
    trackRepository = createMock<TrackRepository>();
    audioFileRepository = createMock<AudioFileRepository>();
    storageService = createMock<StorageService>();
    processingQueue = createMock<Queue>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadTrackAudioHandler,
        { provide: TrackRepository, useValue: trackRepository },
        { provide: AudioFileRepository, useValue: audioFileRepository },
        { provide: StorageService, useValue: storageService },
        { provide: getQueueToken('audio-processing'), useValue: processingQueue },
      ],
    }).compile();

    handler = module.get<UploadTrackAudioHandler>(UploadTrackAudioHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockFile = createMockFile();
    const mockCommand = new UploadTrackAudioCommand(mockTrackId, mockUserId, mockFile);

    const mockTrackWithOwnerAccess = trackWithAccessBuilder({
      id: mockTrackId,
      userId: mockUserId,
      role: AccessRole.owner,
    });

    it('should throw NotFoundException if track does not exist', async () => {
      trackRepository.findOne.mockResolvedValue(null);

      await expect(handler.execute(mockCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const trackWithOtherOwner = trackWithAccessBuilder({
        id: mockTrackId,
        userId: 'other-user',
        role: AccessRole.owner,
      });
      trackRepository.findOne.mockResolvedValue(trackWithOtherOwner);

      await expect(handler.execute(mockCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user role is viewer', async () => {
      const trackWithViewerAccess = trackWithAccessBuilder({
        id: mockTrackId,
        userId: mockUserId,
        role: AccessRole.viewer,
      });
      trackRepository.findOne.mockResolvedValue(trackWithViewerAccess);

      await expect(handler.execute(mockCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should upload file, create audio file record, and dispatch job on success', async () => {
      trackRepository.findOne.mockResolvedValue(mockTrackWithOwnerAccess);

      const mockUrl = 'https://s3.url/path';
      storageService.uploadFile.mockResolvedValue({ url: mockUrl, key: 'test-key' });

      const mockAudioFile = audioFileBuilder({ id: 'audio-id-123' });
      audioFileRepository.create.mockResolvedValue(mockAudioFile);

      const result = await handler.execute(mockCommand);

      expect(storageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        FileBucket.private,
        expect.stringContaining(`tracks/${mockTrackId}/originals/`),
        { contentType: mockFile.mimetype },
      );

      expect(audioFileRepository.create).toHaveBeenCalledWith({
        track: { connect: { id: mockTrackId } },
        bucket: FileBucket.private,
        key: expect.stringContaining(`tracks/${mockTrackId}/originals/`),
        url: mockUrl,
        mimeType: mockFile.mimetype,
        size: mockFile.size,
        format: AudioFormat.mp3,
        isOriginal: true,
        status: ProcessingStatus.pending,
        quality: 'original',
      });

      expect(processingQueue.add).toHaveBeenCalledWith('process-audio', {
        audioFileId: 'audio-id-123',
        trackId: mockTrackId,
        userId: mockUserId,
      });

      expect(result).toEqual({ audioFile: mockAudioFile });
    });

    describe('format detection', () => {
      const scenarios: {
        description: string;
        mimetype: string;
        originalname: string;
        expectedFormat: AudioFormat;
      }[] = [
        {
          description: 'detects opus',
          mimetype: 'audio/opus',
          originalname: 't.opus',
          expectedFormat: AudioFormat.opus,
        },
        {
          description: 'detects flac',
          mimetype: 'audio/flac',
          originalname: 't.flac',
          expectedFormat: AudioFormat.flac,
        },
        {
          description: 'detects wav by mime',
          mimetype: 'audio/x-wav',
          originalname: 't.wav',
          expectedFormat: AudioFormat.wav,
        },
        {
          description: 'detects aac by mime',
          mimetype: 'audio/aac',
          originalname: 't.aac',
          expectedFormat: AudioFormat.aac,
        },
        {
          description: 'falls back to extension for unknown mime (ogg)',
          mimetype: 'audio/unknown',
          originalname: 't.ogg',
          expectedFormat: AudioFormat.opus,
        },
        {
          description: 'falls back to extension for unknown mime (wav)',
          mimetype: 'audio/unknown',
          originalname: 't.wav',
          expectedFormat: AudioFormat.wav,
        },
        {
          description: 'falls back to extension for unknown mime (m4a)',
          mimetype: 'audio/unknown',
          originalname: 't.m4a',
          expectedFormat: AudioFormat.aac,
        },
        {
          description: 'falls back to extension for unknown mime (aac)',
          mimetype: 'audio/unknown',
          originalname: 't.aac',
          expectedFormat: AudioFormat.aac,
        },
        {
          description: 'falls back to extension for unknown mime (opus)',
          mimetype: 'audio/unknown',
          originalname: 't.opus',
          expectedFormat: AudioFormat.opus,
        },
        {
          description: 'falls back to extension for unknown mime (mp3)',
          mimetype: 'audio/unknown',
          originalname: 't.mp3',
          expectedFormat: AudioFormat.mp3,
        },
        {
          description: 'falls back to extension for unknown mime (flac)',
          mimetype: 'audio/unknown',
          originalname: 't.flac',
          expectedFormat: AudioFormat.flac,
        },
        {
          description: 'falls back to mp3 if all else fails',
          mimetype: 'audio/unknown',
          originalname: 't.random',
          expectedFormat: AudioFormat.mp3,
        },
      ];

      it.each(scenarios)('$description', async ({ mimetype, originalname, expectedFormat }) => {
        trackRepository.findOne.mockResolvedValue(mockTrackWithOwnerAccess);
        storageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });
        audioFileRepository.create.mockResolvedValue(audioFileBuilder({ id: 'id' }));

        const file = createMockFile({ mimetype, originalname });
        await handler.execute(new UploadTrackAudioCommand(mockTrackId, mockUserId, file));
        expect(audioFileRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({ format: expectedFormat }),
        );
      });
    });
  });
});
